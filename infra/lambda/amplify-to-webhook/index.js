/**
 * Lambda that forwards Amplify/CloudWatch alerts to the Incident Response Agent webhook.
 *
 * Handles:
 * 1. EventBridge events (Amplify Deployment Status Change)
 * 2. SNS notifications (from CloudWatch alarms)
 *
 * Set WEBHOOK_URL env var to your agent URL, e.g. https://your-agent.com/api/webhook
 */

const WEBHOOK_URL = process.env.WEBHOOK_URL;

function buildPayload(source, data) {
  const base = {
    source: data.source || source,
    service: data.service || 'amplify-app',
    message: data.message || 'Deployment or build alert',
    timestamp: new Date().toISOString(),
    ...data,
  };
  return base;
}

async function postToWebhook(payload) {
  if (!WEBHOOK_URL) {
    console.error('WEBHOOK_URL not configured');
    return { ok: false, error: 'WEBHOOK_URL not set' };
  }

  const res = await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('Webhook failed:', res.status, text);
    return { ok: false, status: res.status, body: text };
  }

  const json = await res.json().catch(() => ({}));
  return { ok: true, incidentId: json.incidentId };
}

function handleEventBridge(event) {
  // Amplify Deployment Status Change - detail may include appId, branchName, jobId, jobStatus
  const detail = event.detail || {};
  const status = detail.jobStatus || detail.status || 'status change';
  const isFailed = String(status).toUpperCase() === 'FAILED' || String(status).toUpperCase() === 'CANCELLED';
  const jobId = detail.jobId || (detail.jobArn ? detail.jobArn.split('/').pop() : null);

  const payload = {
    source: 'amplify',
    service: detail.branchName || detail.appId || 'amplify-app',
    appId: detail.appId,
    branchName: detail.branchName,
    jobId,
    status,
    message: `Amplify ${isFailed ? 'BUILD FAILED' : 'deployment'}: ${status}${detail.branchName ? ` (${detail.branchName})` : ''}`.trim(),
    ...detail,
  };
  // Per-app GitHub repo override (for multi-app: set APP_GITHUB_REPO_MAP='{"appId":"owner/repo"}' or APP_GITHUB_REPO for single app)
  if (process.env.APP_GITHUB_REPO) {
    payload.githubRepo = process.env.APP_GITHUB_REPO;
  } else if (process.env.APP_GITHUB_REPO_MAP && detail.appId) {
    try {
      const map = JSON.parse(process.env.APP_GITHUB_REPO_MAP);
      if (map[detail.appId]) payload.githubRepo = map[detail.appId];
    } catch (_) {}
  }
  return buildPayload('amplify', payload);
}

function handleSNS(event) {
  const record = event.Records && event.Records[0];
  if (!record || record.EventSource !== 'aws:sns') {
    return null;
  }

  let message;
  try {
    message = JSON.parse(record.Sns.Message);
  } catch {
    message = { message: record.Sns.Message };
  }

  // CloudWatch alarm format
  if (message.AlarmName) {
    return buildPayload('cloudwatch', {
      source: 'cloudwatch',
      service: message.AlarmName,
      message: `CloudWatch alarm: ${message.AlarmName} - ${message.NewStateReason || message.StateChangeReason || ''}`,
      metricName: message.Trigger?.MetricName,
      threshold: message.Trigger?.Threshold,
      newState: message.NewStateValue,
      ...message,
    });
  }

  // Generic SNS
  return buildPayload('generic', {
    message: typeof message === 'string' ? message : JSON.stringify(message),
    ...(typeof message === 'object' ? message : {}),
  });
}

exports.handler = async (event) => {
  let payload;

  if (event.source === 'aws.amplify' || event['detail-type'] === 'Amplify Deployment Status Change') {
    payload = handleEventBridge(event);
  } else if (event.Records && event.Records[0]?.EventSource === 'aws:sns') {
    payload = handleSNS(event);
  } else {
    payload = buildPayload('generic', {
      message: 'Unknown event format',
      raw: JSON.stringify(event).slice(0, 500),
    });
  }

  const result = await postToWebhook(payload);
  return {
    statusCode: result.ok ? 200 : 500,
    body: JSON.stringify(result),
  };
};
