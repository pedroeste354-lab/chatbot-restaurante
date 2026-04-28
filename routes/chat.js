import { Router } from 'express';
import { z } from 'zod';
import Groq from 'groq-sdk';
import db from '../db/database.js';
import { getConfig } from '../utils/config.js';
import { isOpen } from '../utils/hours.js';
import { notifyReserva } from '../utils/email.js';
import { chatLimiter } from '../middleware/rateLimiter.js';

export const chatRouter = Router();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const tools = [
  {
    type: 'function',
    function: {
      name: 'submit_reserva',
      description: 'Registra una reserva de mesa cuando el usuario ha confirmado todos los datos',
      parameters: {
        type: 'object',
        properties: {
          nombre: { type: 'string' },
          fecha: { type: 'string' },
          hora: { type: 'string' },
          personas: { type: 'number' },
          nota: { type: 'string' },
        },
        required: ['nombre', 'fecha', 'hora', 'personas'],
      },
    },
  },
];

function buildSystemPrompt(config) {
  const carta = config.carta || {};
  const platos = [
    ...(carta.entrantes || []).map(p => `Entrante: ${p.nombre} ${p.precio}`),
    ...(carta.principales || []).map(p => `Principal: ${p.nombre} ${p.precio}`),
    ...(carta.postres || []).map(p => `Postre: ${p.nombre} ${p.precio}`),
  ].join('\n');

  return `Eres el asistente virtual de ${config.nombre}, un restaurante.
Dirección: ${config.direccion}
Teléfono: ${config.telefono}
WhatsApp: ${config.whatsapp}
Horario: ${config.horario}
Precio medio: ${config.precio_medio}
Cocina: ${config.cocina}
${config.terraza ? 'Tiene terraza.' : ''}
${config.parking ? `Parking: ${config.parking}` : ''}

CARTA:
${platos || 'Sin carta disponible'}

Menú del día: ${config.menu_dia?.precio || ''} — ${config.menu_dia?.descripcion || ''} (${config.menu_dia?.dias || ''})

Responde en español, de forma amigable y concisa. Para reservas, recoge: nombre, fecha, hora y número de personas. Llama a submit_reserva solo cuando tengas todos los datos confirmados.`;
}

const messageSchema = z.object({
  message: z.string().min(1).max(2000),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).max(20).default([]),
});

chatRouter.post('/chat', chatLimiter, async (req, res) => {
  const result = messageSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: 'Mensaje inválido' });

  const { message, history } = result.data;
  const config = getConfig();

  const messages = [
    { role: 'system', content: buildSystemPrompt(config) },
    ...history,
    { role: 'user', content: message },
  ];

  try {
    const response = await groq.chat.completions.create({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages,
      tools,
      tool_choice: 'auto',
      max_tokens: 500,
    });

    const choice = response.choices[0];

    if (choice.finish_reason === 'tool_calls') {
      const toolCall = choice.message.tool_calls[0];
      if (toolCall.function.name === 'submit_reserva') {
        const args = JSON.parse(toolCall.function.arguments);

        if (!isOpen(config.horario)) {
          return res.json({
            reply: `Lo siento, el restaurante está cerrado ahora mismo. Horario: ${config.horario}. Por favor intenta reservar en horario de apertura.`,
          });
        }

        const stmt = db.prepare(
          'INSERT INTO reservas (nombre, fecha, hora, personas, nota) VALUES (?, ?, ?, ?, ?)'
        );
        const info = stmt.run(args.nombre, args.fecha, args.hora, args.personas, args.nota || null);

        notifyReserva({ ...args, id: info.lastInsertRowid }).catch(() => {});

        return res.json({
          reply: `¡Reserva confirmada! Mesa para ${args.personas} personas el ${args.fecha} a las ${args.hora}. Te esperamos, ${args.nombre}. Si necesitas cambios, llámanos al ${config.telefono} o escríbenos por WhatsApp al ${config.whatsapp}.`,
        });
      }
    }

    res.json({ reply: choice.message.content });
  } catch (err) {
    console.error('Chat error:', err);
    res.status(500).json({ error: 'Error al procesar tu mensaje' });
  }
});
