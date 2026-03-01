# Amplify-to-Webhook Lambda

Forwards Amplify deployment events and CloudWatch/SNS alerts to the Incident Response Agent.

## Deploy

### 1. Zip the function

```bash
cd infra/lambda/amplify-to-webhook
zip -r function.zip index.js package.json
```

### 2. Create Lambda (AWS CLI)

```bash
aws lambda create-function \
  --function-name incident-agent-amplify-webhook \
  --runtime nodejs20.x \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/YOUR_LAMBDA_ROLE \
  --environment "Variables={WEBHOOK_URL=https://YOUR_AGENT_URL/api/webhook}"
```

### 3. Add EventBridge trigger

Create a rule that invokes the Lambda on Amplify deployment events:

```bash
aws events put-rule \
  --name amplify-deployment-alerts \
  --event-pattern '{"source":["aws.amplify"],"detail-type":["Amplify Deployment Status Change"]}'

aws events put-targets \
  --rule amplify-deployment-alerts \
  --targets "Id"="1","Arn"="arn:aws:lambda:REGION:ACCOUNT:function:incident-agent-amplify-webhook"

aws lambda add-permission \
  --function-name incident-agent-amplify-webhook \
  --statement-id EventBridgeInvoke \
  --action lambda:InvokeFunction \
  --principal events.amazonaws.com \
  --source-arn arn:aws:events:REGION:ACCOUNT:rule/amplify-deployment-alerts
```

Replace `REGION` and `ACCOUNT` with your values.

**Multi-app**: Set `APP_GITHUB_REPO=owner/repo` for a single app, or `APP_GITHUB_REPO_MAP='{"appId1":"owner/repo1"}'` to map Amplify app IDs to GitHub repos.

### 4. (Optional) SNS trigger for CloudWatch alarms

If you have CloudWatch alarms sending to SNS:

1. Create SNS topic
2. Subscribe the Lambda to the topic (add SNS as trigger in Lambda console)
3. Grant SNS permission to invoke Lambda
