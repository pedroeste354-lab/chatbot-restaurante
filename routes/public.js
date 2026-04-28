import { Router } from 'express';
import { z } from 'zod';
import db from '../db/database.js';
import { getConfig } from '../utils/config.js';

export const publicRouter = Router();

publicRouter.get('/api/config', (req, res) => {
  const config = { ...getConfig() };
  delete config.admin_password;
  res.json(config);
});

const suscribirSchema = z.object({
  email: z.string().email(),
  nombre: z.string().max(100).optional(),
});

publicRouter.post('/api/suscribir', (req, res) => {
  const result = suscribirSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: 'Email inválido' });
  const { email, nombre } = result.data;
  try {
    db.prepare('INSERT OR IGNORE INTO clients (email, nombre) VALUES (?, ?)').run(email, nombre || null);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Error al suscribir' });
  }
});
