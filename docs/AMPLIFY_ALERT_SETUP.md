# Amplify Build/Deploy Alert Setup

Amplify no longer exposes a Notifications tab in the console for many accounts. Build and deploy failure alerts must be implemented via **EventBridge** (for deployment status) and/or **CloudWatch alarms + SNS** (for runtime metrics or CodeBuild failures).

## Option 1: EventBridge (Recommended for Build Failures)

Amplify sends **"Amplify Deployment Status Change"** events to EventBridge when deployments complete or fail. This is the most direct way to catch build/deploy failures.

### Flow

```
Amplify build fails → EventBridge → Lambda → Agent webhook
```

### Setup

1. **Create an SNS topic** (optional but useful for email + webhook):
   ```bash
   aws sns create-topic --name amplify-build-alerts
   ```

2. **Create a Lambda function** that forwards events to your agent webhook:
   - Use the function in `infra/lambda/amplify-to-webhook/` (see below)
   - Set env var `WEBHOOK_URL` to your agent's webhook URL (e.g. `https://your-domain/api/webhook`)

3. **Create an EventBridge rule**:
   - **Event bus**: default
   - **Rule pattern**:
   ```json
   {
     "source": ["aws.amplify"],
     "detail-type": ["Amplify Deployment Status Change"]
   }
   ```
   - **Target**: Your Lambda function

4. **Optional**: Add a filter to only trigger on failures. EventBridge pattern for `detail.status` (if Amplify includes it):
   ```json
   {
     "source": ["aws.amplify"],
     "detail-type": ["Amplify Deployment Status Change"],
     "detail": {
       "status": ["FAILED", "CANCELLED"]
     }
   }
   ```
   *(Note: Filter only if Amplify's event detail includes a `status` field. Test without filter first.)*

---

## Option 2: CloudWatch Alarms + SNS

Use this for **runtime** issues (5xx errors, latency) or for **CodeBuild** build failures (Amplify uses CodeBuild under the hood).

### For Runtime Metrics (5xxErrors, Latency)

Amplify exposes metrics in the `AWS/AmplifyHosting` namespace. Create a CloudWatch alarm, e.g.:

- **Metric**: `5xxErrors` (or `4xxErrors`)
- **Condition**: Sum > 0 (or threshold of your choice)
- **Action**: Send to SNS topic

### For CodeBuild Build Failures

Amplify uses CodeBuild for builds. Create a CloudWatch alarm on CodeBuild metrics:

- **Namespace**: `AWS/CodeBuild`
- **Metric**: `Builds` with dimension `ProjectName` = your Amplify build project
- **Statistic**: Sum of failed builds
- **Action**: Send to SNS topic

### SNS → Webhook

SNS cannot HTTP POST directly to a URL. You need a Lambda subscribed to the SNS topic:

```
CloudWatch Alarm → SNS Topic → Lambda (subscribed) → Agent webhook
```

The Lambda receives the SNS notification, parses it, and POSTs to your webhook.

---

## Lambda Function

A Lambda function is provided in `infra/lambda/amplify-to-webhook/` that handles:

1. **EventBridge** events (Amplify Deployment Status Change)
2. **SNS** notifications (from CloudWatch alarms)

It normalizes the payload and POSTs to your agent's webhook.

### Agent Requirements for Specific Analysis

For the agent to produce **specific** root cause analysis (not generic advice), configure:

1. **Lambda** passes `appId`, `branchName`, `jobId` from the EventBridge event
2. **Agent** has AWS credentials (IAM role or env) to call Amplify `GetJob` – returns actual build error from failed steps
3. **Agent** has `GITHUB_REPO` and `GITHUB_TOKEN` – fetches commit diff for the failing commit
4. **Agent** has `OPENAI_API_KEY` – LLM uses build error + diff to cite exact file/line

Without these, the agent falls back to generic analysis.

### Environment Variables

| Variable     | Description                                      |
|--------------|--------------------------------------------------|
| `WEBHOOK_URL`| Full URL to your agent, e.g. `https://x.com/api/webhook` |

### IAM Permissions

The Lambda execution role needs:

- `logs:CreateLogGroup`, `logs:CreateLogStream`, `logs:PutLogEvents`
- (No VPC needed if your webhook is public)
