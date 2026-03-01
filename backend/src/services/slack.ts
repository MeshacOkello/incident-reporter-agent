export async function sendSlackNotification(
  webhookUrl: string,
  message: string,
  incidentId?: string
): Promise<boolean> {
  const url = webhookUrl ?? process.env.SLACK_WEBHOOK_URL;
  if (!url) {
    console.warn('Slack webhook not configured. Skipping notification.');
    return false;
  }

  const payload = {
    text: message,
    blocks: incidentId
      ? [
          {
            type: 'section',
            text: { type: 'mrkdwn', text: message },
          },
          {
            type: 'context',
            elements: [{ type: 'mrkdwn', text: `Incident ID: \`${incidentId}\`` }],
          },
        ]
      : undefined,
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload.blocks ? { blocks: payload.blocks } : { text: payload.text }),
    });
    return res.ok;
  } catch (err) {
    console.error('Slack notification failed:', err);
    return false;
  }
}
