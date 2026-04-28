import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import Stripe from 'stripe';
import { publicRouter } from './routes/public.js';
import { chatRouter } from './routes/chat.js';
import { ordersRouter } from './routes/orders.js';
import { adminRouter } from './routes/admin.js';
import db from './db/database.js';

const app = express();

// Stripe webhook — raw body required before express.json()
app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) return res.sendStatus(400);
  let event;
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return res.sendStatus(400);
  }
  if (event.type === 'checkout.session.completed') {
    const sessionId = event.data.object.id;
    db.prepare("UPDATE orders SET estado = 'pagado' WHERE stripe_session_id = ?").run(sessionId);
  }
  res.sendStatus(200);
});

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "unpkg.com", "cdnjs.cloudflare.com", "cdn.jsdelivr.net"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com", "cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      frameSrc: ["https:"],
      connectSrc: ["'self'", "unpkg.com", "cdnjs.cloudflare.com"],
      workerSrc: ["'self'", "blob:"],
    },
  },
}));

app.use(express.json());
app.use(express.static('public'));

app.use(publicRouter);
app.use(chatRouter);
app.use(ordersRouter);
app.use(adminRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));
