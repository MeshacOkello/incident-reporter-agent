import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchIncidents, fetchServices } from '../api';
import type { Incident } from '../api';

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString();
}

const severityStyles: Record<Incident['severity'], string> = {
  low: 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border-muted)]',
  medium: 'bg-[var(--warning)]/10 text-[var(--warning)] border border-[var(--warning)]/20',
  high: 'bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/20',
  critical: 'bg-[var(--danger)]/15 text-[var(--danger)] border border-[var(--danger)]/30',
};

const statusStyles: Record<Incident['status'], string> = {
  open: 'bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/20',
  investigating: 'bg-[var(--warning)]/10 text-[var(--warning)] border border-[var(--warning)]/20',
  resolved: 'bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20',
  postmortem: 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border border-[var(--border-muted)]',
};

function SeverityBadge({ severity }: { severity: Incident['severity'] }) {
  return (
    <span className={`inline-flex items-center rounded-[var(--radius-sm)] px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wide ${severityStyles[severity]}`}>
      {severity}
    </span>
  );
}

function StatusBadge({ status }: { status: Incident['status'] }) {
  return (
    <span className={`inline-flex items-center rounded-[var(--radius-sm)] px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wide ${statusStyles[status]}`}>
      {status}
    </span>
  );
}

export default function Dashboard() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [selectedService, setSelectedService] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchServices()
      .then(setServices)
      .catch(() => setServices([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchIncidents(selectedService || undefined)
      .then(setIncidents)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedService]);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-6"
        data-testid="loading"
      >
        <div className="h-6 w-40 animate-pulse rounded bg-[var(--bg-elevated)]" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-[var(--radius-md)] bg-[var(--bg-surface)]" />
          ))}
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-[var(--radius-md)] border border-[var(--danger)]/30 bg-[var(--danger)]/5 px-6 py-5 text-[13px] text-[var(--danger)]"
      >
        Error: {error}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="space-y-8"
    >
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-[22px] font-medium tracking-tight text-[var(--text-primary)]">
            Incidents
            {incidents.length > 0 && (
              <span className="ml-2 font-normal text-[var(--text-muted)]">({incidents.length})</span>
            )}
          </h1>
          <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
            Production alerts and their analysis.
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="service-filter" className="text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">
            Service
          </label>
          <select
            id="service-filter"
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            className="rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-[13px] text-[var(--text-primary)] transition-colors focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/30"
          >
            <option value="">All services</option>
            {services.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {incidents.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-surface)] px-12 py-16 text-center"
          >
            <div className="mx-auto mb-5 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--bg-elevated)]">
              <svg className="h-5 w-5 text-[var(--text-muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-[15px] font-medium text-[var(--text-primary)]">No incidents</p>
            <p className="mt-2 text-[13px] text-[var(--text-secondary)]">
              Alerts will appear here when received via <code className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 font-mono text-[12px] text-[var(--text-muted)]">POST /api/webhook</code>
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-surface)]"
          >
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-[var(--border-default)]">
                    <th className="px-6 py-3.5 text-left text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">Time</th>
                    <th className="px-6 py-3.5 text-left text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">Service</th>
                    <th className="px-6 py-3.5 text-left text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">Alert</th>
                    <th className="px-6 py-3.5 text-left text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">Severity</th>
                    <th className="px-6 py-3.5 text-left text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">Status</th>
                    <th className="px-6 py-3.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.map((inc, i) => (
                    <motion.tr
                      key={inc.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.02, duration: 0.15 }}
                      className="group border-b border-[var(--border-muted)] last:border-0 transition-colors hover:bg-[var(--bg-elevated)]/50"
                    >
                      <td className="whitespace-nowrap px-6 py-4 font-mono text-[12px] text-[var(--text-secondary)]">
                        {formatTime(inc.createdAt)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 font-mono text-[13px] text-[var(--text-primary)]">
                        {inc.service}
                      </td>
                      <td className="max-w-md truncate px-6 py-4 text-[13px] text-[var(--text-primary)]">
                        {inc.alertMessage}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <SeverityBadge severity={inc.severity} />
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <StatusBadge status={inc.status} />
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <Link
                          to={`/incidents/${inc.id}`}
                          className="inline-flex items-center rounded-[var(--radius-sm)] px-3 py-1.5 text-[12px] font-medium text-[var(--accent)] transition-colors hover:bg-[var(--accent-muted)]"
                        >
                          View →
                        </Link>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
