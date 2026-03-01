export interface Incident {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: 'open' | 'investigating' | 'resolved' | 'postmortem';
  severity: 'low' | 'medium' | 'high' | 'critical';
  service: string;
  alertMessage: string;
  alertSource: string;
  alertPayload: Record<string, unknown>;
  deployments: Array<{
    id: string;
    service: string;
    timestamp: string;
    status: string;
    commitSha?: string;
    buildUrl?: string;
  }>;
  commits: Array<{
    sha: string;
    message: string;
    author: string;
    timestamp: string;
    url: string;
  }>;
  metricsSummary: {
    period: string;
    errorRate?: number;
    latencyP99?: number;
    requestCount?: number;
    sample?: string;
  } | null;
  aiAnalysis: {
    suspectedRootCause: string;
    impactEstimate: string;
    suggestedActions: string[];
    confidence: 'low' | 'medium' | 'high';
  } | null;
  slackSummary?: string;
  suggestedActions: string[];
  resolvedAt?: string;
  resolutionNotes?: string;
  postmortem?: string;
  actionItems: string[];
}

const API = '/api';

export async function fetchIncidents(service?: string): Promise<Incident[]> {
  const url = service ? `${API}/incidents?service=${encodeURIComponent(service)}` : `${API}/incidents`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch incidents');
  return res.json();
}

export async function fetchServices(): Promise<string[]> {
  const res = await fetch(`${API}/services`);
  if (!res.ok) throw new Error('Failed to fetch services');
  return res.json();
}

export async function fetchIncident(id: string): Promise<Incident> {
  const res = await fetch(`${API}/incidents/${id}`);
  if (!res.ok) {
    if (res.status === 404) throw new Error('Incident not found');
    throw new Error('Failed to fetch incident');
  }
  return res.json();
}

export async function updateIncident(
  id: string,
  updates: Partial<{
    status: Incident['status'];
    resolutionNotes: string;
    postmortem: string;
    actionItems: string[];
  }>
): Promise<Incident> {
  const res = await fetch(`${API}/incidents/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error('Failed to update incident');
  return res.json();
}

export async function generatePostmortemDraft(id: string): Promise<{ draft: string }> {
  const res = await fetch(`${API}/incidents/${id}/postmortem-draft`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to generate postmortem');
  return res.json();
}
