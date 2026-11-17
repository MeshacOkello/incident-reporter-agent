# AWS Amplify Deployment

The app is a monorepo (backend + frontend). Amplify deploys **only the frontend** (static React app). The backend runs separately (e.g., on a server or Lambda).

## Build configuration

`amplify.yml` at the repo root configures Amplify to:

1. Install only frontend dependencies (`--workspace=incident-response-frontend`) — avoids building the backend's native `better-sqlite3` module
2. Build only the frontend
3. Output artifacts from `frontend/dist`

## Amplify console setup

1. **Monorepo**: When connecting the repo, select **"My app is a monorepo"** and set the app root to `frontend`.
2. **Node version**: Amplify uses `.nvmrc` (Node 20) if present. Or set **Node.js version** to 20 in Hosting → Build settings.
3. **Environment variables**: Add any needed vars (e.g. `VITE_API_URL` for the backend API) in Hosting → Environment variables.

## Redeploy

After pushing `amplify.yml`, Amplify will use it automatically. Trigger a redeploy from the console or push a new commit.
