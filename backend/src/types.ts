export type IncidentStatus = 'open' | 'investigating' | 'resolved' | 'postmortem';
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AlertPayload {
  source: 'aws' | 'cloudwatch' | 'amplify' | 'generic';
  service?: string;
  region?: string;
  message?: string;
  metricName?: string;
  threshold?: number;
  timestamp?: string;
  [key: string]: unknown;
}

export interface DeploymentInfo {
  id: string;
  service: string;
  timestamp: string;
  status: string;
  commitSha?: string;
  buildUrl?: string;
}

export interface GitHubCommit {
  sha: string;
  message: string;
  author: string;
  timestamp: string;
  url: string;
}

export interface BuildFailureStep {
  stepName: string;
  status: string;
  statusReason?: string;
  logUrl?: string;
}

export interface BuildFailureDetails {
  jobId: string;
  commitId?: string;
  commitMessage?: string;
  status: string;
  failedSteps: BuildFailureStep[];
}

export interface CommitFileChange {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch?: string;
}

export interface MetricsSummary {
  period: string;
  errorRate?: number;
  latencyP99?: number;
  requestCount?: number;
  sample?: string;
}

export interface AIAnalysis {
  suspectedRootCause: string;
  impactEstimate: string;
  suggestedActions: string[];
  confidence: 'low' | 'medium' | 'high';
}

export interface Incident {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  service: string;
  alertMessage: string;
  alertSource: string;
  alertPayload: AlertPayload;
  deployments: DeploymentInfo[];
  commits: GitHubCommit[];
  metricsSummary: MetricsSummary | null;
  aiAnalysis: AIAnalysis | null;
  slackSummary?: string;
  suggestedActions: string[];
  resolvedAt?: string;
  resolutionNotes?: string;
  postmortem?: string;
  actionItems: string[];
}
