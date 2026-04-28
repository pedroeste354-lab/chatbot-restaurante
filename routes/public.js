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

publicRouter.get('/api/resenas/:plato', (req, res) => {
  const resenas = db.prepare('SELECT * FROM resenas WHERE plato = ? ORDER BY created_at DESC LIMIT 30').all(req.params.plato);
  const avg = resenas.length ? (resenas.reduce((s, r) => s + r.estrellas, 0) / resenas.length).toFixed(1) : null;
  res.json({ resenas, media: avg, total: resenas.length });
});

const resenaSchema = z.object({
  plato: z.string().min(1).max(100),
  autor: z.string().min(1).max(80),
  estrellas: z.number().int().min(1).max(5),
  comentario: z.string().max(500).optional(),
});

publicRouter.post('/api/resena', (req, res) => {
  const result = resenaSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: 'Datos inválidos' });
  const { plato, autor, estrellas, comentario } = result.data;
  db.prepare('INSERT INTO resenas (plato, autor, estrellas, comentario) VALUES (?, ?, ?, ?)').run(plato, autor, estrellas, comentario || null);
  res.json({ ok: true });
});
