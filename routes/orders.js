import { Router } from 'express';
import { z } from 'zod';
import Stripe from 'stripe';
import db from '../db/database.js';
import { getConfig } from '../utils/config.js';
import { isOpen } from '../utils/hours.js';
import { notifyOrder } from '../utils/email.js';
import { ordersLimiter } from '../middleware/rateLimiter.js';

export const ordersRouter = Router();

ordersRouter.get('/api/stripe-key', (req, res) => {
  res.json({ key: process.env.STRIPE_PUBLISHABLE_KEY || null });
});

const pedidoSchema = z.object({
  cliente_nombre: z.string().min(1).max(100),
  cliente_email: z.string().email(),
  cliente_telefono: z.string().max(20).optional(),
  tipo: z.enum(['domicilio', 'recogida']),
  direccion: z.string().max(200).optional(),
  pago: z.enum(['stripe', 'efectivo', 'contrarembolso']),
  items: z.array(z.object({
    nombre: z.string(),
    precio: z.string(),
    cantidad: z.number().int().positive(),
  })).min(1),
  total: z.number().positive(),
});

ordersRouter.post('/api/pedido', ordersLimiter, async (req, res) => {
  const result = pedidoSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: 'Datos del pedido inválidos' });

  const data = result.data;
  const config = getConfig();

  if (!isOpen(config.horario)) {
    return res.status(400).json({
      error: `El restaurante está cerrado ahora. Horario: ${config.horario}`,
    });
  }

  if (data.pago === 'stripe') {
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(400).json({ error: 'Pagos online no disponibles' });
    }
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: data.items.map(item => ({
        price_data: {
          currency: 'eur',
          product_data: { name: item.nombre },
          unit_amount: Math.round(parseFloat(item.precio.replace(',', '.')) * 100),
        },
        quantity: item.cantidad,
      })),
      mode: 'payment',
      success_url: `${process.env.BASE_URL}/?pedido=ok`,
      cancel_url: `${process.env.BASE_URL}/?pedido=cancelado`,
    });

    db.prepare(
      'INSERT INTO orders (cliente_nombre, cliente_email, cliente_telefono, tipo, direccion, pago, stripe_session_id, items, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(data.cliente_nombre, data.cliente_email, data.cliente_telefono || null, data.tipo, data.direccion || null, 'stripe', session.id, JSON.stringify(data.items), data.total);

    return res.json({ url: session.url });
  }

  const info = db.prepare(
    'INSERT INTO orders (cliente_nombre, cliente_email, cliente_telefono, tipo, direccion, pago, items, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(data.cliente_nombre, data.cliente_email, data.cliente_telefono || null, data.tipo, data.direccion || null, data.pago, JSON.stringify(data.items), data.total);

  notifyOrder({ ...data, id: info.lastInsertRowid, items: JSON.stringify(data.items) }).catch(() => {});

  res.json({ ok: true });
});
