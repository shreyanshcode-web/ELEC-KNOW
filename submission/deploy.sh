#!/usr/bin/env bash
# ============================================================
# Election Education Platform — GCP Deployment Script
#
# This script automates the full deployment pipeline:
#   1. Provision GCP infrastructure (Terraform)
#   2. Build & push Docker images (Artifact Registry)
#   3. Deploy to GKE (kubectl)
#   4. Run database migrations
#
# Prerequisites:
#   - gcloud CLI authenticated (`gcloud auth login`)
#   - kubectl installed
#   - terraform installed
#   - docker installed
#
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh                    # Full deployment
#   ./deploy.sh --skip-infra       # Skip Terraform (infra already exists)
#   ./deploy.sh --images-only      # Only build & push images
#   ./deploy.sh --deploy-only      # Only deploy K8s manifests
# ============================================================

set -euo pipefail

# ──────────── Configuration ────────────
PROJECT_ID="${GCP_PROJECT_ID:?Set GCP_PROJECT_ID env var}"
REGION="${GCP_REGION:-us-central1}"
ZONE="${GCP_ZONE:-us-central1-a}"
GKE_CLUSTER="${GKE_CLUSTER_NAME:-election-cluster}"
REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/election-registry"
IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse --short HEAD 2>/dev/null || echo 'latest')}"
NAMESPACE="election-education"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1" >&2; }
step() { echo -e "\n${BLUE}━━━ $1 ━━━${NC}"; }

# ──────────── Parse Arguments ────────────
SKIP_INFRA=false
IMAGES_ONLY=false
DEPLOY_ONLY=false

for arg in "$@"; do
  case $arg in
    --skip-infra)   SKIP_INFRA=true ;;
    --images-only)  IMAGES_ONLY=true ;;
    --deploy-only)  DEPLOY_ONLY=true ;;
    --help)
      echo "Usage: ./deploy.sh [--skip-infra] [--images-only] [--deploy-only]"
      exit 0
      ;;
  esac
done

# ──────────── Preflight Checks ────────────
step "Preflight Checks"

command -v gcloud >/dev/null 2>&1 || { err "gcloud CLI not found"; exit 1; }
command -v kubectl >/dev/null 2>&1 || { err "kubectl not found"; exit 1; }
command -v docker >/dev/null 2>&1 || { err "docker not found"; exit 1; }

log "GCP Project: ${PROJECT_ID}"
log "Region: ${REGION}"
log "Image Tag: ${IMAGE_TAG}"
log "Registry: ${REGISTRY}"

# Ensure gcloud is pointed at the right project
gcloud config set project "${PROJECT_ID}" --quiet
log "gcloud project set to ${PROJECT_ID}"

# ──────────── Step 1: Provision Infrastructure ────────────
if [ "$SKIP_INFRA" = false ] && [ "$IMAGES_ONLY" = false ] && [ "$DEPLOY_ONLY" = false ]; then
  step "Step 1: Provisioning GCP Infrastructure (Terraform)"

  if ! command -v terraform >/dev/null 2>&1; then
    warn "Terraform not found — skipping infrastructure provisioning"
    warn "Ensure GKE cluster, Cloud SQL, Memorystore, and Artifact Registry exist"
  else
    cd terraform/

    # Create Terraform state bucket if it doesn't exist
    if ! gsutil ls "gs://election-edu-tf-state" >/dev/null 2>&1; then
      log "Creating Terraform state bucket..."
      gsutil mb -p "${PROJECT_ID}" -l "${REGION}" "gs://election-edu-tf-state"
      gsutil versioning set on "gs://election-edu-tf-state"
    fi

    terraform init -upgrade
    terraform plan -var="project_id=${PROJECT_ID}" -var="region=${REGION}" -out=tfplan
    terraform apply tfplan
    rm -f tfplan

    # Capture outputs
    CLOUD_SQL_CONN=$(terraform output -raw cloud_sql_connection_name)
    REDIS_HOST=$(terraform output -raw redis_host)
    REDIS_PORT=$(terraform output -raw redis_port)
    SA_EMAIL=$(terraform output -raw service_account_email)

    log "Cloud SQL: ${CLOUD_SQL_CONN}"
    log "Redis: ${REDIS_HOST}:${REDIS_PORT}"
    log "Service Account: ${SA_EMAIL}"

    cd ..
  fi
else
  warn "Skipping infrastructure provisioning"
fi

# ──────────── Step 2: Build & Push Docker Images ────────────
if [ "$DEPLOY_ONLY" = false ]; then
  step "Step 2: Building & Pushing Docker Images"

  # Authenticate Docker with Artifact Registry
  gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet
  log "Docker authenticated with Artifact Registry"

  # Build API image
  log "Building API image..."
  docker build \
    -t "${REGISTRY}/election-api:${IMAGE_TAG}" \
    -t "${REGISTRY}/election-api:latest" \
    -f docker/Dockerfile.api \
    .
  log "API image built: ${REGISTRY}/election-api:${IMAGE_TAG}"

  # Build Worker image
  log "Building Worker image..."
  docker build \
    -t "${REGISTRY}/election-worker:${IMAGE_TAG}" \
    -t "${REGISTRY}/election-worker:latest" \
    -f docker/Dockerfile.worker \
    .
  log "Worker image built: ${REGISTRY}/election-worker:${IMAGE_TAG}"

  # Push images
  log "Pushing images to Artifact Registry..."
  docker push "${REGISTRY}/election-api:${IMAGE_TAG}"
  docker push "${REGISTRY}/election-api:latest"
  docker push "${REGISTRY}/election-worker:${IMAGE_TAG}"
  docker push "${REGISTRY}/election-worker:latest"
  log "All images pushed successfully"
else
  warn "Skipping image build"
fi

# ──────────── Step 3: Deploy to GKE ────────────
if [ "$IMAGES_ONLY" = false ]; then
  step "Step 3: Deploying to GKE"

  # Get GKE credentials
  gcloud container clusters get-credentials "${GKE_CLUSTER}" \
    --zone "${ZONE}" \
    --project "${PROJECT_ID}"
  log "kubectl configured for ${GKE_CLUSTER}"

  # Apply namespace
  kubectl apply -f k8s/namespace.yaml
  log "Namespace created: ${NAMESPACE}"

  # Create K8s service account with Workload Identity annotation
  kubectl create serviceaccount election-api-sa \
    --namespace="${NAMESPACE}" \
    --dry-run=client -o yaml | \
    kubectl annotate --local -f - \
      "iam.gke.io/gcp-service-account=${SA_EMAIL:-election-api-sa@${PROJECT_ID}.iam.gserviceaccount.com}" \
      -o yaml | kubectl apply -f -
  log "K8s service account with Workload Identity binding"

  # Apply ConfigMap (with Terraform outputs if available)
  if [ -n "${REDIS_HOST:-}" ]; then
    # Patch configmap with actual Terraform values
    cat k8s/configmap.yaml | \
      sed "s|redis-service|${REDIS_HOST}|g" | \
      sed "s|REDIS_PORT:.*|REDIS_PORT: \"${REDIS_PORT}\"|g" | \
      kubectl apply -f -
  else
    kubectl apply -f k8s/configmap.yaml
  fi
  log "ConfigMap applied"

  # Secrets are managed via Google Secret Manager + Workload Identity
  # No K8s secrets.yaml needed

  # Deploy infrastructure pods
  kubectl apply -f k8s/redis-deployment.yaml
  kubectl apply -f k8s/redis-service.yaml
  kubectl apply -f k8s/kafka-deployment.yaml
  kubectl apply -f k8s/kafka-service.yaml
  log "Infrastructure pods deployed (Redis, Kafka)"

  # Patch image tags in deployments
  sed -i.bak \
    "s|REGION-docker.pkg.dev/PROJECT_ID/election-registry|${REGISTRY}|g" \
    k8s/api-deployment.yaml k8s/worker-deployment.yaml

  sed -i.bak \
    "s|PROJECT_ID:REGION:election-db|${CLOUD_SQL_CONN:-${PROJECT_ID}:${REGION}:election-db}|g" \
    k8s/api-deployment.yaml k8s/worker-deployment.yaml

  # Deploy application pods
  kubectl apply -f k8s/api-deployment.yaml
  kubectl apply -f k8s/api-service.yaml
  kubectl apply -f k8s/worker-deployment.yaml
  log "Application pods deployed (API, Worker)"

  # Apply networking & autoscaling
  kubectl apply -f k8s/ingress.yaml
  kubectl apply -f k8s/hpa.yaml
  log "Ingress and HPA applied"

  # Restore original deployment files
  mv k8s/api-deployment.yaml.bak k8s/api-deployment.yaml 2>/dev/null || true
  mv k8s/worker-deployment.yaml.bak k8s/worker-deployment.yaml 2>/dev/null || true

  # Wait for rollout
  step "Waiting for API deployment rollout..."
  kubectl rollout status deployment/api-deployment \
    --namespace="${NAMESPACE}" \
    --timeout=300s
  log "API deployment ready!"

  # ──────────── Step 4: Run Database Migrations ────────────
  step "Step 4: Running Database Migrations"

  kubectl run db-migrate \
    --namespace="${NAMESPACE}" \
    --image="${REGISTRY}/election-api:${IMAGE_TAG}" \
    --restart=Never \
    --rm -i \
    --command -- node src/db/migrate.js
  log "Database migrations complete"

  # Show deployment status
  step "Deployment Summary"
  kubectl get pods --namespace="${NAMESPACE}"
  kubectl get services --namespace="${NAMESPACE}"
  kubectl get ingress --namespace="${NAMESPACE}"

  EXTERNAL_IP=$(kubectl get ingress election-ingress \
    --namespace="${NAMESPACE}" \
    -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "pending")

  echo ""
  log "🎉 Deployment complete!"
  log "External IP: ${EXTERNAL_IP}"
  log "Health check: curl http://${EXTERNAL_IP}/health"
  log "Readiness: curl http://${EXTERNAL_IP}/ready"
fi
