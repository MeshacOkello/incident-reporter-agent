# Incident Response Agent

An AI-powered agent that assists engineers during production incidents by automatically gathering context, reasoning about likely causes, and communicating clear summaries.

## Features

- **Event-driven**: Runs only when alerts fire via webhook
- **Context gathering**: Fetches deployments, GitHub commits, and metrics
- **LLM reasoning**: Analyzes root cause, impact, and suggests actions
- **Structured outputs**: Slack summary, suggested actions, postmortem draft
- **Read-only**: No automatic fixes; human-in-the-loop
- **Lightweight UI**: Dashboard, incident detail, postmortem views

## Quick Start

```bash
# Install dependencies
npm install

# Copy env example
cp backend/.env.example backend/.env

# Run backend + frontend
npm run dev
```

- **Backend**: http://localhost:3001
- **Frontend**: http://localhost:5173

## Amplify Build/Deploy Alerts

The agent only runs when it receives alerts. Amplify no longer has a Notifications tab in the console for many accounts. To get build/deploy failure alerts:

1. **EventBridge** – Amplify sends "Amplify Deployment Status Change" events. Use a Lambda to forward them to the webhook.
2. **CloudWatch + SNS** – For runtime metrics (5xx errors) or CodeBuild failures, create alarms → SNS → Lambda → webhook.

See **[docs/AMPLIFY_ALERT_SETUP.md](docs/AMPLIFY_ALERT_SETUP.md)** for setup instructions and a ready-to-deploy Lambda in `infra/lambda/amplify-to-webhook/`.

---

## Trigger an Incident

Send a webhook to create an incident:

```bash
curl -X POST http://localhost:3001/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "source": "cloudwatch",
    "service": "api",
    "message": "High error rate detected"
  }'
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Backend port (default: 3001) |
| `OPENAI_API_KEY` | For LLM analysis (optional; fallback used if missing) |
| `SLACK_WEBHOOK_URL` | Slack notifications (optional) |
| `GITHUB_REPO` | e.g. `owner/repo` for commit context |
| `GITHUB_BRANCH` | Branch to check (default: main) |
| `GITHUB_TOKEN` | GitHub API token (optional) |
| `AWS_AMPLIFY_APP_ID` | For deployment history (optional) |

## Testing

```bash
npm run test
```

## Multi-App Support

The UI and API support multiple apps/services:

- **Dashboard**: Filter incidents by app/service via dropdown
- **Webhook**: Pass `service`, `githubRepo`, `githubBranch` per request for per-app config
- **Lambda**: Set `APP_GITHUB_REPO` or `APP_GITHUB_REPO_MAP` for multi-app GitHub context

## API

- `POST /api/webhook` — Receive production alerts
- `GET /api/incidents` — List incidents (optional `?service=X` filter)
- `GET /api/services` — List unique services (for filter dropdown)
- `GET /api/incidents/:id` — Get incident detail
- `PATCH /api/incidents/:id` — Update status, resolution, postmortem
- `POST /api/incidents/:id/postmortem-draft` — Generate postmortem draft
