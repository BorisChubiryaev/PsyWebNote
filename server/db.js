/**
 * PsyWebNote — Database Layer (SQLite via better-sqlite3)
 *
 * Features:
 * - WAL mode for concurrent reads
 * - Foreign keys enforced
 * - Indexes for common queries
 * - Prepared statements for performance
 * - Data isolation by user_id
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, 'data');
const DB_PATH = process.env.DB_PATH || path.join(DB_DIR, 'psywebnote.db');

// Ensure data directory exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

// Performance & safety pragmas
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

// ── Schema ──────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    avatar TEXT,
    therapy_type TEXT DEFAULT 'Когнитивно-поведенческая терапия (КПТ)',
    hourly_rate REAL DEFAULT 5000,
    currency TEXT DEFAULT '₽',
    bio TEXT DEFAULT '',
    phone TEXT DEFAULT '',
    working_hours_start TEXT DEFAULT '09:00',
    working_hours_end TEXT DEFAULT '18:00',
    working_days TEXT DEFAULT '[1,2,3,4,5]',
    packages TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT UNIQUE NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    avatar TEXT,
    notes TEXT DEFAULT '',
    social_links TEXT DEFAULT '[]',
    package_id TEXT,
    remaining_sessions INTEGER DEFAULT 0,
    schedules TEXT DEFAULT '[]',
    meeting_link TEXT,
    is_online INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK(status IN ('active','paused','completed')),
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    duration INTEGER DEFAULT 60,
    status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled','completed','cancelled','no-show')),
    notes TEXT DEFAULT '',
    mood INTEGER,
    topics TEXT DEFAULT '[]',
    homework TEXT,
    next_session_goals TEXT,
    is_paid INTEGER DEFAULT 0,
    amount REAL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    session_id TEXT,
    client_name TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    duration INTEGER DEFAULT 60,
    status TEXT DEFAULT 'scheduled' CHECK(status IN ('scheduled','completed','cancelled','no-show')),
    is_online INTEGER DEFAULT 0,
    meeting_link TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL
  );

  -- Performance indexes
  CREATE INDEX IF NOT EXISTS idx_clients_user ON clients(user_id);
  CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(user_id, status);
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_client ON sessions(user_id, client_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(user_id, status);
  CREATE INDEX IF NOT EXISTS idx_appointments_user ON appointments(user_id);
  CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_appointments_client ON appointments(user_id, client_id);
  CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
  CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
`);

// ── Data Mappers (DB ↔ Frontend) ────────────────────────────

const mappers = {
  userToFrontend(row) {
    if (!row) return null;
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      avatar: row.avatar || undefined,
      therapyType: row.therapy_type,
      hourlyRate: row.hourly_rate,
      currency: row.currency,
      bio: row.bio || '',
      phone: row.phone || '',
      workingHours: {
        start: row.working_hours_start,
        end: row.working_hours_end,
      },
      workingDays: JSON.parse(row.working_days || '[]'),
      packages: JSON.parse(row.packages || '[]'),
    };
  },

  clientToFrontend(row) {
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      phone: row.phone || undefined,
      email: row.email || undefined,
      avatar: row.avatar || undefined,
      notes: row.notes || '',
      socialLinks: JSON.parse(row.social_links || '[]'),
      packageId: row.package_id || undefined,
      remainingSessions: row.remaining_sessions || 0,
      schedules: JSON.parse(row.schedules || '[]'),
      meetingLink: row.meeting_link || undefined,
      isOnline: !!row.is_online,
      status: row.status,
      createdAt: row.created_at,
    };
  },

  sessionToFrontend(row) {
    if (!row) return null;
    return {
      id: row.id,
      clientId: row.client_id,
      date: row.date,
      time: row.time,
      duration: row.duration,
      status: row.status,
      notes: row.notes || '',
      mood: row.mood || undefined,
      topics: JSON.parse(row.topics || '[]'),
      homework: row.homework || undefined,
      nextSessionGoals: row.next_session_goals || undefined,
      isPaid: !!row.is_paid,
      amount: row.amount || 0,
    };
  },

  appointmentToFrontend(row) {
    if (!row) return null;
    return {
      id: row.id,
      clientId: row.client_id,
      sessionId: row.session_id || undefined,
      clientName: row.client_name,
      date: row.date,
      time: row.time,
      duration: row.duration,
      status: row.status,
      isOnline: !!row.is_online,
      meetingLink: row.meeting_link || undefined,
    };
  },
};

// ── Prepared Statements ─────────────────────────────────────

const stmts = {
  // Users
  getUserByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
  getUserById: db.prepare('SELECT * FROM users WHERE id = ?'),
  createUser: db.prepare(`
    INSERT INTO users (id, email, password_hash, name, therapy_type, hourly_rate, currency, bio, phone,
      working_hours_start, working_hours_end, working_days, packages)
    VALUES (@id, @email, @password_hash, @name, @therapy_type, @hourly_rate, @currency, @bio, @phone,
      @working_hours_start, @working_hours_end, @working_days, @packages)
  `),
  updateUser: db.prepare(`
    UPDATE users SET name=@name, avatar=@avatar, therapy_type=@therapy_type, hourly_rate=@hourly_rate,
      currency=@currency, bio=@bio, phone=@phone, working_hours_start=@working_hours_start,
      working_hours_end=@working_hours_end, working_days=@working_days, packages=@packages,
      updated_at=datetime('now')
    WHERE id=@id
  `),

  // Refresh tokens
  createRefreshToken: db.prepare(`
    INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
    VALUES (@id, @user_id, @token_hash, @expires_at)
  `),
  getRefreshToken: db.prepare('SELECT * FROM refresh_tokens WHERE token_hash = ? AND expires_at > datetime(\'now\')'),
  deleteRefreshToken: db.prepare('DELETE FROM refresh_tokens WHERE token_hash = ?'),
  deleteUserRefreshTokens: db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?'),
  cleanExpiredTokens: db.prepare('DELETE FROM refresh_tokens WHERE expires_at <= datetime(\'now\')'),

  // Clients
  getClientsByUser: db.prepare('SELECT * FROM clients WHERE user_id = ? ORDER BY name'),
  getClientById: db.prepare('SELECT * FROM clients WHERE id = ? AND user_id = ?'),
  createClient: db.prepare(`
    INSERT INTO clients (id, user_id, name, phone, email, avatar, notes, social_links,
      package_id, remaining_sessions, schedules, meeting_link, is_online, status, created_at)
    VALUES (@id, @user_id, @name, @phone, @email, @avatar, @notes, @social_links,
      @package_id, @remaining_sessions, @schedules, @meeting_link, @is_online, @status, @created_at)
  `),
  updateClient: db.prepare(`
    UPDATE clients SET name=@name, phone=@phone, email=@email, avatar=@avatar, notes=@notes,
      social_links=@social_links, package_id=@package_id, remaining_sessions=@remaining_sessions,
      schedules=@schedules, meeting_link=@meeting_link, is_online=@is_online, status=@status,
      updated_at=datetime('now')
    WHERE id=@id AND user_id=@user_id
  `),
  deleteClient: db.prepare('DELETE FROM clients WHERE id = ? AND user_id = ?'),

  // Sessions
  getSessionsByUser: db.prepare('SELECT * FROM sessions WHERE user_id = ? ORDER BY date DESC, time DESC'),
  getSessionsByClient: db.prepare('SELECT * FROM sessions WHERE user_id = ? AND client_id = ? ORDER BY date DESC, time DESC'),
  getSessionById: db.prepare('SELECT * FROM sessions WHERE id = ? AND user_id = ?'),
  createSession: db.prepare(`
    INSERT INTO sessions (id, user_id, client_id, date, time, duration, status, notes,
      mood, topics, homework, next_session_goals, is_paid, amount)
    VALUES (@id, @user_id, @client_id, @date, @time, @duration, @status, @notes,
      @mood, @topics, @homework, @next_session_goals, @is_paid, @amount)
  `),
  updateSession: db.prepare(`
    UPDATE sessions SET date=@date, time=@time, duration=@duration, status=@status, notes=@notes,
      mood=@mood, topics=@topics, homework=@homework, next_session_goals=@next_session_goals,
      is_paid=@is_paid, amount=@amount, updated_at=datetime('now')
    WHERE id=@id AND user_id=@user_id
  `),
  deleteSession: db.prepare('DELETE FROM sessions WHERE id = ? AND user_id = ?'),

  // Appointments
  getAppointmentsByUser: db.prepare('SELECT * FROM appointments WHERE user_id = ? ORDER BY date, time'),
  getAppointmentsByDate: db.prepare('SELECT * FROM appointments WHERE user_id = ? AND date BETWEEN ? AND ? ORDER BY date, time'),
  getAppointmentById: db.prepare('SELECT * FROM appointments WHERE id = ? AND user_id = ?'),
  createAppointment: db.prepare(`
    INSERT INTO appointments (id, user_id, client_id, session_id, client_name, date, time,
      duration, status, is_online, meeting_link)
    VALUES (@id, @user_id, @client_id, @session_id, @client_name, @date, @time,
      @duration, @status, @is_online, @meeting_link)
  `),
  updateAppointment: db.prepare(`
    UPDATE appointments SET client_name=@client_name, date=@date, time=@time, duration=@duration,
      status=@status, is_online=@is_online, meeting_link=@meeting_link, session_id=@session_id,
      updated_at=datetime('now')
    WHERE id=@id AND user_id=@user_id
  `),
  deleteAppointment: db.prepare('DELETE FROM appointments WHERE id = ? AND user_id = ?'),
  deleteAppointmentsByClient: db.prepare('DELETE FROM appointments WHERE client_id = ? AND user_id = ?'),

  // Stats
  getSessionStats: db.prepare(`
    SELECT
      COUNT(*) as total_sessions,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_sessions,
      SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as total_earned,
      SUM(CASE WHEN status = 'completed' THEN duration ELSE 0 END) as total_minutes
    FROM sessions WHERE user_id = ?
  `),
  getWeeklyStats: db.prepare(`
    SELECT
      SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as earned,
      SUM(CASE WHEN status = 'completed' THEN duration ELSE 0 END) as minutes_worked,
      SUM(CASE WHEN status = 'scheduled' THEN duration ELSE 0 END) as minutes_planned,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
      COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as planned
    FROM sessions
    WHERE user_id = ? AND date BETWEEN ? AND ?
  `),
};

// ── Batch operations (transactional) ────────────────────────

const batchInsertClients = db.transaction((clients, userId) => {
  for (const c of clients) {
    stmts.createClient.run({
      id: c.id, user_id: userId, name: c.name, phone: c.phone || null,
      email: c.email || null, avatar: c.avatar || null, notes: c.notes || '',
      social_links: JSON.stringify(c.socialLinks || []),
      package_id: c.packageId || null, remaining_sessions: c.remainingSessions || 0,
      schedules: JSON.stringify(c.schedules || []),
      meeting_link: c.meetingLink || null, is_online: c.isOnline ? 1 : 0,
      status: c.status || 'active', created_at: c.createdAt || new Date().toISOString(),
    });
  }
});

const batchInsertSessions = db.transaction((sessions, userId) => {
  for (const s of sessions) {
    stmts.createSession.run({
      id: s.id, user_id: userId, client_id: s.clientId,
      date: s.date, time: s.time, duration: s.duration,
      status: s.status || 'scheduled', notes: s.notes || '',
      mood: s.mood || null, topics: JSON.stringify(s.topics || []),
      homework: s.homework || null, next_session_goals: s.nextSessionGoals || null,
      is_paid: s.isPaid ? 1 : 0, amount: s.amount || 0,
    });
  }
});

const batchInsertAppointments = db.transaction((appointments, userId) => {
  for (const a of appointments) {
    stmts.createAppointment.run({
      id: a.id, user_id: userId, client_id: a.clientId,
      session_id: a.sessionId || null, client_name: a.clientName,
      date: a.date, time: a.time, duration: a.duration,
      status: a.status || 'scheduled', is_online: a.isOnline ? 1 : 0,
      meeting_link: a.meetingLink || null,
    });
  }
});

// Clean expired tokens periodically
setInterval(() => {
  try { stmts.cleanExpiredTokens.run(); } catch (e) { /* ignore */ }
}, 60 * 60 * 1000); // every hour

module.exports = { db, stmts, mappers, batchInsertClients, batchInsertSessions, batchInsertAppointments };
