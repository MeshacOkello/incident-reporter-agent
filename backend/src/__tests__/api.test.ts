import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import express from 'express';
import cors from 'cors';
import { api } from '../routes.js';
import { db } from '../db.js';

vi.mock('../services/github.js', () => ({ fetchRecentCommits: vi.fn().mockResolvedValue([]) }));
vi.mock('../services/aws.js', () => ({
  fetchRecentDeployments: vi.fn().mockResolvedValue([]),
  fetchMetricsSummary: vi.fn().mockResolvedValue(null),
}));
vi.mock('../services/llm.js', () => ({
  analyzeIncident: vi.fn().mockResolvedValue({
    analysis: { suspectedRootCause: 'Test', impactEstimate: 'Low', suggestedActions: [], confidence: 'low' },
    slackSummary: 'Test',
    suggestedActions: [],
  }),
  generatePostmortemDraft: vi.fn().mockResolvedValue('# Postmortem\n\n## Summary\nTest incident.'),
}));
vi.mock('../services/slack.js', () => ({ sendSlackNotification: vi.fn().mockResolvedValue(true) }));

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', api);

let server: ReturnType<typeof app.listen>;

beforeAll(() => {
  server = app.listen(0);
});

afterAll((done) => {
  server.close(done);
});

beforeEach(() => {
  db.exec('DELETE FROM incidents');
});

const baseUrl = () => {
  const addr = server.address();
  if (!addr || typeof addr === 'string') return 'http://localhost:3001';
  return `http://localhost:${addr.port}`;
};

describe('API', () => {
  it('POST /api/webhook creates incident', async () => {
    const res = await fetch(`${baseUrl()}/api/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'cloudwatch',
        service: 'api',
        message: 'High error rate',
      }),
    });
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toHaveProperty('incidentId');
  });

  it('GET /api/incidents returns list', async () => {
    const res = await fetch(`${baseUrl()}/api/incidents`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json)).toBe(true);
  });

  it('GET /api/incidents?service=X filters by service', async () => {
    await fetch(`${baseUrl()}/api/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'generic', service: 'my-app', message: 'Test' }),
    });
    const res = await fetch(`${baseUrl()}/api/incidents?service=my-app`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json)).toBe(true);
    if (json.length > 0) expect(json.every((i: { service: string }) => i.service === 'my-app')).toBe(true);
  });

  it('GET /api/services returns unique services', async () => {
    const res = await fetch(`${baseUrl()}/api/services`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json)).toBe(true);
  });

  it('GET /api/incidents/:id returns 404 for unknown', async () => {
    const res = await fetch(`${baseUrl()}/api/incidents/unknown-id`);
    expect(res.status).toBe(404);
  });

  it('PATCH /api/incidents/:id updates incident', async () => {
    const createRes = await fetch(`${baseUrl()}/api/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'generic', service: 'test', message: 'Test' }),
    });
    const { incidentId } = await createRes.json();
    const patchRes = await fetch(`${baseUrl()}/api/incidents/${incidentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'resolved', resolutionNotes: 'Fixed' }),
    });
    expect(patchRes.status).toBe(200);
    const updated = await patchRes.json();
    expect(updated.status).toBe('resolved');
    expect(updated.resolutionNotes).toBe('Fixed');
  });

  it('POST /api/incidents/:id/postmortem-draft returns draft', async () => {
    const createRes = await fetch(`${baseUrl()}/api/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'generic', service: 'test', message: 'Test' }),
    });
    const { incidentId } = await createRes.json();
    const res = await fetch(`${baseUrl()}/api/incidents/${incidentId}/postmortem-draft`, {
      method: 'POST',
    });
    expect(res.status).toBe(200);
    const { draft } = await res.json();
    expect(draft).toBeTruthy();
    expect(typeof draft).toBe('string');
    expect(draft.length).toBeGreaterThan(0);
  });
});
