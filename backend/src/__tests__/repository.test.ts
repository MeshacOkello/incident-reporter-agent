import { describe, it, expect, beforeEach } from 'vitest';
import { createIncident, getIncident, listIncidents, updateIncident } from '../repository.js';
import { db } from '../db.js';

// Note: setup.ts sets TEST_DB=1 so db uses :memory:

describe('repository', () => {
  beforeEach(() => {
    db.exec('DELETE FROM incidents');
  });

  it('creates and retrieves incident', () => {
    const inc = createIncident({
      id: 'test-1',
      status: 'open',
      severity: 'high',
      service: 'api',
      alertMessage: 'Error spike',
      alertSource: 'cloudwatch',
      alertPayload: { source: 'generic' },
      deployments: [],
      commits: [],
      metricsSummary: null,
      aiAnalysis: null,
      suggestedActions: [],
      actionItems: [],
    });
    expect(inc).toHaveProperty('id', 'test-1');
    expect(inc).toHaveProperty('createdAt');
    expect(getIncident('test-1')).toBeTruthy();
    expect(getIncident('test-1')?.service).toBe('api');
  });

  it('returns null for non-existent incident', () => {
    expect(getIncident('nonexistent')).toBeNull();
  });

  it('lists incidents ordered by created_at desc', () => {
    createIncident({
      id: 'a',
      status: 'open',
      severity: 'low',
      service: 'x',
      alertMessage: 'A',
      alertSource: 'generic',
      alertPayload: { source: 'generic' },
      deployments: [],
      commits: [],
      metricsSummary: null,
      aiAnalysis: null,
      suggestedActions: [],
      actionItems: [],
    });
    createIncident({
      id: 'b',
      status: 'open',
      severity: 'low',
      service: 'x',
      alertMessage: 'B',
      alertSource: 'generic',
      alertPayload: { source: 'generic' },
      deployments: [],
      commits: [],
      metricsSummary: null,
      aiAnalysis: null,
      suggestedActions: [],
      actionItems: [],
    });
    const list = listIncidents();
    expect(list.length).toBe(2);
    // Most recent first (id DESC as tiebreaker when created_at equal)
    expect(list[0].id).toBe('b');
  });

  it('updates incident status and resolution', () => {
    createIncident({
      id: 'up-1',
      status: 'open',
      severity: 'medium',
      service: 's',
      alertMessage: 'M',
      alertSource: 'generic',
      alertPayload: { source: 'generic' },
      deployments: [],
      commits: [],
      metricsSummary: null,
      aiAnalysis: null,
      suggestedActions: [],
      actionItems: [],
    });
    const updated = updateIncident('up-1', {
      status: 'resolved',
      resolvedAt: new Date().toISOString(),
      resolutionNotes: 'Fixed',
    });
    expect(updated?.status).toBe('resolved');
    expect(updated?.resolutionNotes).toBe('Fixed');
  });
});
