import type { DeploymentInfo, MetricsSummary } from '../types.js';

/**
 * Fetches recent deployments from AWS Amplify/CodeDeploy.
 * In production, this would call AWS APIs. For v1 we use mock/placeholder.
 */
export async function fetchRecentDeployments(
  appId?: string,
  region?: string
): Promise<DeploymentInfo[]> {
  // In production: AWS Amplify ListJobs API or CodeDeploy ListDeployments
  // For v1: Return mock data when no credentials, or call real API if configured
  const awsAppId = appId ?? process.env.AWS_AMPLIFY_APP_ID;
  if (!awsAppId) {
    return [
      {
        id: 'mock-deploy-1',
        service: 'web-app',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        status: 'SUCCEED',
        commitSha: 'abc1234',
        buildUrl: 'https://console.aws.amazon.com/amplify',
      },
    ];
  }

  // Placeholder for real AWS integration
  try {
    // Would use: AWS SDK Amplify listJobs
    return [];
  } catch {
    return [];
  }
}

/**
 * Fetches metrics summary around alert time.
 * In production: CloudWatch GetMetricStatistics.
 */
export async function fetchMetricsSummary(
  service: string,
  metricName: string,
  startTime: Date,
  endTime: Date
): Promise<MetricsSummary | null> {
  // In production: CloudWatch API
  return {
    period: `${startTime.toISOString()} to ${endTime.toISOString()}`,
    errorRate: 0.05,
    latencyP99: 450,
    requestCount: 12500,
    sample: 'Sample metric data from CloudWatch (mock)',
  };
}
