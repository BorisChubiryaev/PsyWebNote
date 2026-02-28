/**
 * PsyWebNote — API Routes
 *
 * All endpoints are prefixed with /api
 * Data isolation: every query is scoped by user_id from JWT
 *
 * Auth: POST /auth/register, /auth/login, /auth/refresh, /auth/logout
 * Profile: GET/PUT /profile
 * Clients: CRUD /clients
 * Sessions: CRUD /sessions
 * Appointments: CRUD /appointments
 * Batch: POST /batch
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { stmts, mappers, batchInsertClients, batchInsertSessions, batchInsertAppointments } = require('./db');

const router = express.Router();

// ── Config ──────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET || 'psywebnote-dev-secret-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'psywebnote-refresh-secret-change-in-production';
const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_DAYS = 7;

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  maxAge: REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
  path: '/',
};

// ── Helpers ─────────────────────────────────────────────────

function generateAccessToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

function generateRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function sanitize(str) {
  if (typeof str !== 'string') return str;
  return str.trim().slice(0, 10000); // limit length
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sendError(res, status, message) {
  return res.status(status).json({ error: message });
}

// ── Auth Middleware ──────────────────────────────────────────

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 401, 'Токен авторизации не предоставлен');
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;

    // Verify user exists
    const user = stmts.getUserById.get(decoded.userId);
    if (!user) return sendError(res, 401, 'Пользователь не найден');

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return sendError(res, 401, 'Токен истёк');
    }
    return sendError(res, 401, 'Недействительный токен');
  }
}

// ── Auth Routes ─────────────────────────────────────────────

router.post('/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validation
    if (!email || !password || !name) {
      return sendError(res, 400, 'Email, пароль и имя обязательны');
    }
    if (!validateEmail(email)) {
      return sendError(res, 400, 'Некорректный email');
    }
    if (password.length < 6) {
      return sendError(res, 400, 'Пароль должен содержать минимум 6 символов');
    }
    if (name.trim().length < 2) {
      return sendError(res, 400, 'Имя должно содержать минимум 2 символа');
    }

    // Check duplicate
    const existing = stmts.getUserByEmail.get(email);
    if (existing) {
      return sendError(res, 409, 'Пользователь с таким email уже существует');
    }

    // Create user
    const userId = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const defaultPackages = JSON.stringify([
      { id: '1', name: 'Базовый', sessions: 4, price: 20000, discount: 10 },
      { id: '2', name: 'Стандарт', sessions: 8, price: 36000, discount: 15 },
      { id: '3', name: 'Премиум', sessions: 12, price: 48000, discount: 20 },
    ]);

    stmts.createUser.run({
      id: userId,
      email: sanitize(email),
      password_hash: passwordHash,
      name: sanitize(name),
      therapy_type: 'Когнитивно-поведенческая терапия (КПТ)',
      hourly_rate: 5000,
      currency: '₽',
      bio: '',
      phone: '',
      working_hours_start: '09:00',
      working_hours_end: '18:00',
      working_days: '[1,2,3,4,5]',
      packages: defaultPackages,
    });

    // Generate tokens
    const accessToken = generateAccessToken(userId);
    const refreshToken = generateRefreshToken();
    const refreshHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000).toISOString();

    stmts.createRefreshToken.run({
      id: crypto.randomUUID(),
      user_id: userId,
      token_hash: refreshHash,
      expires_at: expiresAt,
    });

    // Set refresh token cookie
    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

    // Return user + access token
    const user = stmts.getUserById.get(userId);
    res.status(201).json({
      user: mappers.userToFrontend(user),
      accessToken,
    });
  } catch (err) {
    console.error('Register error:', err);
    sendError(res, 500, 'Ошибка регистрации');
  }
});

router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, 400, 'Email и пароль обязательны');
    }

    const user = stmts.getUserByEmail.get(email);
    if (!user) {
      return sendError(res, 401, 'Неверный email или пароль');
    }

    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      return sendError(res, 401, 'Неверный email или пароль');
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken();
    const refreshHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000).toISOString();

    // Remove old refresh tokens for this user (limit to 5 sessions)
    const existingTokens = stmts.deleteUserRefreshTokens.run(user.id);
    stmts.createRefreshToken.run({
      id: crypto.randomUUID(),
      user_id: user.id,
      token_hash: refreshHash,
      expires_at: expiresAt,
    });

    res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS);

    res.json({
      user: mappers.userToFrontend(user),
      accessToken,
    });
  } catch (err) {
    console.error('Login error:', err);
    sendError(res, 500, 'Ошибка входа');
  }
});

router.post('/auth/refresh', (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return sendError(res, 401, 'Refresh token отсутствует');
    }

    const tokenHash = hashToken(refreshToken);
    const stored = stmts.getRefreshToken.get(tokenHash);
    if (!stored) {
      return sendError(res, 401, 'Недействительный refresh token');
    }

    // Verify user exists
    const user = stmts.getUserById.get(stored.user_id);
    if (!user) {
      stmts.deleteRefreshToken.run(tokenHash);
      return sendError(res, 401, 'Пользователь не найден');
    }

    // Rotate refresh token (security best practice)
    stmts.deleteRefreshToken.run(tokenHash);
    const newRefreshToken = generateRefreshToken();
    const newHash = hashToken(newRefreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000).toISOString();

    stmts.createRefreshToken.run({
      id: crypto.randomUUID(),
      user_id: user.id,
      token_hash: newHash,
      expires_at: expiresAt,
    });

    const accessToken = generateAccessToken(user.id);
    res.cookie('refreshToken', newRefreshToken, COOKIE_OPTIONS);

    res.json({
      accessToken,
      user: mappers.userToFrontend(user),
    });
  } catch (err) {
    console.error('Refresh error:', err);
    sendError(res, 500, 'Ошибка обновления токена');
  }
});

router.post('/auth/logout', authenticate, (req, res) => {
  try {
    // Remove all refresh tokens for user
    stmts.deleteUserRefreshTokens.run(req.userId);
    res.clearCookie('refreshToken', { ...COOKIE_OPTIONS, maxAge: 0 });
    res.json({ success: true });
  } catch (err) {
    console.error('Logout error:', err);
    sendError(res, 500, 'Ошибка выхода');
  }
});

// ── Profile Routes ──────────────────────────────────────────

router.get('/profile', authenticate, (req, res) => {
  const user = stmts.getUserById.get(req.userId);
  if (!user) return sendError(res, 404, 'Профиль не найден');
  res.json({ user: mappers.userToFrontend(user) });
});

router.put('/profile', authenticate, (req, res) => {
  try {
    const user = stmts.getUserById.get(req.userId);
    if (!user) return sendError(res, 404, 'Профиль не найден');

    const data = req.body;
    stmts.updateUser.run({
      id: req.userId,
      name: sanitize(data.name) || user.name,
      avatar: data.avatar !== undefined ? data.avatar : user.avatar,
      therapy_type: sanitize(data.therapyType) || user.therapy_type,
      hourly_rate: typeof data.hourlyRate === 'number' ? data.hourlyRate : user.hourly_rate,
      currency: data.currency || user.currency,
      bio: data.bio !== undefined ? sanitize(data.bio) : user.bio,
      phone: data.phone !== undefined ? sanitize(data.phone) : user.phone,
      working_hours_start: data.workingHours?.start || user.working_hours_start,
      working_hours_end: data.workingHours?.end || user.working_hours_end,
      working_days: data.workingDays ? JSON.stringify(data.workingDays) : user.working_days,
      packages: data.packages ? JSON.stringify(data.packages) : user.packages,
    });

    const updated = stmts.getUserById.get(req.userId);
    res.json({ user: mappers.userToFrontend(updated) });
  } catch (err) {
    console.error('Update profile error:', err);
    sendError(res, 500, 'Ошибка обновления профиля');
  }
});

// ── Client Routes ───────────────────────────────────────────

router.get('/clients', authenticate, (req, res) => {
  const rows = stmts.getClientsByUser.all(req.userId);
  res.json({ clients: rows.map(mappers.clientToFrontend) });
});

router.post('/clients', authenticate, (req, res) => {
  try {
    const data = req.body;
    if (!data.name || !data.name.trim()) {
      return sendError(res, 400, 'Имя клиента обязательно');
    }

    const clientId = data.id || crypto.randomUUID();
    stmts.createClient.run({
      id: clientId,
      user_id: req.userId,
      name: sanitize(data.name),
      phone: data.phone ? sanitize(data.phone) : null,
      email: data.email ? sanitize(data.email) : null,
      avatar: data.avatar || null,
      notes: data.notes ? sanitize(data.notes) : '',
      social_links: JSON.stringify(data.socialLinks || []),
      package_id: data.packageId || null,
      remaining_sessions: data.remainingSessions || 0,
      schedules: JSON.stringify(data.schedules || []),
      meeting_link: data.meetingLink || null,
      is_online: data.isOnline ? 1 : 0,
      status: data.status || 'active',
      created_at: data.createdAt || new Date().toISOString(),
    });

    const created = stmts.getClientById.get(clientId, req.userId);
    res.status(201).json({ client: mappers.clientToFrontend(created) });
  } catch (err) {
    console.error('Create client error:', err);
    sendError(res, 500, 'Ошибка создания клиента');
  }
});

router.get('/clients/:id', authenticate, (req, res) => {
  const client = stmts.getClientById.get(req.params.id, req.userId);
  if (!client) return sendError(res, 404, 'Клиент не найден');
  res.json({ client: mappers.clientToFrontend(client) });
});

router.put('/clients/:id', authenticate, (req, res) => {
  try {
    const existing = stmts.getClientById.get(req.params.id, req.userId);
    if (!existing) return sendError(res, 404, 'Клиент не найден');

    const data = req.body;
    stmts.updateClient.run({
      id: req.params.id,
      user_id: req.userId,
      name: data.name ? sanitize(data.name) : existing.name,
      phone: data.phone !== undefined ? (data.phone ? sanitize(data.phone) : null) : existing.phone,
      email: data.email !== undefined ? (data.email ? sanitize(data.email) : null) : existing.email,
      avatar: data.avatar !== undefined ? data.avatar : existing.avatar,
      notes: data.notes !== undefined ? sanitize(data.notes) : existing.notes,
      social_links: data.socialLinks ? JSON.stringify(data.socialLinks) : existing.social_links,
      package_id: data.packageId !== undefined ? (data.packageId || null) : existing.package_id,
      remaining_sessions: data.remainingSessions !== undefined ? data.remainingSessions : existing.remaining_sessions,
      schedules: data.schedules ? JSON.stringify(data.schedules) : existing.schedules,
      meeting_link: data.meetingLink !== undefined ? (data.meetingLink || null) : existing.meeting_link,
      is_online: data.isOnline !== undefined ? (data.isOnline ? 1 : 0) : existing.is_online,
      status: data.status || existing.status,
    });

    const updated = stmts.getClientById.get(req.params.id, req.userId);
    res.json({ client: mappers.clientToFrontend(updated) });
  } catch (err) {
    console.error('Update client error:', err);
    sendError(res, 500, 'Ошибка обновления клиента');
  }
});

router.delete('/clients/:id', authenticate, (req, res) => {
  try {
    const existing = stmts.getClientById.get(req.params.id, req.userId);
    if (!existing) return sendError(res, 404, 'Клиент не найден');

    stmts.deleteClient.run(req.params.id, req.userId);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete client error:', err);
    sendError(res, 500, 'Ошибка удаления клиента');
  }
});

// ── Session Routes ──────────────────────────────────────────

router.get('/sessions', authenticate, (req, res) => {
  const { clientId } = req.query;
  let rows;
  if (clientId) {
    rows = stmts.getSessionsByClient.all(req.userId, clientId);
  } else {
    rows = stmts.getSessionsByUser.all(req.userId);
  }
  res.json({ sessions: rows.map(mappers.sessionToFrontend) });
});

router.post('/sessions', authenticate, (req, res) => {
  try {
    const data = req.body;
    if (!data.clientId || !data.date || !data.time) {
      return sendError(res, 400, 'clientId, date и time обязательны');
    }

    // Verify client belongs to user
    const client = stmts.getClientById.get(data.clientId, req.userId);
    if (!client) return sendError(res, 404, 'Клиент не найден');

    const sessionId = data.id || crypto.randomUUID();
    stmts.createSession.run({
      id: sessionId,
      user_id: req.userId,
      client_id: data.clientId,
      date: data.date,
      time: data.time,
      duration: data.duration || 60,
      status: data.status || 'scheduled',
      notes: data.notes ? sanitize(data.notes) : '',
      mood: data.mood || null,
      topics: JSON.stringify(data.topics || []),
      homework: data.homework ? sanitize(data.homework) : null,
      next_session_goals: data.nextSessionGoals ? sanitize(data.nextSessionGoals) : null,
      is_paid: data.isPaid ? 1 : 0,
      amount: data.amount || 0,
    });

    const created = stmts.getSessionById.get(sessionId, req.userId);
    res.status(201).json({ session: mappers.sessionToFrontend(created) });
  } catch (err) {
    console.error('Create session error:', err);
    sendError(res, 500, 'Ошибка создания сессии');
  }
});

router.get('/sessions/:id', authenticate, (req, res) => {
  const session = stmts.getSessionById.get(req.params.id, req.userId);
  if (!session) return sendError(res, 404, 'Сессия не найдена');
  res.json({ session: mappers.sessionToFrontend(session) });
});

router.put('/sessions/:id', authenticate, (req, res) => {
  try {
    const existing = stmts.getSessionById.get(req.params.id, req.userId);
    if (!existing) return sendError(res, 404, 'Сессия не найдена');

    const data = req.body;
    stmts.updateSession.run({
      id: req.params.id,
      user_id: req.userId,
      date: data.date || existing.date,
      time: data.time || existing.time,
      duration: data.duration !== undefined ? data.duration : existing.duration,
      status: data.status || existing.status,
      notes: data.notes !== undefined ? sanitize(data.notes) : existing.notes,
      mood: data.mood !== undefined ? data.mood : existing.mood,
      topics: data.topics ? JSON.stringify(data.topics) : existing.topics,
      homework: data.homework !== undefined ? sanitize(data.homework) : existing.homework,
      next_session_goals: data.nextSessionGoals !== undefined ? sanitize(data.nextSessionGoals) : existing.next_session_goals,
      is_paid: data.isPaid !== undefined ? (data.isPaid ? 1 : 0) : existing.is_paid,
      amount: data.amount !== undefined ? data.amount : existing.amount,
    });

    // If session completed, decrement package
    if (data.status === 'completed' && existing.status !== 'completed') {
      const client = stmts.getClientById.get(existing.client_id, req.userId);
      if (client && client.package_id && client.remaining_sessions > 0) {
        stmts.updateClient.run({
          ...client,
          remaining_sessions: client.remaining_sessions - 1,
        });
      }
    }

    const updated = stmts.getSessionById.get(req.params.id, req.userId);
    res.json({ session: mappers.sessionToFrontend(updated) });
  } catch (err) {
    console.error('Update session error:', err);
    sendError(res, 500, 'Ошибка обновления сессии');
  }
});

router.delete('/sessions/:id', authenticate, (req, res) => {
  try {
    const existing = stmts.getSessionById.get(req.params.id, req.userId);
    if (!existing) return sendError(res, 404, 'Сессия не найдена');

    stmts.deleteSession.run(req.params.id, req.userId);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete session error:', err);
    sendError(res, 500, 'Ошибка удаления сессии');
  }
});

// ── Appointment Routes ──────────────────────────────────────

router.get('/appointments', authenticate, (req, res) => {
  const { from, to } = req.query;
  let rows;
  if (from && to) {
    rows = stmts.getAppointmentsByDate.all(req.userId, from, to);
  } else {
    rows = stmts.getAppointmentsByUser.all(req.userId);
  }
  res.json({ appointments: rows.map(mappers.appointmentToFrontend) });
});

router.post('/appointments', authenticate, (req, res) => {
  try {
    const data = req.body;
    if (!data.clientId || !data.date || !data.time) {
      return sendError(res, 400, 'clientId, date и time обязательны');
    }

    const client = stmts.getClientById.get(data.clientId, req.userId);
    if (!client) return sendError(res, 404, 'Клиент не найден');

    const aptId = data.id || crypto.randomUUID();
    stmts.createAppointment.run({
      id: aptId,
      user_id: req.userId,
      client_id: data.clientId,
      session_id: data.sessionId || null,
      client_name: data.clientName || client.name,
      date: data.date,
      time: data.time,
      duration: data.duration || 60,
      status: data.status || 'scheduled',
      is_online: data.isOnline ? 1 : 0,
      meeting_link: data.meetingLink || null,
    });

    const created = stmts.getAppointmentById.get(aptId, req.userId);
    res.status(201).json({ appointment: mappers.appointmentToFrontend(created) });
  } catch (err) {
    console.error('Create appointment error:', err);
    sendError(res, 500, 'Ошибка создания встречи');
  }
});

router.put('/appointments/:id', authenticate, (req, res) => {
  try {
    const existing = stmts.getAppointmentById.get(req.params.id, req.userId);
    if (!existing) return sendError(res, 404, 'Встреча не найдена');

    const data = req.body;
    stmts.updateAppointment.run({
      id: req.params.id,
      user_id: req.userId,
      client_name: data.clientName || existing.client_name,
      date: data.date || existing.date,
      time: data.time || existing.time,
      duration: data.duration !== undefined ? data.duration : existing.duration,
      status: data.status || existing.status,
      is_online: data.isOnline !== undefined ? (data.isOnline ? 1 : 0) : existing.is_online,
      meeting_link: data.meetingLink !== undefined ? (data.meetingLink || null) : existing.meeting_link,
      session_id: data.sessionId !== undefined ? (data.sessionId || null) : existing.session_id,
    });

    const updated = stmts.getAppointmentById.get(req.params.id, req.userId);
    res.json({ appointment: mappers.appointmentToFrontend(updated) });
  } catch (err) {
    console.error('Update appointment error:', err);
    sendError(res, 500, 'Ошибка обновления встречи');
  }
});

router.delete('/appointments/:id', authenticate, (req, res) => {
  try {
    const existing = stmts.getAppointmentById.get(req.params.id, req.userId);
    if (!existing) return sendError(res, 404, 'Встреча не найдена');

    stmts.deleteAppointment.run(req.params.id, req.userId);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete appointment error:', err);
    sendError(res, 500, 'Ошибка удаления встречи');
  }
});

// ── Batch Route (for initial data sync) ─────────────────────

router.post('/batch', authenticate, (req, res) => {
  try {
    const { clients, sessions, appointments } = req.body;
    const results = {};

    if (clients && Array.isArray(clients) && clients.length > 0) {
      batchInsertClients(clients, req.userId);
      results.clients = clients.length;
    }

    if (sessions && Array.isArray(sessions) && sessions.length > 0) {
      batchInsertSessions(sessions, req.userId);
      results.sessions = sessions.length;
    }

    if (appointments && Array.isArray(appointments) && appointments.length > 0) {
      batchInsertAppointments(appointments, req.userId);
      results.appointments = appointments.length;
    }

    res.json({ success: true, inserted: results });
  } catch (err) {
    console.error('Batch insert error:', err);
    sendError(res, 500, 'Ошибка пакетной вставки');
  }
});

// ── Stats Route ─────────────────────────────────────────────

router.get('/stats', authenticate, (req, res) => {
  try {
    const total = stmts.getSessionStats.get(req.userId);
    const { from, to } = req.query;
    let weekly = null;
    if (from && to) {
      weekly = stmts.getWeeklyStats.get(req.userId, from, to);
    }
    res.json({ total, weekly });
  } catch (err) {
    console.error('Stats error:', err);
    sendError(res, 500, 'Ошибка получения статистики');
  }
});

module.exports = { router, authenticate };
