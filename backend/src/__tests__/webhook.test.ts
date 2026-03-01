import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleWebhook } from '../handlers/webhook.js';

// Mock external services
vi.mock('../services/github.js', () => ({
  fetchRecentCommits: vi.fn().mockResolvedValue([
    { sha: 'abc1234', message: 'Fix bug', author: 'Dev', timestamp: '2024-01-01T00:00:00Z', url: 'https://github.com/owner/repo/commit/abc1234' },
  ]),
  fetchCommitWithFiles: vi.fn().mockResolvedValue(null),
}));
vi.mock('../services/amplify.js', () => ({
  fetchAmplifyJobDetails: vi.fn().mockResolvedValue(null),
}));
vi.mock('../services/aws.js', () => ({
  fetchRecentDeployments: vi.fn().mockResolvedValue([
    { id: 'd1', service: 'web', timestamp: '2024-01-01T00:00:00Z', status: 'SUCCEED', commitSha: 'abc1234' },
  ]),
  fetchMetricsSummary: vi.fn().mockResolvedValue({ period: '1h', errorRate: 0.05 }),
}));
vi.mock('../services/llm.js', () => ({
  analyzeIncident: vi.fn().mockResolvedValue({
    analysis: {
      suspectedRootCause: 'Recent deploy',
      impactEstimate: 'Low',
      suggestedActions: ['Rollback', 'Check logs'],
      confidence: 'medium' as const,
    },
    slackSummary: 'Incident summary',
    suggestedActions: ['Rollback', 'Check logs'],
  }),
}));
vi.mock('../services/slack.js', () => ({
  sendSlackNotification: vi.fn().mockResolvedValue(true),
}));
vi.mock('../repository.js', () => {
  const incidents: Record<string, unknown> = {};
  return {
    createIncident: vi.fn().mockImplementation((inc: { id: string }) => {
      incidents[inc.id] = inc;
      return { ...inc, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    }),
  };
});

describe('handleWebhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('accepts valid webhook payload and returns incident ID', async () => {
    const result = await handleWebhook({
      source: 'cloudwatch',
      service: 'api',
      message: 'High error rate',
    });
    expect(result).toHaveProperty('incidentId');
    expect(typeof result.incidentId).toBe('string');
    expect(result.incidentId.length).toBeGreaterThan(0);
  });

  it('uses defaults for missing fields', async () => {
    const result = await handleWebhook({});
    expect(result).toHaveProperty('incidentId');
  });

  it('infers severity from message keywords', async () => {
    const { createIncident } = await import('../repository.js');
    await handleWebhook({ message: 'Critical outage detected' });
    expect(createIncident).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'critical' })
    );
  });

  it('rejects invalid source', async () => {
    await expect(handleWebhook({ source: 'invalid' })).rejects.toThrow();
  });
});
