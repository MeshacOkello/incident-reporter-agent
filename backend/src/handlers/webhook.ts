import { randomUUID } from 'crypto';
import { z } from 'zod';
import { fetchRecentDeployments, fetchMetricsSummary } from '../services/aws.js';
import { fetchAmplifyJobDetails } from '../services/amplify.js';
import { fetchRecentCommits, fetchCommitWithFiles } from '../services/github.js';
import { analyzeIncident } from '../services/llm.js';
import { sendSlackNotification } from '../services/slack.js';
import { createIncident } from '../repository.js';
import type { AlertPayload, IncidentSeverity } from '../types.js';

const WebhookSchema = z.object({
  source: z.enum(['aws', 'cloudwatch', 'amplify', 'generic']).default('generic'),
  service: z.string().default('unknown'),
  appId: z.string().optional(),
  branchName: z.string().optional(),
  jobId: z.string().optional(),
  githubRepo: z.string().optional(), // Per-app override: owner/repo
  githubBranch: z.string().optional(), // Per-app override
  region: z.string().optional(),
  message: z.string().default('Production alert'),
  metricName: z.string().optional(),
  threshold: z.number().optional(),
  timestamp: z.string().optional(),
}).passthrough();

type WebhookPayload = z.infer<typeof WebhookSchema>;

export async function handleWebhook(body: unknown): Promise<{ incidentId: string }> {
  const payload = WebhookSchema.parse(body ?? {}) as WebhookPayload;

  const incidentId = randomUUID();
  const alertTime = payload.timestamp ? new Date(payload.timestamp) : new Date();
  const lookbackStart = new Date(alertTime.getTime() - 2 * 60 * 60 * 1000); // 2 hours before

  // 1. Fetch deployments (appId from payload for Amplify events, or env)
  const appId = payload.appId ?? process.env.AWS_AMPLIFY_APP_ID;
  const branchName = (payload.branchName ?? process.env.GITHUB_BRANCH ?? 'main') as string;
  const deployments = await fetchRecentDeployments(appId, payload.region as string | undefined);

  // 2. Fetch Amplify build failure details (actual error from failed steps)
  let buildFailure: Awaited<ReturnType<typeof fetchAmplifyJobDetails>> = null;
  const jobId = payload.jobId;
  if (appId && branchName && typeof jobId === 'string') {
    buildFailure = await fetchAmplifyJobDetails(appId, branchName, jobId);
  }

  // 3. Fetch GitHub commits (per-app override from payload, else env)
  const repoRaw = payload.githubRepo ?? process.env.GITHUB_REPO ?? 'owner/repo';
  const repo = String(repoRaw).replace(/^https:\/\/github\.com\//, '').replace(/\/$/, '');
  const commits = await fetchRecentCommits(
    repo,
    branchName,
    lookbackStart.toISOString(),
    process.env.GITHUB_TOKEN
  );

  // 4. Fetch commit diff for suspect commit (build failure commit or most recent)
  const suspectSha = buildFailure?.commitId ?? commits[0]?.sha;
  let commitWithFiles: Awaited<ReturnType<typeof fetchCommitWithFiles>> = null;
  if (repo && suspectSha) {
    commitWithFiles = await fetchCommitWithFiles(repo, suspectSha, process.env.GITHUB_TOKEN);
  }
  if (!commitWithFiles && commits[0]) {
    commitWithFiles = await fetchCommitWithFiles(repo, commits[0].sha, process.env.GITHUB_TOKEN);
  }

  // 5. Fetch metrics (if metric name provided)
  const metrics = payload.metricName
    ? await fetchMetricsSummary(
        payload.service,
        payload.metricName,
        lookbackStart,
        alertTime
      )
    : null;

  // 6. LLM analysis (with real build failure + commit diff for specific insights)
  const { analysis, slackSummary, suggestedActions } = await analyzeIncident(
    payload.message,
    payload.source as 'aws' | 'cloudwatch' | 'amplify' | 'generic',
    deployments,
    commits,
    metrics,
    buildFailure,
    commitWithFiles
  );

  // 7. Determine severity (simple heuristic)
  const severity = inferSeverity(payload);

  // 8. Create incident record
  const incident = createIncident({
    id: incidentId,
    status: 'open',
    severity,
    service: payload.service,
    alertMessage: payload.message,
    alertSource: payload.source,
    alertPayload: payload as AlertPayload,
    deployments,
    commits,
    metricsSummary: metrics,
    aiAnalysis: analysis,
    slackSummary,
    suggestedActions,
    actionItems: [],
  });

  // 9. Send Slack notification
  await sendSlackNotification(
    process.env.SLACK_WEBHOOK_URL ?? '',
    slackSummary,
    incidentId
  );

  return { incidentId };
}

function inferSeverity(payload: WebhookPayload): IncidentSeverity {
  const msg = (payload.message ?? '').toLowerCase();
  if (msg.includes('critical') || msg.includes('outage')) return 'critical';
  if (msg.includes('error') || msg.includes('failed')) return 'high';
  if (msg.includes('warning') || msg.includes('degraded')) return 'medium';
  return 'low';
}
