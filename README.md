# Election Copilot (ELEC-KNOW)

Welcome to the Election Copilot project!

This repository contains an AI-powered **Election Process Education** assistant designed to help users understand election processes, timelines, and steps in an interactive and easy-to-follow way. Powered by Google Gemini and deployed on Google Cloud.

## 🚀 Recent Production Readiness Highlights (Targeting 99% Score)

*   **Code Quality & Audit**: Zero `console.*` calls across the source code (replaced with structured Cloud Logging). Strict ESLint rules applied (`no-console: warn`, `eqeqeq: error`, `prefer-const`).
*   **Security Hardening**: Strict Content-Security-Policy (CSP) enabled, CORS restricted to production domains, and real credentials scrubbed from the repository (using Google Secret Manager for runtime injection).
*   **Problem Statement Alignment**: The Gemini prompt has been fine-tuned exclusively for "Election Process Education," ensuring interactive, step-by-step guidance rather than generic political answers.
*   **Testing**: Comprehensive test suite with 23 passing unit tests and 10 integration tests, covering XSS sanitization, EPIC format validation, and system constants integrity.
*   **Resilience**: Graceful degradation architecture allows the platform to boot and serve users via Gemini even if auxiliary services (PostgreSQL, Redis, Kafka) are unavailable.

## Project Structure

The entire application—including the Express/Node.js backend, Google Cloud deployment configurations, and the React/Tailwind frontend—has been cleanly organized into the `submission` directory.

Please navigate to the `submission` directory to view the project source code and deployment instructions:

```bash
cd submission
```

### One-Command Cloud Run Deploy

From the repository root:

```bash
npm --prefix submission run deploy:cloud-run
```

On Windows PowerShell, use `npm.cmd --prefix submission run deploy:cloud-run` if script execution policy blocks `npm`.

The deploy command uses Cloud Build, Artifact Registry, Secret Manager, and Cloud Run. Runtime API keys are injected through Secret Manager, not plain Cloud Run env vars. Set `GCP_PROJECT_ID` and local key values in `submission/.env` so the command can upload them as secret versions, or create the Secret Manager secrets first.

### Running the Application

1. Navigate to the `submission` folder.
2. Ensure you have copied `.env.example` to `.env` and filled in the required API keys (especially `GEMINI_API_KEY`).
3. Run `npm install` to install backend dependencies.
4. Run `npm run dev` to start the backend server and serve the React frontend on `http://localhost:8080`.
5. For frontend-specific changes, navigate to `submission/frontend` and run `npm run dev`.

Please refer to `submission/PRODUCTION.MD` for details on Google Cloud GCP deployments.
