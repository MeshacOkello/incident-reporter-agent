import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../Dashboard';
import * as api from '../../api';

vi.mock('../../api', () => ({
  fetchIncidents: vi.fn(),
  fetchServices: vi.fn().mockResolvedValue([]),
}));

const renderWithRouter = (ui: React.ReactElement) =>
  render(<BrowserRouter>{ui}</BrowserRouter>);

describe('Dashboard', () => {
  it('shows loading state initially', () => {
    vi.mocked(api.fetchIncidents).mockImplementation(() => new Promise(() => {}));
    renderWithRouter(<Dashboard />);
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('shows empty state when no incidents', async () => {
    vi.mocked(api.fetchIncidents).mockResolvedValue([]);
    renderWithRouter(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText(/No incidents/)).toBeInTheDocument();
    });
  });

  it('shows incident list when data loaded', async () => {
    vi.mocked(api.fetchIncidents).mockResolvedValue([
      {
        id: 'inc-1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'open',
        severity: 'high',
        service: 'api',
        alertMessage: 'Error spike',
        alertSource: 'cloudwatch',
        alertPayload: {},
        deployments: [],
        commits: [],
        metricsSummary: null,
        aiAnalysis: null,
        suggestedActions: [],
        actionItems: [],
      },
    ]);
    renderWithRouter(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText('Error spike')).toBeInTheDocument();
      expect(screen.getByText('api')).toBeInTheDocument();
    });
  });

  it('shows error when fetch fails', async () => {
    vi.mocked(api.fetchIncidents).mockRejectedValue(new Error('Network error'));
    renderWithRouter(<Dashboard />);
    await waitFor(() => {
      expect(screen.getByText(/Error: Network error/)).toBeInTheDocument();
    });
  });
});
