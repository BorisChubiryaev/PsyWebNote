/**
 * PsyWebNote — Vercel Serverless API
 * 
 * This file handles ALL API routes as a single serverless function.
 * Vercel routes /api/* requests here via vercel.json rewrites.
 * 
 * Uses: better-sqlite3 (persistent on Vercel via /tmp), bcryptjs, jsonwebtoken
 */

const { createServer } = require('http');

// ── Simple Router ───────────────────────────────────────────

function parseBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString()));
      } catch {
        resolve({});
      }
    });
  });
}

function parseCookies(req) {
  const cookies = {};
  const header = req.headers.cookie || '';
  header.split(';').forEach((c) => {
    const [key, ...val] = c.trim().split('=');
    if (key) cookies[key] = val.join('=');
  });
  return cookies;
}

function setCookie(res, name, value, options = {}) {
  const parts = [`${name}=${value}`];
  if (options.httpOnly) parts.push('HttpOnly');
  if (options.secure) parts.push('Secure');
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  if (options.path) parts.push(`Path=${options.path}`);
  if (options.maxAge) parts.push(`Max-Age=${options.maxAge}`);
  const existing = res.getHeader('Set-Cookie') || [];
  const arr = Array.isArray(existing) ? existing : existing ? [existing] : [];
  arr.push(parts.join('; '));
  res.setHeader('Set-Cookie', arr);
}

function json(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function error(res, message, status = 400) {
  json(res, { error: message }, status);
}

// ── Lightweight JWT (no external dependency for serverless cold starts) ──

const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'psywebnote-jwt-secret-dev-2024';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'psywebnote-refresh-secret-dev-2024';

function base64url(str) {
  return Buffer.from(str).toString('base64url');
}

function createJWT(payload, secret, expiresInSec) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const body = base64url(JSON.stringify({ ...payload, iat: now, exp: now + expiresInSec }));
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyJWT(token, secret) {
  try {
    const [header, body, signature] = token.split('.');
    const expected = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
    if (signature !== expected) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// ── Password Hashing (simple, no bcrypt dependency) ─────────

function hashPasswordSync(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPasswordSync(password, stored) {
  const [salt, hash] = stored.split(':');
  const computed = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return computed === hash;
}

// ── In-Memory Database (for Vercel serverless — no filesystem) ──
// NOTE: Data persists only during the serverless function's lifetime.
// For production, use a real database (Supabase, PlanetScale, Neon, etc.)

const db = {
  users: new Map(),
  clients: new Map(),
  sessions: new Map(),
  appointments: new Map(),
  refreshTokens: new Map(),
};

// ── Auth Middleware ──────────────────────────────────────────

function authenticate(req) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  const payload = verifyJWT(token, JWT_SECRET);
  return payload ? payload.userId : null;
}

// ── Route Handler ───────────────────────────────────────────

module.exports = async function handler(req, res) {
  // CORS
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname.replace(/^\/api/, '').replace(/\/$/, '') || '/';
  const method = req.method;
  const cookies = parseCookies(req);

  // ── Auth Routes ─────────────────────────────────────────

  if (path === '/auth/register' && method === 'POST') {
    const body = await parseBody(req);
    const { email, password, name } = body;

    if (!email || !password || !name) {
      return error(res, 'Заполните все поля', 400);
    }

    // Check if email exists
    for (const [, user] of db.users) {
      if (user.email === email) {
        return error(res, 'Пользователь с таким email уже существует', 409);
      }
    }

    const userId = crypto.randomUUID();
    const passwordHash = hashPasswordSync(password);

    const user = {
      id: userId,
      email,
      name,
      passwordHash,
      therapyType: '',
      hourlyRate: 5000,
      currency: '₽',
      bio: '',
      phone: '',
      workingHours: { start: '09:00', end: '18:00' },
      workingDays: [1, 2, 3, 4, 5],
      packages: [],
      createdAt: new Date().toISOString(),
    };

    db.users.set(userId, user);

    const accessToken = createJWT({ userId }, JWT_SECRET, 900); // 15 min
    const refreshToken = createJWT({ userId }, JWT_REFRESH_SECRET, 604800); // 7 days

    db.refreshTokens.set(refreshToken, { userId, createdAt: Date.now() });

    setCookie(res, 'refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      path: '/',
      maxAge: 604800,
    });

    const { passwordHash: _, ...safeUser } = user;
    return json(res, { user: safeUser, accessToken }, 201);
  }

  if (path === '/auth/login' && method === 'POST') {
    const body = await parseBody(req);
    const { email, password } = body;

    if (!email || !password) {
      return error(res, 'Заполните все поля', 400);
    }

    let foundUser = null;
    for (const [, user] of db.users) {
      if (user.email === email) {
        foundUser = user;
        break;
      }
    }

    if (!foundUser || !verifyPasswordSync(password, foundUser.passwordHash)) {
      return error(res, 'Неверный email или пароль', 401);
    }

    const accessToken = createJWT({ userId: foundUser.id }, JWT_SECRET, 900);
    const refreshToken = createJWT({ userId: foundUser.id }, JWT_REFRESH_SECRET, 604800);

    db.refreshTokens.set(refreshToken, { userId: foundUser.id, createdAt: Date.now() });

    setCookie(res, 'refreshToken', refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      path: '/',
      maxAge: 604800,
    });

    const { passwordHash: _, ...safeUser } = foundUser;
    return json(res, { user: safeUser, accessToken });
  }

  if (path === '/auth/refresh' && method === 'POST') {
    const token = cookies.refreshToken;
    if (!token) return error(res, 'No refresh token', 401);

    const stored = db.refreshTokens.get(token);
    if (!stored) return error(res, 'Invalid refresh token', 401);

    const payload = verifyJWT(token, JWT_REFRESH_SECRET);
    if (!payload) {
      db.refreshTokens.delete(token);
      return error(res, 'Expired refresh token', 401);
    }

    // Rotate tokens
    db.refreshTokens.delete(token);
    const newAccess = createJWT({ userId: stored.userId }, JWT_SECRET, 900);
    const newRefresh = createJWT({ userId: stored.userId }, JWT_REFRESH_SECRET, 604800);
    db.refreshTokens.set(newRefresh, { userId: stored.userId, createdAt: Date.now() });

    setCookie(res, 'refreshToken', newRefresh, {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      path: '/',
      maxAge: 604800,
    });

    const user = db.users.get(stored.userId);
    if (!user) return error(res, 'User not found', 404);

    const { passwordHash: _, ...safeUser } = user;
    return json(res, { user: safeUser, accessToken: newAccess });
  }

  if (path === '/auth/logout' && method === 'POST') {
    const token = cookies.refreshToken;
    if (token) db.refreshTokens.delete(token);
    setCookie(res, 'refreshToken', '', { path: '/', maxAge: 0 });
    return json(res, { ok: true });
  }

  // ── Protected Routes (require auth) ────────────────────

  const userId = authenticate(req);
  if (!userId) return error(res, 'Unauthorized', 401);

  // Profile
  if (path === '/profile' && method === 'GET') {
    const user = db.users.get(userId);
    if (!user) return error(res, 'User not found', 404);
    const { passwordHash: _, ...safeUser } = user;
    return json(res, { user: safeUser });
  }

  if (path === '/profile' && method === 'PUT') {
    const body = await parseBody(req);
    const user = db.users.get(userId);
    if (!user) return error(res, 'User not found', 404);

    const updated = { ...user, ...body };
    delete updated.passwordHash; // don't overwrite hash from frontend
    updated.passwordHash = user.passwordHash; // keep original
    db.users.set(userId, updated);

    const { passwordHash: _, ...safeUser } = updated;
    return json(res, { user: safeUser });
  }

  // Clients
  if (path === '/clients' && method === 'GET') {
    const clients = [];
    for (const [, c] of db.clients) {
      if (c.userId === userId) clients.push(c);
    }
    return json(res, { clients });
  }

  if (path === '/clients' && method === 'POST') {
    const body = await parseBody(req);
    const client = { ...body, userId, id: body.id || crypto.randomUUID() };
    db.clients.set(client.id, client);
    return json(res, { client }, 201);
  }

  const clientMatch = path.match(/^\/clients\/([^/]+)$/);
  if (clientMatch && method === 'PUT') {
    const id = clientMatch[1];
    const existing = db.clients.get(id);
    if (!existing || existing.userId !== userId) return error(res, 'Not found', 404);
    const body = await parseBody(req);
    const updated = { ...existing, ...body };
    db.clients.set(id, updated);
    return json(res, { client: updated });
  }

  if (clientMatch && method === 'DELETE') {
    const id = clientMatch[1];
    const existing = db.clients.get(id);
    if (!existing || existing.userId !== userId) return error(res, 'Not found', 404);
    db.clients.delete(id);
    // Also delete related sessions and appointments
    for (const [sid, s] of db.sessions) {
      if (s.clientId === id && s.userId === userId) db.sessions.delete(sid);
    }
    for (const [aid, a] of db.appointments) {
      if (a.clientId === id && a.userId === userId) db.appointments.delete(aid);
    }
    return json(res, { ok: true });
  }

  // Sessions
  if (path === '/sessions' && method === 'GET') {
    const clientId = url.searchParams.get('clientId');
    const sessions = [];
    for (const [, s] of db.sessions) {
      if (s.userId !== userId) continue;
      if (clientId && s.clientId !== clientId) continue;
      sessions.push(s);
    }
    return json(res, { sessions });
  }

  if (path === '/sessions' && method === 'POST') {
    const body = await parseBody(req);
    const session = { ...body, userId, id: body.id || crypto.randomUUID() };
    db.sessions.set(session.id, session);
    return json(res, { session }, 201);
  }

  const sessionMatch = path.match(/^\/sessions\/([^/]+)$/);
  if (sessionMatch && method === 'PUT') {
    const id = sessionMatch[1];
    const existing = db.sessions.get(id);
    if (!existing || existing.userId !== userId) return error(res, 'Not found', 404);
    const body = await parseBody(req);
    const updated = { ...existing, ...body };
    db.sessions.set(id, updated);
    return json(res, { session: updated });
  }

  if (sessionMatch && method === 'DELETE') {
    const id = sessionMatch[1];
    const existing = db.sessions.get(id);
    if (!existing || existing.userId !== userId) return error(res, 'Not found', 404);
    db.sessions.delete(id);
    return json(res, { ok: true });
  }

  // Appointments
  if (path === '/appointments' && method === 'GET') {
    const appointments = [];
    for (const [, a] of db.appointments) {
      if (a.userId === userId) appointments.push(a);
    }
    return json(res, { appointments });
  }

  if (path === '/appointments' && method === 'POST') {
    const body = await parseBody(req);
    const appointment = { ...body, userId, id: body.id || crypto.randomUUID() };
    db.appointments.set(appointment.id, appointment);
    return json(res, { appointment }, 201);
  }

  const aptMatch = path.match(/^\/appointments\/([^/]+)$/);
  if (aptMatch && method === 'PUT') {
    const id = aptMatch[1];
    const existing = db.appointments.get(id);
    if (!existing || existing.userId !== userId) return error(res, 'Not found', 404);
    const body = await parseBody(req);
    const updated = { ...existing, ...body };
    db.appointments.set(id, updated);
    return json(res, { appointment: updated });
  }

  if (aptMatch && method === 'DELETE') {
    const id = aptMatch[1];
    const existing = db.appointments.get(id);
    if (!existing || existing.userId !== userId) return error(res, 'Not found', 404);
    db.appointments.delete(id);
    return json(res, { ok: true });
  }

  // Stats
  if (path === '/stats' && method === 'GET') {
    let totalSessions = 0;
    let totalRevenue = 0;
    let totalClients = 0;

    for (const [, c] of db.clients) {
      if (c.userId === userId) totalClients++;
    }
    for (const [, s] of db.sessions) {
      if (s.userId === userId && s.status === 'completed') {
        totalSessions++;
        totalRevenue += s.amount || 0;
      }
    }

    return json(res, { stats: { totalClients, totalSessions, totalRevenue } });
  }

  // Batch sync
  if (path === '/batch' && method === 'POST') {
    const body = await parseBody(req);

    if (body.clients) {
      for (const c of body.clients) {
        db.clients.set(c.id, { ...c, userId });
      }
    }
    if (body.sessions) {
      for (const s of body.sessions) {
        db.sessions.set(s.id, { ...s, userId });
      }
    }
    if (body.appointments) {
      for (const a of body.appointments) {
        db.appointments.set(a.id, { ...a, userId });
      }
    }

    return json(res, { ok: true });
  }

  // 404
  return error(res, 'Not found', 404);
};
