import { Router } from 'express';
import { z } from 'zod';
import argon2 from 'argon2';
import multer from 'multer';
import { extname, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import db from '../db/database.js';
import { getConfig, saveConfig } from '../utils/config.js';
import { authMiddleware, authCheck } from '../middleware/auth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const adminRouter = Router();

const upload = multer({
  dest: join(__dirname, '..', 'public', 'uploads'),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    cb(null, allowed.includes(extname(file.originalname).toLowerCase()));
  },
});

adminRouter.post('/admin/verify', async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Contraseña requerida' });
  const valid = await authCheck(password);
  res.json({ ok: valid });
});

adminRouter.post('/admin/save', authMiddleware, (req, res) => {
  const config = getConfig();
  const allowed = ['nombre', 'direccion', 'telefono', 'whatsapp', 'horario', 'precio_medio', 'cocina', 'parking', 'terraza', 'google_maps_embed', 'menu_dia', 'carta', 'nosotros', 'anos', 'valoracion', 'num_valoraciones', 'carta_pdf', 'instagram', 'tiktok', 'facebook', 'report_email', 'report_hora', 'hero_foto', 'logo_url'];
  for (const key of allowed) {
    if (req.body[key] !== undefined) config[key] = req.body[key];
  }
  saveConfig(config);
  res.json({ ok: true });
});

const passwordSchema = z.object({
  password: z.string(),
  nueva: z.string().min(8),
  repetir: z.string(),
}).refine(d => d.nueva === d.repetir, { message: 'Las contraseñas no coinciden' });

adminRouter.post('/admin/password', async (req, res) => {
  const result = passwordSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.errors[0].message });
  const { password, nueva } = result.data;
  const valid = await authCheck(password);
  if (!valid) return res.status(401).json({ error: 'Contraseña actual incorrecta' });
  const config = getConfig();
  config.admin_password = await argon2.hash(nueva);
  saveConfig(config);
  res.json({ ok: true });
});

adminRouter.post('/admin/reservas', authMiddleware, (req, res) => {
  const reservas = db.prepare('SELECT * FROM reservas ORDER BY created_at DESC').all();
  res.json(reservas);
});

adminRouter.post('/admin/reservas/estado', authMiddleware, (req, res) => {
  const { id, estado } = req.body;
  if (!id || !estado) return res.status(400).json({ error: 'Faltan datos' });
  db.prepare('UPDATE reservas SET estado = ? WHERE id = ?').run(estado, id);
  res.json({ ok: true });
});

adminRouter.post('/admin/pedidos', authMiddleware, (req, res) => {
  const orders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all();
  res.json(orders.map(o => ({ ...o, items: JSON.parse(o.items) })));
});

adminRouter.post('/admin/pedidos/estado', authMiddleware, (req, res) => {
  const { id, estado } = req.body;
  if (!id || !estado) return res.status(400).json({ error: 'Faltan datos' });
  db.prepare('UPDATE orders SET estado = ? WHERE id = ?').run(estado, id);
  res.json({ ok: true });
});

adminRouter.post('/admin/clientes', authMiddleware, (req, res) => {
  const clients = db.prepare('SELECT * FROM clients ORDER BY created_at DESC').all();
  res.json(clients);
});

adminRouter.post('/admin/plato/foto', authMiddleware, upload.single('foto'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió imagen' });
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
});
