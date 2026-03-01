import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { fetchIncident, updateIncident, generatePostmortemDraft } from '../api';
import type { Incident } from '../api';

export default function Postmortem() {
  const { id } = useParams<{ id: string }>();
  const [incident, setIncident] = useState<Incident | null>(null);
  const [postmortem, setPostmortem] = useState('');
  const [actionItems, setActionItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetchIncident(id)
      .then((inc) => {
        setIncident(inc);
        setPostmortem(inc.postmortem ?? '');
        const items =
          inc.actionItems.length > 0
            ? inc.actionItems
            : (inc.suggestedActions ?? []).map((a) => (a.startsWith('[ ]') || a.startsWith('[x]') ? a : `[ ] ${a}`));
        setActionItems(items);
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleGenerate = async () => {
    if (!id) return;
    setGenerating(true);
    try {
      const { draft } = await generatePostmortemDraft(id);
      setPostmortem(draft);
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const updated = await updateIncident(id, { postmortem, actionItems });
      setIncident(updated);
    } finally {
      setSaving(false);
    }
  };

  const toggleActionItem = (index: number) => {
    const next = [...actionItems];
    const item = next[index];
    if (item.startsWith('[x]') || item.startsWith('[X]')) {
      next[index] = item.replace(/^\[x\]/i, '[ ]');
    } else {
      next[index] = item.replace(/^\[\s?\]/, '[x]');
    }
    setActionItems(next);
  };

  if (loading || !incident) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div className="h-5 w-40 animate-pulse rounded bg-[var(--bg-elevated)]" />
        <div className="h-80 animate-pulse rounded-[var(--radius-lg)] bg-[var(--bg-surface)]" />
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
        <Link to={`/incidents/${id}`} className="text-[var(--text-secondary)] transition-colors hover:text-[var(--accent)]">Incident</Link>
        <span className="text-[var(--text-muted)]">/</span>
        <span className="text-[var(--text-muted)]">Postmortem</span>
      </nav>

      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="text-[18px] font-medium leading-snug tracking-tight text-[var(--text-primary)]">
          Postmortem: {incident.alertMessage}
        </h1>
        <div className="flex gap-2">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="inline-flex items-center rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-2 text-[13px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-elevated)] disabled:opacity-50"
          >
            {generating ? (
              <>
                <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating...
              </>
            ) : (
              'Generate draft'
            )}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center rounded-[var(--radius-sm)] bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <section className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
        <h2 className="mb-4 text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">Postmortem</h2>
        <textarea
          value={postmortem}
          onChange={(e) => setPostmortem(e.target.value)}
          placeholder="Write or generate a postmortem..."
          rows={20}
          className="w-full rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-base)] px-4 py-3 font-mono text-[13px] leading-relaxed text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-colors focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/30"
        />
      </section>

      <section className="rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-surface)] p-6">
        <h2 className="mb-4 text-[11px] font-medium uppercase tracking-wider text-[var(--text-muted)]">Action items</h2>
        <ul className="space-y-3">
          {actionItems.map((item, i) => (
            <motion.li
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.02 * i }}
              className="flex items-start gap-3"
            >
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={item.startsWith('[x]') || item.startsWith('[X]')}
                  onChange={() => toggleActionItem(i)}
                  className="mt-1 h-4 w-4 rounded border-[var(--border-default)] bg-[var(--bg-base)] text-[var(--accent)] focus:ring-[var(--accent)]/30"
                />
                <span className={`text-[13px] leading-relaxed ${(item.startsWith('[x]') || item.startsWith('[X]')) ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-primary)]'}`}>
                  {item.replace(/^\[[x ]\]\s*/i, '')}
                </span>
              </label>
            </motion.li>
          ))}
        </ul>
        <p className="mt-4 text-[12px] text-[var(--text-muted)]">Check off items as they are completed.</p>
      </section>
    </motion.div>
  );
}
