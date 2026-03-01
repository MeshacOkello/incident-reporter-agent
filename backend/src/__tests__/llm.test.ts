import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeIncident } from '../services/llm.js';

describe('analyzeIncident', () => {
  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  it('returns fallback analysis when OPENAI_API_KEY is not set', async () => {
    const result = await analyzeIncident(
      'High error rate',
      'cloudwatch',
      [{ id: 'd1', service: 'api', timestamp: new Date().toISOString(), status: 'SUCCEED', commitSha: 'abc1234' }],
      [{ sha: 'abc1234', message: 'Fix', author: 'Dev', timestamp: new Date().toISOString(), url: 'https://x' }],
      null
    );
    expect(result.analysis).toBeDefined();
    expect(result.analysis.suspectedRootCause).toBeTruthy();
    expect(result.analysis.suggestedActions.length).toBeGreaterThan(0);
    expect(result.slackSummary).toBeTruthy();
    expect(result.suggestedActions.length).toBeGreaterThan(0);
  });
});
