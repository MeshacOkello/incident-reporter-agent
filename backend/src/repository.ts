import { db } from './db.js';
import type { Incident, IncidentStatus } from './types.js';

function rowToIncident(row: Record<string, unknown>): Incident {
  return {
    id: row.id as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    status: row.status as IncidentStatus,
    severity: row.severity as Incident['severity'],
    service: row.service as string,
    alertMessage: row.alert_message as string,
    alertSource: row.alert_source as string,
    alertPayload: row.alert_payload ? JSON.parse(row.alert_payload as string) : {},
    deployments: row.deployments ? JSON.parse(row.deployments as string) : [],
    commits: row.commits ? JSON.parse(row.commits as string) : [],
    metricsSummary: row.metrics_summary ? JSON.parse(row.metrics_summary as string) : null,
    aiAnalysis: row.ai_analysis ? JSON.parse(row.ai_analysis as string) : null,
    slackSummary: row.slack_summary as string | undefined,
    suggestedActions: row.suggested_actions ? JSON.parse(row.suggested_actions as string) : [],
    resolvedAt: row.resolved_at as string | undefined,
    resolutionNotes: row.resolution_notes as string | undefined,
    postmortem: row.postmortem as string | undefined,
    actionItems: row.action_items ? JSON.parse(row.action_items as string) : [],
  };
}

export function createIncident(incident: Omit<Incident, 'createdAt' | 'updatedAt'>): Incident {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO incidents (
      id, created_at, updated_at, status, severity, service, alert_message, alert_source,
      alert_payload, deployments, commits, metrics_summary, ai_analysis, slack_summary,
      suggested_actions, resolved_at, resolution_notes, postmortem, action_items
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    incident.id,
    now,
    now,
    incident.status,
    incident.severity,
    incident.service,
    incident.alertMessage,
    incident.alertSource,
    JSON.stringify(incident.alertPayload),
    JSON.stringify(incident.deployments),
    JSON.stringify(incident.commits),
    incident.metricsSummary ? JSON.stringify(incident.metricsSummary) : null,
    incident.aiAnalysis ? JSON.stringify(incident.aiAnalysis) : null,
    incident.slackSummary ?? null,
    JSON.stringify(incident.suggestedActions),
    incident.resolvedAt ?? null,
    incident.resolutionNotes ?? null,
    incident.postmortem ?? null,
    JSON.stringify(incident.actionItems)
  );
  return { ...incident, createdAt: now, updatedAt: now };
}

export function getIncident(id: string): Incident | null {
  const row = db.prepare('SELECT * FROM incidents WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return row ? rowToIncident(row) : null;
}

export function listIncidents(service?: string, limit = 50): Incident[] {
  let rows: Record<string, unknown>[];
  if (service) {
    rows = db.prepare('SELECT * FROM incidents WHERE service = ? ORDER BY created_at DESC, id DESC LIMIT ?').all(service, limit) as Record<string, unknown>[];
  } else {
    rows = db.prepare('SELECT * FROM incidents ORDER BY created_at DESC, id DESC LIMIT ?').all(limit) as Record<string, unknown>[];
  }
  return rows.map(rowToIncident);
}

export function updateIncident(
  id: string,
  updates: Partial<Pick<Incident, 'status' | 'resolutionNotes' | 'resolvedAt' | 'postmortem' | 'actionItems'>>
): Incident | null {
  const now = new Date().toISOString();
  const incident = getIncident(id);
  if (!incident) return null;

  const stmt = db.prepare(`
    UPDATE incidents SET
      updated_at = ?,
      status = COALESCE(?, status),
      resolved_at = COALESCE(?, resolved_at),
      resolution_notes = COALESCE(?, resolution_notes),
      postmortem = COALESCE(?, postmortem),
      action_items = COALESCE(?, action_items)
    WHERE id = ?
  `);
  stmt.run(
    now,
    updates.status ?? incident.status,
    updates.resolvedAt ?? incident.resolvedAt,
    updates.resolutionNotes ?? incident.resolutionNotes,
    updates.postmortem ?? incident.postmortem,
    updates.actionItems ? JSON.stringify(updates.actionItems) : JSON.stringify(incident.actionItems),
    id
  );
  return getIncident(id);
}
