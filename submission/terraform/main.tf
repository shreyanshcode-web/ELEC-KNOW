# ============================================================
# Election Education Platform — Google Cloud Infrastructure
# Terraform IaC for reproducible, auditable deployments.
#
# Usage:
#   cd terraform/
#   terraform init
#   terraform plan -var="project_id=YOUR_PROJECT"
#   terraform apply -var="project_id=YOUR_PROJECT"
# ============================================================

terraform {
  required_version = ">= 1.5"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
  }

  # Store state in GCS for team collaboration
  backend "gcs" {
    bucket = "election-edu-tf-state"
    prefix = "terraform/state"
  }
}

# ──────────── Variables ────────────

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP Region"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "GCP Zone for zonal resources"
  type        = string
  default     = "us-central1-a"
}

variable "db_password" {
  description = "Cloud SQL database password"
  type        = string
  sensitive   = true
}

# ──────────── Provider ────────────

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# ──────────── Enable APIs ────────────

resource "google_project_service" "apis" {
  for_each = toset([
    "container.googleapis.com",         # GKE
    "sqladmin.googleapis.com",          # Cloud SQL
    "redis.googleapis.com",             # Memorystore
    "secretmanager.googleapis.com",     # Secret Manager
    "artifactregistry.googleapis.com",  # Container Registry
    "cloudbuild.googleapis.com",        # Cloud Build
    "cloudresourcemanager.googleapis.com",
    "iam.googleapis.com",
    "compute.googleapis.com",
  ])
  service            = each.value
  disable_on_destroy = false
}

# ──────────── Networking ────────────

resource "google_compute_network" "vpc" {
  name                    = "election-vpc"
  auto_create_subnetworks = false
  depends_on              = [google_project_service.apis]
}

resource "google_compute_subnetwork" "subnet" {
  name                     = "election-subnet"
  ip_cidr_range            = "10.0.0.0/20"
  region                   = var.region
  network                  = google_compute_network.vpc.id
  private_ip_google_access = true

  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.4.0.0/14"
  }

  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = "10.8.0.0/20"
  }
}

resource "google_compute_global_address" "private_ip" {
  name          = "private-ip-range"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.vpc.id
}

resource "google_service_networking_connection" "private_vpc" {
  network                 = google_compute_network.vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip.name]
}

# ──────────── GKE Cluster ────────────

resource "google_container_cluster" "primary" {
  name     = "election-cluster"
  location = var.zone

  network    = google_compute_network.vpc.id
  subnetwork = google_compute_subnetwork.subnet.id

  # Use Autopilot for managed node pool (Google SRE manages the nodes)
  enable_autopilot = true

  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }

  # Workload Identity for secure pod-level IAM
  workload_identity_config {
    workload_pool = "${var.project_id}.svc.id.goog"
  }

  # Binary Authorization for supply chain security
  binary_authorization {
    evaluation_mode = "PROJECT_SINGLETON_POLICY"
  }

  release_channel {
    channel = "REGULAR"
  }

  depends_on = [google_project_service.apis]
}

# ──────────── Artifact Registry ────────────

resource "google_artifact_registry_repository" "containers" {
  location      = var.region
  repository_id = "election-registry"
  format        = "DOCKER"
  description   = "Docker images for Election Education platform"

  depends_on = [google_project_service.apis]
}

# ──────────── Cloud SQL (PostgreSQL 15) ────────────

resource "google_sql_database_instance" "postgres" {
  name             = "election-db"
  database_version = "POSTGRES_15"
  region           = var.region

  settings {
    tier              = "db-custom-2-7680"  # 2 vCPUs, 7.5 GB RAM
    availability_type = "REGIONAL"           # HA with automatic failover

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.vpc.id
    }

    backup_configuration {
      enabled                        = true
      point_in_time_recovery_enabled = true
      start_time                     = "03:00"
    }

    maintenance_window {
      day          = 7  # Sunday
      hour         = 4  # 4 AM UTC
      update_track = "stable"
    }

    insights_config {
      query_insights_enabled  = true
      record_application_tags = true
    }

    database_flags {
      name  = "log_min_duration_statement"
      value = "200"  # Log queries > 200ms
    }
  }

  deletion_protection = true
  depends_on          = [google_service_networking_connection.private_vpc]
}

resource "google_sql_database" "election_db" {
  name     = "election_education"
  instance = google_sql_database_instance.postgres.name
}

resource "google_sql_user" "election_user" {
  name     = "election_user"
  instance = google_sql_database_instance.postgres.name
  password = var.db_password
}

# ──────────── Memorystore (Redis 7) ────────────

resource "google_redis_instance" "cache" {
  name               = "election-cache"
  tier               = "STANDARD_HA"    # HA with replica
  memory_size_gb     = 1
  region             = var.region
  redis_version      = "REDIS_7_0"
  authorized_network = google_compute_network.vpc.id

  redis_configs = {
    maxmemory-policy = "allkeys-lru"
  }

  depends_on = [google_project_service.apis]
}

# ──────────── Secret Manager ────────────

resource "google_secret_manager_secret" "gemini_key" {
  secret_id = "gemini-api-key"
  replication {
    auto {}
  }
  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret" "db_password" {
  secret_id = "db-password"
  replication {
    auto {}
  }
  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret" "datagov_key" {
  secret_id = "datagov-api-key"
  replication {
    auto {}
  }
  depends_on = [google_project_service.apis]
}

resource "google_secret_manager_secret" "verifik_token" {
  secret_id = "verifik-api-token"
  replication {
    auto {}
  }
  depends_on = [google_project_service.apis]
}

# ──────────── IAM (Workload Identity) ────────────

resource "google_service_account" "api_sa" {
  account_id   = "election-api-sa"
  display_name = "Election API Service Account"
}

# Grant Secret Manager access
resource "google_project_iam_member" "api_secrets" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.api_sa.email}"
}

# Grant Cloud SQL client access
resource "google_project_iam_member" "api_cloudsql" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.api_sa.email}"
}

# Grant Cloud Logging write access
resource "google_project_iam_member" "api_logging" {
  project = var.project_id
  role    = "roles/logging.logWriter"
  member  = "serviceAccount:${google_service_account.api_sa.email}"
}

# Grant Cloud Monitoring metric write access
resource "google_project_iam_member" "api_monitoring" {
  project = var.project_id
  role    = "roles/monitoring.metricWriter"
  member  = "serviceAccount:${google_service_account.api_sa.email}"
}

# Workload Identity binding: K8s SA → GCP SA
resource "google_service_account_iam_member" "workload_identity" {
  service_account_id = google_service_account.api_sa.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "serviceAccount:${var.project_id}.svc.id.goog[election-education/election-api-sa]"
}

# ──────────── Outputs ────────────

output "gke_cluster_name" {
  value = google_container_cluster.primary.name
}

output "gke_cluster_endpoint" {
  value     = google_container_cluster.primary.endpoint
  sensitive = true
}

output "cloud_sql_connection_name" {
  value = google_sql_database_instance.postgres.connection_name
}

output "cloud_sql_private_ip" {
  value = google_sql_database_instance.postgres.private_ip_address
}

output "redis_host" {
  value = google_redis_instance.cache.host
}

output "redis_port" {
  value = google_redis_instance.cache.port
}

output "artifact_registry" {
  value = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.containers.repository_id}"
}

output "service_account_email" {
  value = google_service_account.api_sa.email
}
