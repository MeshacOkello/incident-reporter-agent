import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });
const dbPath = process.env.TEST_DB ? ':memory:' : path.join(dataDir, 'incidents.db');

export const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS incidents (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    status TEXT NOT NULL,
    severity TEXT NOT NULL,
    service TEXT NOT NULL,
    alert_message TEXT NOT NULL,
    alert_source TEXT NOT NULL,
    alert_payload TEXT,
    deployments TEXT,
    commits TEXT,
    metrics_summary TEXT,
    ai_analysis TEXT,
    slack_summary TEXT,
    suggested_actions TEXT,
    resolved_at TEXT,
    resolution_notes TEXT,
    postmortem TEXT,
    action_items TEXT
  )
`);
