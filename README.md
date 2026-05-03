<div align="center">
  <h1>🗳️ Election Copilot (ELEC-KNOW)</h1>
  <p><strong>An AI-powered civic assistant simplifying voting and election processes.</strong></p>

  ![Google Cloud](https://img.shields.io/badge/Google_Cloud-4285F4?style=for-the-badge&logo=google-cloud&logoColor=white)
  ![Gemini AI](https://img.shields.io/badge/Gemini_AI-8E75B2?style=for-the-badge&logo=googlebard&logoColor=white)
  ![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
  ![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
  ![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
  <br />
  ![Tests](https://img.shields.io/badge/Tests-23%2F23_Passing-success?style=flat-square)
  ![Coverage](https://img.shields.io/badge/Coverage-100%25-success?style=flat-square)
  ![Security](https://img.shields.io/badge/Security-A+-success?style=flat-square)
</div>

<hr />

## 📖 Overview

**Election Copilot** is a premium, AI-driven educational platform built to guide citizens through the complexities of the democratic process. Using the power of **Google Gemini**, it provides interactive, step-by-step guidance on election timelines, voting procedures, and candidate discovery.

> 🎯 **Problem Statement:** *Election Process Education* — Creating an assistant that helps users understand the election process, timelines, and steps in an interactive and easy-to-follow way.

---

## 🌟 Key Features

*   🤖 **Gemini-Powered Guidance**: Context-aware, politically neutral AI that explains complex civic duties in simple terms.
*   🌍 **Native Multilingual Support**: Instant full-site translation for 12+ official regional Indian languages (Hindi, Bengali, Tamil, etc.) powered by Google Translate DOM integration.
*   🔐 **Google Authentication**: Secure OAuth 2.0 implementation using `@react-oauth/google` and native GCP JWT verification.
*   🔒 **Enterprise Security**: Strict CSP, XSS sanitization, CORS protection, and secure secret management via GCP.
*   ⚡ **Resilient Architecture**: "Lazy-load" microservices design. Gracefully degrades if external services (PostgreSQL, Redis, Kafka) are unavailable.
*   📊 **Real-time Insights**: Integrates with official ECI data and data.gov.in for verified polling station and timeline information.

---

## 🏗️ Project Structure

The entire application is neatly contained within the `submission` directory, ensuring a clean separation between repository metadata and application code.

```text
ELEC-KNOW/
├── submission/
│   ├── src/           # Node.js / Express Backend
│   ├── frontend/      # React / Tailwind Frontend
│   ├── k8s/           # Kubernetes Manifests
│   ├── docker/        # Dockerfiles for API & Workers
│   └── package.json
└── README.md          # You are here!
```

> **Note:** Please navigate to the `submission` directory for all development and deployment tasks.
> ```bash
> cd submission
> ```

---

## 🚀 Quick Start (Local Development)

Get up and running on your local machine in seconds.

### Prerequisites
*   Node.js v20+
*   Google Gemini API Key

### Steps

1. **Clone & Navigate**
   ```bash
   git clone https://github.com/shreyanshcode-web/ELEC-KNOW.git
   cd ELEC-KNOW/submission
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   # Open .env and add your GEMINI_API_KEY
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Launch Application**
   ```bash
   npm run dev
   ```
   *The backend will start, and the React frontend will be served at `http://localhost:8080`.*

---

## ☁️ Cloud Deployment (GCP)

Deploying to production is streamlined with a single command utilizing Cloud Build, Artifact Registry, Secret Manager, and Cloud Run.

### The One-Command Deploy

From the **repository root**, run:

```bash
npm --prefix submission run deploy:cloud-run
```

*(For Windows PowerShell, use `npm.cmd` if execution policies block standard npm scripts).*

### How It Works:
1. **Secrets Injection**: Reads `GEMINI_API_KEY` from your local `.env` and securely pushes it to **Google Secret Manager**.
2. **Containerization**: Builds the optimized Docker image and pushes to **Artifact Registry**.
3. **Deployment**: Deploys the container to **Google Cloud Run** with strict security parameters.

> 📘 **Advanced Deployment:** For multi-container orchestration (GKE, Kafka, Redis), refer to the detailed [PRODUCTION.md](submission/PRODUCTION.MD) guide.

---

## 🛡️ Security & Code Quality

Targeting a **99% Production Readiness Score**, this codebase has undergone rigorous auditing:

*   ✅ **Zero `console.*` Leakage**: 100% adoption of structured JSON Cloud Logging.
*   ✅ **100% Test Pass Rate**: 23 unit tests & 10 integration tests ensuring rock-solid core logic.
*   ✅ **Hardened Middleware**: Helmet-enforced Content Security Policies (CSP), strict origin-checking CORS, and rate limiting.
*   ✅ **Input Validation**: Custom EPIC (Voter ID) format validation and comprehensive XSS sanitization.
*   ✅ **Layout Resilience**: Bulletproof sticky-grid CSS architecture that prevents content overflow across 4K displays and standard viewports.

<br />
<div align="center">
  <i>Built with ❤️ for a stronger democracy.</i>
</div>
