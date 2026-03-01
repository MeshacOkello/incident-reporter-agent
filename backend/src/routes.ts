import { Router } from 'express';
import { handleWebhook } from './handlers/webhook.js';
import { getIncident, listIncidents, updateIncident } from './repository.js';
import { generatePostmortemDraft } from './services/llm.js';

export const api = Router();

// Webhook: receive production alerts
api.post('/webhook', async (req, res) => {
  try {
    const { incidentId } = await handleWebhook(req.body);
    res.status(201).json({ incidentId });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(400).json({ error: 'Invalid webhook payload' });
  }
});

// List incidents (optional filter: ?service=X)
api.get('/incidents', (req, res) => {
  const service = req.query.service as string | undefined;
  const incidents = listIncidents(service);
  res.json(incidents);
});

// List unique services (for filter dropdown)
api.get('/services', (_req, res) => {
  const incidents = listIncidents();
  const services = [...new Set(incidents.map((i) => i.service).filter(Boolean))].sort();
  res.json(services);
});

// Get single incident
api.get('/incidents/:id', (req, res) => {
  const incident = getIncident(req.params.id);
  if (!incident) {
    return res.status(404).json({ error: 'Incident not found' });
  }
  res.json(incident);
});

// Update incident (status, resolution, postmortem)
api.patch('/incidents/:id', (req, res) => {
  const incident = getIncident(req.params.id);
  if (!incident) {
    return res.status(404).json({ error: 'Incident not found' });
  }

  const { status, resolutionNotes, postmortem, actionItems } = req.body;

  const updates: Parameters<typeof updateIncident>[1] = {};
  if (status) updates.status = status;
  if (resolutionNotes !== undefined) updates.resolutionNotes = resolutionNotes;
  if (postmortem !== undefined) updates.postmortem = postmortem;
  if (actionItems) updates.actionItems = actionItems;

  if (status === 'resolved' && !incident.resolvedAt) {
    updates.resolvedAt = new Date().toISOString();
  }

  const updated = updateIncident(req.params.id, updates);
  res.json(updated);
});

// Generate postmortem draft
api.post('/incidents/:id/postmortem-draft', async (req, res) => {
  const incident = getIncident(req.params.id);
  if (!incident) {
    return res.status(404).json({ error: 'Incident not found' });
  }
  if (!incident.aiAnalysis) {
    return res.status(400).json({ error: 'No AI analysis available' });
  }

  const draft = await generatePostmortemDraft(
    incident.id,
    incident.alertMessage,
    incident.aiAnalysis,
    incident.resolutionNotes
  );
  res.json({ draft });
});
