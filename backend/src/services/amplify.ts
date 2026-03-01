import { AmplifyClient, GetJobCommand } from '@aws-sdk/client-amplify';
import type { BuildFailureDetails } from '../types.js';

const client = new AmplifyClient({ region: process.env.AWS_REGION ?? 'us-east-1' });

/**
 * Fetches Amplify job details including failed step reasons.
 * Returns null if AWS credentials not configured or job not found.
 */
export async function fetchAmplifyJobDetails(
  appId: string,
  branchName: string,
  jobId: string
): Promise<BuildFailureDetails | null> {
  if (!appId || !branchName || !jobId) return null;

  try {
    const { job } = await client.send(
      new GetJobCommand({ appId, branchName, jobId })
    );

    if (!job) return null;

    const steps = job.steps ?? [];
    const failedSteps = steps
      .filter((s) => s.status === 'FAILED' || s.status === 'CANCELLED')
      .map((s) => ({
        stepName: s.stepName ?? 'unknown',
        status: s.status ?? 'UNKNOWN',
        statusReason: s.statusReason,
        logUrl: s.logUrl,
      }));

    return {
      jobId: job.summary?.jobId ?? jobId,
      commitId: job.summary?.commitId,
      commitMessage: job.summary?.commitMessage,
      status: job.summary?.status ?? 'UNKNOWN',
      failedSteps,
    };
  } catch (err) {
    console.error('Amplify GetJob error:', err);
    return null;
  }
}
