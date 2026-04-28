# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # node server.js — no build step
```

## Environment variables (`.env`)

```
GROQ_API_KEY=
STRIPE_SECRET_KEY=        # Optional — enables card payments
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
BASE_URL=http://localhost:3000
PORT=3000
SMTP_HOST=                # Optional — email notifications
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
NOTIFY_EMAIL=             # Where to send reserva/order alerts
```

## Architecture

**Backend** — Node.js + Express, ES modules. Entry point is `server.js` (~50 lines), which mounts 4 route modules.

```
server.js           Entry point: helmet CSP, stripe webhook, mount routes
routes/
  public.js         GET /api/config, POST /api/suscribir
  chat.js           POST /chat — Groq tool calling (submit_reserva)
  orders.js         POST /api/pedido, GET /api/stripe-key
  admin.js          All /admin/* endpoints + photo upload
middleware/
  auth.js           Argon2 password verification + auto-migration from bcrypt
  rateLimiter.js    chatLimiter (20/min), ordersLimiter (10/min)
utils/
  config.js         getConfig() / saveConfig() — in-memory cache over config.json
  email.js          Nodemailer: notifyReserva(), notifyOrder() — silent if SMTP not set
  hours.js          isOpen(horario) — parses horario string, returns boolean
db/
  database.js       better-sqlite3, WAL mode, runs schema.sql on startup
  schema.sql        Tables: reservas, orders, clients
data/
  restaurante.db    SQLite database (git-ignored)
config.json         Restaurant settings + admin_password (argon2 hash)
public/uploads/     Dish photos uploaded via /admin/plato/foto
```

**Frontend** — Vanilla JS, no bundler. CDN libraries loaded in index.html:
- GSAP + ScrollTrigger (cdnjs) — scroll-triggered animations
- Lenis (unpkg) — smooth scroll, synced with GSAP ticker
- Three.js (unpkg) — WebGL background (red/yellow particles + torus rings)

**Design system** (`style.css`):
- Font: Fraunces (serif headings) + Inter (body)
- Palette: `--black #0d0d0d`, `--red #e63946`, `--yellow #ffd60a`, `--cream #f1faee`
- Hero: 55/45 asymmetric split grid; left = content, right = Three.js canvas
- Carta: tabbed (Entrantes / Principales / Postres) with card grid

**Admin panel** (`admin.html`) — standalone SPA with 7 tabs: Información, Carta, Nosotros, Reservas, Pedidos, Clientes, Contraseña. Password sent in every POST body, verified server-side with Argon2.

## Key patterns

**Auth** — No sessions. Every `/admin/*` route calls `authMiddleware` which runs `authCheck()`. First login after upgrade auto-migrates bcrypt hash to Argon2.

**Opening hours enforcement** — `isOpen()` in `utils/hours.js` is called before accepting reservations (chat tool call) and orders. If closed, returns 400 with horario info.

**Email notifications** — `notifyReserva()` / `notifyOrder()` fail silently if `NOTIFY_EMAIL` or SMTP vars are missing. Never blocks the main flow.

**Photo uploads** — Multer writes to `public/uploads/`. Filename is the multer-generated hash. URL stored as `foto` field in each `carta[tipo][i]` object in `config.json`.

**Stripe webhook** — Registered before `express.json()` to receive raw body. Updates order estado to `'pagado'` on `checkout.session.completed`.

**CSP** — Configured in `server.js` helmet call. Allows cdnjs, unpkg, cdn.jsdelivr.net for GSAP/Lenis/Three.js. Do not set `unsafe-eval`.
