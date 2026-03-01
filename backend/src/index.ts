import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { api } from './routes.js';
import { db } from './db.js';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api', api);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', db: db ? 'connected' : 'error' });
});

const PORT = process.env.PORT ?? 3001;
app.listen(PORT, () => {
  console.log(`Incident Response Agent API listening on http://localhost:${PORT}`);
});
