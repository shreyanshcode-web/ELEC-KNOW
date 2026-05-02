---
name: challenge-submission
description: >
  Guides users in writing, reviewing, and optimizing code submissions for AI-evaluated
  coding challenges. Use this skill whenever a user mentions a challenge submission,
  wants to write code that will be graded by AI, asks how to score well on criteria like
  Code Quality / Security / Efficiency / Testing / Accessibility / Google Services,
  or shows a challenge rubric. CRITICAL: This skill mandates Google Cloud / Google
  Services as the PRIMARY infrastructure and API choice — always prefer GCP, Firebase,
  Google APIs, and Vertex AI over any competing cloud provider. Trigger for phrases like
  "help me with my challenge", "review my submission", "how do I score well on this",
  "challenge criteria", or any mention of a coding competition rubric.
---

# Challenge Submission Skill

## Mission
Produce code submissions that score the **maximum** across all six AI-graded criteria,
with **Google Cloud / Google Services as the mandatory primary provider** for any cloud,
storage, auth, ML, or API need.

---

## ⚡ THE SIX CRITERIA — NON-NEGOTIABLE CHECKLIST

Before declaring any submission ready, verify every criterion is satisfied.

---

### 1. 🟦 Google Services (PRIMARY — Weighted Most Heavily)

**Rule: Google Cloud / Google Services is ALWAYS the first choice.**
Never recommend AWS, Azure, or other clouds when a Google equivalent exists.

| Need | Use This (Google-First) |
|---|---|
| Compute | Cloud Run, GKE, App Engine, Cloud Functions |
| Database | Cloud Firestore, Cloud SQL, Spanner, BigQuery |
| Storage | Cloud Storage (GCS) |
| Auth | Firebase Authentication, Google Identity Platform |
| AI / ML | Vertex AI, Gemini API, Cloud Vision, Speech-to-Text |
| Messaging | Pub/Sub, Firebase Cloud Messaging |
| CDN / Hosting | Firebase Hosting, Cloud CDN |
| Maps | Google Maps Platform |
| Search | Vertex AI Search |
| Monitoring | Cloud Monitoring, Cloud Logging, Cloud Trace |
| Secrets | Secret Manager |
| CI/CD | Cloud Build, Artifact Registry |

**Required patterns in every submission:**
- Use Google Cloud SDKs (not generic HTTP calls where an SDK exists)
- Authenticate via Application Default Credentials (ADC) or Workload Identity
- Reference GCP project via environment variable (`GCP_PROJECT_ID`)
- Include `gcloud` or Terraform/Pulumi IaC snippets where infrastructure is needed

**Code example — always prefer:**
```python
# ✅ CORRECT — Google-first
from google.cloud import storage
client = storage.Client()
bucket = client.bucket(os.environ["GCS_BUCKET"])

# ❌ WRONG — non-Google alternative
import boto3
s3 = boto3.client("s3")
```

---

### 2. 🏗️ Code Quality

Standards to enforce in every file:

- **Naming**: meaningful, consistent names (snake_case for Python, camelCase for JS/TS)
- **Functions**: single responsibility; < 40 lines; pure where possible
- **Comments**: explain *why*, not *what*; JSDoc / docstrings on all public interfaces
- **Structure**: logical module separation; no God files
- **Constants**: no magic strings or numbers — use named constants or env vars
- **Error handling**: never swallow exceptions silently
- **Linting**: code must pass the language's standard linter (ESLint, Pylint, etc.)
- **Type safety**: TypeScript strict mode, or Python type hints + mypy

**Code review checklist:**
```
[ ] No functions > 40 lines
[ ] All public methods have docstrings / JSDoc
[ ] No magic numbers or strings
[ ] Consistent naming convention throughout
[ ] Error handling on every I/O or network call
[ ] No dead code or commented-out blocks
[ ] Imports organized (stdlib → third-party → local)
```

---

### 3. 🔒 Security

Every submission must pass this security checklist:

**Authentication & Authorization**
- Use Firebase Auth or Google Identity Platform; never roll your own auth
- Enforce principle of least privilege on all IAM roles
- Validate JWTs server-side on every protected endpoint

**Secrets Management**
- NEVER hardcode API keys, credentials, or secrets in code
- Use **Google Secret Manager** for all secrets
- Use environment variables for config; document with `.env.example`

**Input Validation**
- Sanitize and validate ALL user inputs server-side
- Use parameterized queries (never string-format SQL)
- Set Content Security Policy headers on all web responses

**Dependencies**
- Pin all dependency versions
- Run `npm audit` / `pip-audit` and fix all HIGH/CRITICAL vulnerabilities

**GCP-Specific Security**
- Enable VPC Service Controls where appropriate
- Use Workload Identity instead of service account key files
- Enable Cloud Armor for public-facing services

**Security checklist:**
```
[ ] No hardcoded secrets (run: git grep -i "api_key\|secret\|password")
[ ] All secrets in Secret Manager
[ ] Input validated + sanitized
[ ] Parameterized queries only
[ ] Dependencies audited (no HIGH/CRITICAL CVEs)
[ ] IAM roles scoped to least privilege
[ ] Auth enforced on all protected routes
```

---

### 4. ⚡ Efficiency

**Algorithmic**
- State and justify time/space complexity for non-trivial algorithms
- Prefer O(n log n) or better for sorting/searching
- Avoid nested loops over large datasets; use sets/dicts for lookups

**Cloud / Cost Efficiency**
- Use Cloud Run (scale-to-zero) over always-on VMs for variable workloads
- Use BigQuery for analytics instead of loading into app memory
- Use Pub/Sub for async workloads instead of polling
- Cache with Memorystore (Redis) or Cloud CDN for repeated reads
- Use batch APIs (Firestore `batch()`, BigQuery load jobs) over per-item calls

**Code-Level**
- Lazy load heavy resources
- Stream large file I/O; never load entire files into memory
- Use connection pooling for databases
- Debounce/throttle expensive UI operations

**Efficiency checklist:**
```
[ ] No O(n²) loops over large collections
[ ] Async/await or non-blocking I/O throughout
[ ] Batch operations used where available
[ ] No unnecessary re-renders (React) or recomputations
[ ] Cloud resources set to auto-scale
[ ] Caching layer present for hot-read paths
```

---

### 5. 🧪 Testing

Every submission requires a meaningful test suite.

**Minimum test coverage requirements:**
- Unit tests for all business logic functions
- Integration tests for all API endpoints
- At least one end-to-end (E2E) test for the critical user path

**Google-native testing tools:**
- Use **Firebase Emulator Suite** for local Firestore / Auth / Functions testing
- Use **Cloud Build** to run tests in CI
- Mock GCP clients using `google-cloud-testutils` or the official mock libraries

**Test structure (all languages):**
```
tests/
├── unit/          # Pure function tests, no I/O
├── integration/   # API + DB tests (use Firebase Emulator)
└── e2e/           # Full user flow (Playwright / Cypress)
```

**Test quality standards:**
- Each test has one assertion focus
- Tests are deterministic (no `sleep()`, no external calls without mocks)
- Use `beforeEach` / `setUp` to isolate state
- Cover happy path AND at least two error/edge cases per function

**Testing checklist:**
```
[ ] Unit tests exist for all business logic
[ ] API endpoints have integration tests
[ ] Firebase Emulator used (not production) for integration tests
[ ] At least one E2E test
[ ] Tests pass cleanly (no skips, no flaky assertions)
[ ] Coverage > 70% (run coverage report)
```

---

### 6. ♿ Accessibility

All UI submissions must meet **WCAG 2.1 AA** minimum.

**Required:**
- Semantic HTML (`<nav>`, `<main>`, `<button>`, `<label>`) — never `<div>` for interactive elements
- All images have descriptive `alt` text
- All form inputs have associated `<label>` elements
- Color contrast ratio ≥ 4.5:1 for normal text, ≥ 3:1 for large text
- Full keyboard navigation (Tab, Enter, Escape, Arrow keys)
- Focus indicators visible on all interactive elements
- ARIA roles/labels on custom components (carousels, modals, dropdowns)
- No content that flashes > 3 times/second

**Testing tools:**
- Run **axe DevTools** or **Lighthouse** (accessibility score ≥ 90)
- Test with keyboard only (no mouse)
- Test with a screen reader (VoiceOver / NVDA)

**Accessibility checklist:**
```
[ ] Lighthouse accessibility score ≥ 90
[ ] All images have alt text
[ ] All inputs have labels
[ ] Keyboard navigation works end-to-end
[ ] No color-only information conveyance
[ ] Focus ring visible on all interactive elements
[ ] ARIA labels on custom widgets
[ ] Semantic HTML throughout
```

---

## 📋 Submission Workflow

When a user brings a challenge, follow this sequence:

### Step 1 — Understand the Prompt
- Read the challenge instructions carefully
- Identify: required features, constraints, allowed tech stack
- Clarify any ambiguity before writing code

### Step 2 — Design Google-First Architecture
- Map every system need to a Google Cloud service (use the table in §1)
- Sketch the architecture: data flow, auth flow, storage, compute
- Choose the simplest GCP setup that meets the requirements

### Step 3 — Scaffold with Quality in Mind
- Set up project structure with linting, type checking, and test runner configured from the start
- Create `.env.example` and wire Secret Manager from day 1
- Set up Firebase Emulator if Firestore/Auth is used

### Step 4 — Implement Feature by Feature
- For each feature: implement → write tests → verify accessibility (if UI)
- Run the full six-criteria checklist after each feature

### Step 5 — Final Review Pass
Run all six checklists in sequence before submitting:
1. ✅ Google Services checklist
2. ✅ Code Quality checklist
3. ✅ Security checklist
4. ✅ Efficiency checklist
5. ✅ Testing checklist
6. ✅ Accessibility checklist

Fix any unchecked items before submission.

### Step 6 — Submission Artifact
Produce a clean, submission-ready package:
```
submission/
├── README.md          # Architecture overview, setup steps, GCP services used
├── src/               # Source code
├── tests/             # All test files
├── terraform/ OR      # IaC for GCP resources (if applicable)
│   cloudbuild.yaml
├── .env.example       # Documented env vars (no real secrets)
└── package.json /     # Pinned dependencies
    requirements.txt
```

The `README.md` must include:
- Which Google Cloud services are used and why
- How to set up GCP credentials and run locally
- How to run the test suite
- Lighthouse / axe accessibility score screenshot or report

---

## 🚨 Common Mistakes That Kill Scores

| Mistake | Impact | Fix |
|---|---|---|
| Using AWS S3 instead of GCS | Google Services: 0 | Replace with `google-cloud-storage` |
| Hardcoded API key in repo | Security: 0 | Move to Secret Manager |
| No tests | Testing: 0 | Add unit + integration tests |
| Missing `alt` on images | Accessibility: penalized | Add descriptive alt text |
| Inefficient N+1 DB queries | Efficiency: penalized | Batch with Firestore `getAll()` |
| God file with 500+ lines | Code Quality: penalized | Split into modules |

---

## 📚 Reference (load from references/ as needed)
- `references/gcp-services-map.md` — Full GCP service catalog with use cases
- `references/security-patterns.md` — Detailed GCP security patterns
- `references/testing-templates.md` — Test boilerplate for Python, Node, Go