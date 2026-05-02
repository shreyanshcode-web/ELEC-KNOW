# Election Copilot (ELEC-KNOW)

Welcome to the Election Copilot project!

This repository contains an AI-powered election dashboard designed to simplify voting, provide candidate discovery, and deliver real-time insights using the Gemini API.

## Project Structure

The entire application—including the Express/Node.js backend, Google Cloud deployment configurations, and the React/Tailwind frontend—has been cleanly organized into the `submission` directory.

Please navigate to the `submission` directory to view the project source code and deployment instructions:

```bash
cd submission
```

### Running the Application

1. Navigate to the `submission` folder.
2. Ensure you have copied `.env.example` to `.env` and filled in the required API keys (especially `GEMINI_API_KEY`).
3. Run `npm install` to install backend dependencies.
4. Run `npm run dev` to start the backend server and serve the React frontend on `http://localhost:8080`.
5. For frontend-specific changes, navigate to `submission/frontend` and run `npm run dev`.

Please refer to `submission/PRODUCTION.MD` for details on Google Cloud GCP deployments.
