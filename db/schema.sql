CREATE TABLE IF NOT EXISTS reservas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  fecha TEXT NOT NULL,
  hora TEXT NOT NULL,
  personas INTEGER NOT NULL,
  nota TEXT,
  estado TEXT DEFAULT 'pendiente',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_nombre TEXT NOT NULL,
  cliente_email TEXT NOT NULL,
  cliente_telefono TEXT,
  tipo TEXT NOT NULL,
  direccion TEXT,
  pago TEXT NOT NULL,
  stripe_session_id TEXT,
  estado TEXT DEFAULT 'pendiente',
  items TEXT NOT NULL,
  total REAL NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  nombre TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
