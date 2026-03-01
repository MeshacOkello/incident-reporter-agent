import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import IncidentDetail from '../IncidentDetail';
import * as api from '../../api';

vi.mock('../../api', () => ({
  fetchIncident: vi.fn(),
  updateIncident: vi.fn(),
}));

const mockIncident = {
  id: 'inc-123',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  status: 'open' as const,
  severity: 'high' as const,
  service: 'api',
  alertMessage: 'High error rate',
  alertSource: 'cloudwatch',
  alertPayload: {},
  deployments: [{ id: 'd1', service: 'api', timestamp: new Date().toISOString(), status: 'SUCCEED', commitSha: 'abc1234' }],
  commits: [{ sha: 'abc1234', message: 'Fix bug', author: 'Dev', timestamp: new Date().toISOString(), url: 'https://github.com/x/y/commit/abc' }],
  metricsSummary: null,
  aiAnalysis: {
    suspectedRootCause: 'Recent deploy',
    impactEstimate: 'Low impact',
    suggestedActions: ['Rollback', 'Check logs'],
    confidence: 'medium' as const,
  },
  slackSummary: 'Test',
  suggestedActions: ['Rollback'],
  actionItems: [],
};

const renderWithRouter = () =>
  render(
    <MemoryRouter initialEntries={['/incidents/inc-123']}>
      <Routes>
        <Route path="/incidents/:id" element={<IncidentDetail />} />
      </Routes>
    </MemoryRouter>
  );

describe('IncidentDetail', () => {
  it('shows incident details when loaded', async () => {
    vi.mocked(api.fetchIncident).mockResolvedValue(mockIncident);
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByText('High error rate')).toBeInTheDocument();
      expect(screen.getByText('Recent deploy')).toBeInTheDocument();
      expect(screen.getByText('Low impact')).toBeInTheDocument();
    });
  });

  it('shows error when incident not found', async () => {
    vi.mocked(api.fetchIncident).mockRejectedValue(new Error('Not found'));
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByText(/Error: Not found/)).toBeInTheDocument();
    });
  });
});
