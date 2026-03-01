import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { fetchIncident, updateIncident } from '../api';
import type { Incident } from '../api';

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString();
}

const severityStyles: Record<Incident['severity'], string> = {
  low: 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-[var(--border-muted)]',
  medium: 'bg-[var(--warning)]/10 text-[var(--warning)] border border-[var(--warning)]/20',
  high: 'bg-[var(--danger)]/10 text-[var(--danger)] border border-[var(--danger)]/20',
  critical: 'bg-[var(--danger)]/15 text-[var(--danger)] border border-[var(--danger)]/30',
};

function SeverityBadge({ severity }: { severity: Incident['severity'] }) {
  return (
    <span className={`inline-flex items-center rounded-[var(--radius-sm)] px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wide ${severityStyles[severity]}`}>
      {severity}
    </span>
  );
}

function Section({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-surface)] p-6 ${className}`}>
      <h2 className="mb-4 text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">{title}</h2>
      {children}
    </section>
  );
}

export default function IncidentDetail() {
  const { id } = useParams<{ id: string }>();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchIncident(id)
      .then(setIncident)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleStatusChange = async (status: Incident['status']) => {
    if (!id || !incident) return;
    setUpdating(true);
    try {
      const updated = await updateIncident(id, { status });
      setIncident(updated);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div className="h-5 w-48 animate-pulse rounded bg-[var(--bg-elevated)]" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-[var(--radius-lg)] bg-[var(--bg-surface)]" />
          ))}
        </div>
      </motion.div>
    );
  }

  if (error || !incident) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="rounded-[var(--radius-md)] border border-[var(--danger)]/30 bg-[var(--danger)]/5 px-6 py-5 text-[13px] text-[var(--danger)]"
      >
        Error: {error ?? 'Not found'}
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
      <nav className="flex items-center gap-2 text-[13px]">
        <Link to="/" className="text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]">Dashboard</Link>
        <span className="text-[var(--text-muted)]">/</span>
        <span className="font-mono text-[var(--text-muted)]">{incident.id.slice(0, 8)}</span>
      </nav>

      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-[18px] font-medium leading-snug tracking-tight text-[var(--text-primary)]">
            {incident.alertMessage}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[13px] text-[var(--text-secondary)]">
            <SeverityBadge severity={incident.severity} />
            <span className="font-mono">{incident.service}</span>
            <span>{incident.alertSource}</span>
            <span className="text-[var(--text-muted)]">{formatDateTime(incident.createdAt)}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={incident.status}
            onChange={(e) => handleStatusChange(e.target.value as Incident['status'])}
            disabled={updating}
            className="rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-[13px] text-[var(--text-primary)] transition-colors focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/30 disabled:opacity-50"
          >
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
            <option value="postmortem">Postmortem</option>
          </select>
          {(incident.status === 'resolved' || incident.status === 'postmortem') && (
            <Link
              to={`/incidents/${id}/postmortem`}
              className="inline-flex items-center rounded-[var(--radius-sm)] bg-[var(--accent)]/15 px-4 py-2 text-[13px] font-medium text-[var(--accent)] transition-colors hover:bg-[var(--accent-muted)]"
            >
              Postmortem →
            </Link>
          )}
        </div>
      </div>

      <Section title="Timeline">
        <ul className="space-y-2.5">
          <li className="flex gap-3 text-[13px]">
            <span className="w-20 shrink-0 font-medium text-[var(--text-primary)]">Alert</span>
            <span className="font-mono text-[var(--text-secondary)]">{formatDateTime(incident.createdAt)}</span>
          </li>
          {incident.deployments[0] && (
            <li className="flex gap-3 text-[13px]">
              <span className="w-20 shrink-0 font-medium text-[var(--text-primary)]">Deploy</span>
              <span className="font-mono text-[var(--text-secondary)]">
                {formatDateTime(incident.deployments[0].timestamp)}
                {incident.deployments[0].commitSha && ` · ${incident.deployments[0].commitSha.slice(0, 7)}`}
              </span>
            </li>
          )}
          {incident.resolvedAt && (
            <li className="flex gap-3 text-[13px]">
              <span className="w-20 shrink-0 font-medium text-[var(--text-primary)]">Resolved</span>
              <span className="font-mono text-[var(--text-secondary)]">{formatDateTime(incident.resolvedAt)}</span>
            </li>
          )}
        </ul>
      </Section>

      {incident.aiAnalysis && (
        <Section title="AI Analysis" className="border-l-2 border-l-[var(--accent)]/40">
          <div className="grid gap-6 sm:grid-cols-3">
            <div>
              <h3 className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">Root cause</h3>
              <p className="text-[13px] leading-relaxed text-[var(--text-primary)]">{incident.aiAnalysis.suspectedRootCause}</p>
            </div>
            <div>
              <h3 className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">Impact</h3>
              <p className="text-[13px] leading-relaxed text-[var(--text-primary)]">{incident.aiAnalysis.impactEstimate}</p>
            </div>
            <div>
              <h3 className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">Confidence</h3>
              <p className="text-[13px] font-medium capitalize text-[var(--text-primary)]">{incident.aiAnalysis.confidence}</p>
            </div>
          </div>
          <div className="mt-6 border-t border-[var(--border-muted)] pt-5">
            <h3 className="mb-3 text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">Suggested actions</h3>
            <ul className="space-y-2">
              {incident.aiAnalysis.suggestedActions.map((a, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[13px] text-[var(--text-secondary)]">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--accent)]" />
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        </Section>
      )}

      <Section title="Recent commits">
        {incident.commits.length === 0 ? (
          <p className="text-[13px] text-[var(--text-muted)]">No commits in context.</p>
        ) : (
          <ul className="space-y-3">
            {incident.commits.map((c) => (
              <li key={c.sha} className="flex flex-wrap items-baseline gap-2 text-[13px]">
                <a href={c.url} target="_blank" rel="noreferrer" className="font-mono text-[var(--accent)] hover:underline">
                  {c.sha.slice(0, 7)}
                </a>
                <span className="truncate text-[var(--text-primary)]">{c.message}</span>
                <span className="text-[var(--text-muted)]">· {c.author}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Deployments">
        {incident.deployments.length === 0 ? (
          <p className="text-[13px] text-[var(--text-muted)]">No deployment data.</p>
        ) : (
          <ul className="space-y-2.5">
            {incident.deployments.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-3 text-[13px]">
                <span className="font-mono text-[var(--text-primary)]">{d.service}</span>
                <span className="rounded-[var(--radius-sm)] bg-[var(--bg-elevated)] px-2 py-0.5 font-mono text-[11px] text-[var(--text-secondary)]">{d.status}</span>
                <span className="font-mono text-[var(--text-muted)]">{d.commitSha?.slice(0, 7) ?? '—'}</span>
                <span className="text-[var(--text-muted)]">{formatDateTime(d.timestamp)}</span>
                {d.buildUrl && (
                  <a href={d.buildUrl} target="_blank" rel="noreferrer" className="text-[var(--accent)] hover:underline">Build</a>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {incident.metricsSummary && (
        <Section title="Metrics">
          <pre className="overflow-x-auto rounded-[var(--radius-sm)] bg-[var(--bg-base)] p-4 font-mono text-[12px] leading-relaxed text-[var(--text-secondary)]">
            {JSON.stringify(incident.metricsSummary, null, 2)}
          </pre>
        </Section>
      )}
    </motion.div>
  );
}
