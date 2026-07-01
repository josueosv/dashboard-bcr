// server.js — Servidor principal
import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import pgSession from 'connect-pg-simple';
import pkg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pkg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway') || process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
});

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const PgStore = pgSession(session);
app.use(session({
  store: new PgStore({ pool, createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET || 'cambia-este-secreto',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 8, httpOnly: true } // 8h
}));

// ---------- Helpers ----------
async function getData() {
  const { rows } = await pool.query('SELECT data, updated_at FROM dashboard WHERE id = 1');
  return rows[0] || null;
}

function requireAuth(req, res, next) {
  if (req.session?.authed) return next();
  return res.redirect('/admin/login');
}

// ---------- API pública ----------
app.get('/api/data', async (req, res) => {
  try {
    const row = await getData();
    if (!row) return res.status(404).json({ error: 'Sin datos. Ejecuta init-db.' });
    res.json({ ...row.data, updated_at: row.updated_at });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

// ---------- API protegida (guardar) ----------
app.post('/api/data', requireAuth, async (req, res) => {
  try {
    const data = req.body;
    if (!data || typeof data !== 'object') return res.status(400).json({ error: 'Payload inválido' });
    await pool.query(
      'UPDATE dashboard SET data = $1, updated_at = now() WHERE id = 1',
      [JSON.stringify(data)]
    );
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'No se pudo guardar' });
  }
});

// ---------- Auth ----------
app.post('/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    req.session.authed = true;
    return res.json({ ok: true });
  }
  return res.status(401).json({ error: 'Contraseña incorrecta' });
});

app.post('/admin/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get('/admin/session', (req, res) => {
  res.json({ authed: !!req.session?.authed });
});

// ---------- Vistas ----------
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/admin/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => console.log(`Dashboard corriendo en puerto ${PORT}`));
