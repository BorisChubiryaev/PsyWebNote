/**
 * PsyWebNote — Auth & Storage Layer
 * Clean, no duplication, per-user data isolation
 */

import { User, Client, Session, Appointment } from '../types';

// ── Storage Keys ────────────────────────────────────────────

const KEYS = {
  USERS:        'psywebnote_users',
  CURRENT_ID:   'psywebnote_current_user_id',
  profile: (id: string) => `psywebnote_profile_${id}`,
  data:    (id: string) => `psywebnote_data_${id}`,
};

// ── Safe JSON helpers ───────────────────────────────────────

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T): void {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch (e) { console.error('[Storage] write failed:', e); }
}

function remove(key: string): void {
  try { localStorage.removeItem(key); } catch { /* ignore */ }
}

// ── Password Hashing ────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(password + 'psywebnote_salt_2024'));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return (await hashPassword(password)) === hash;
}

// ── Types ───────────────────────────────────────────────────

interface StoredUser {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  createdAt: string;
}

export interface UserData {
  clients: Client[];
  sessions: Session[];
  appointments: Appointment[];
}

export interface AuthResult {
  success: boolean;
  user: User | null;
  error?: string;
}

// ── Auth ────────────────────────────────────────────────────

export async function authRegister(
  email: string,
  password: string,
  name: string,
): Promise<AuthResult> {
  const e = email.trim().toLowerCase();
  const n = name.trim();

  if (!e || !password || !n)
    return { success: false, user: null, error: 'Заполните все поля' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
    return { success: false, user: null, error: 'Некорректный email' };
  if (password.length < 6)
    return { success: false, user: null, error: 'Пароль должен быть не менее 6 символов' };

  const stored = read<StoredUser[]>(KEYS.USERS, []);
  if (stored.some(u => u.email === e))
    return { success: false, user: null, error: 'Пользователь с таким email уже существует' };

  const id = crypto.randomUUID();
  const passwordHash = await hashPassword(password);

  const storedUser: StoredUser = { id, email: e, passwordHash, name: n, createdAt: new Date().toISOString() };
  const profile: User = {
    id, email: e, name: n,
    therapyType: '',
    hourlyRate: 5000,
    currency: '₽',
    packages: [
      { id: '1', name: 'Базовый',   sessions: 4,  price: 20000, discount: 10 },
      { id: '2', name: 'Стандарт',  sessions: 8,  price: 36000, discount: 15 },
      { id: '3', name: 'Премиум',   sessions: 12, price: 48000, discount: 20 },
    ],
    bio: '', phone: '',
    workingHours: { start: '09:00', end: '18:00' },
    workingDays: [1, 2, 3, 4, 5],
    onboardingComplete: false,
  };
  const userData: UserData = { clients: [], sessions: [], appointments: [] };

  write(KEYS.USERS, [...stored, storedUser]);
  write(KEYS.profile(id), profile);
  write(KEYS.data(id), userData);
  write(KEYS.CURRENT_ID, id);

  return { success: true, user: profile };
}

export async function authLogin(email: string, password: string): Promise<AuthResult> {
  const e = email.trim().toLowerCase();
  if (!e || !password) return { success: false, user: null, error: 'Заполните все поля' };

  const stored = read<StoredUser[]>(KEYS.USERS, []);
  const found = stored.find(u => u.email === e);
  if (!found) return { success: false, user: null, error: 'Неверный email или пароль' };

  // Verify (support legacy plain-text)
  let ok = false;
  if (found.passwordHash.length === 64 && /^[a-f0-9]+$/.test(found.passwordHash)) {
    ok = await verifyPassword(password, found.passwordHash);
  } else {
    ok = found.passwordHash === password;
    if (ok) {
      // upgrade to hash
      const newHash = await hashPassword(password);
      const updated = stored.map(u =>
        u.id === found.id ? { ...u, passwordHash: newHash } : u
      );
      write(KEYS.USERS, updated);
    }
  }
  if (!ok) return { success: false, user: null, error: 'Неверный email или пароль' };

  // Load or migrate profile
  let profile = read<User | null>(KEYS.profile(found.id), null);
  if (!profile) {
    profile = _tryMigrateProfile(found);
    write(KEYS.profile(found.id), profile);
  }

  write(KEYS.CURRENT_ID, found.id);
  return { success: true, user: profile };
}

export function authLogout(): void {
  remove(KEYS.CURRENT_ID);
}

export function authGetCurrentUser(): User | null {
  const id = read<string | null>(KEYS.CURRENT_ID, null);
  if (!id) return null;
  return read<User | null>(KEYS.profile(id), null);
}

export function authUpdateProfile(userId: string, data: Partial<User>): void {
  const cur = read<User | null>(KEYS.profile(userId), null);
  if (cur) write(KEYS.profile(userId), { ...cur, ...data });
}

// ── User Data ───────────────────────────────────────────────

export function loadUserData(userId: string): UserData {
  // try new per-user key first
  const d = read<UserData | null>(KEYS.data(userId), null);
  if (d) return d;
  // fallback: try old flat keys (migration)
  return {
    clients:      read<Client[]>('psywebnote_clients', []),
    sessions:     read<Session[]>('psywebnote_sessions', []),
    appointments: read<Appointment[]>('psywebnote_appointments', []),
  };
}

export function saveUserData(userId: string, data: UserData): void {
  write(KEYS.data(userId), data);
}

// ── Clear everything ────────────────────────────────────────

export function clearAllAppData(): void {
  Object.keys(localStorage)
    .filter(k => k.startsWith('psywebnote_'))
    .forEach(k => localStorage.removeItem(k));
}

// ── Legacy migration ────────────────────────────────────────

function _tryMigrateProfile(stored: StoredUser): User {
  // Try old 'psywebnote_user' key
  const old = read<Partial<User> | null>('psywebnote_user', null);
  if (old && old.id === stored.id) {
    return {
      id: stored.id,
      email: stored.email,
      name: stored.name,
      therapyType: old.therapyType || '',
      hourlyRate: old.hourlyRate || 5000,
      currency: old.currency || '₽',
      packages: old.packages || [],
      bio: old.bio || '',
      phone: old.phone || '',
      avatar: old.avatar,
      workingHours: old.workingHours || { start: '09:00', end: '18:00' },
      workingDays: old.workingDays || [1, 2, 3, 4, 5],
      onboardingComplete: true,
    };
  }
  return {
    id: stored.id,
    email: stored.email,
    name: stored.name,
    therapyType: '',
    hourlyRate: 5000,
    currency: '₽',
    packages: [
      { id: '1', name: 'Базовый',   sessions: 4,  price: 20000, discount: 10 },
      { id: '2', name: 'Стандарт',  sessions: 8,  price: 36000, discount: 15 },
      { id: '3', name: 'Премиум',   sessions: 12, price: 48000, discount: 20 },
    ],
    bio: '', phone: '',
    workingHours: { start: '09:00', end: '18:00' },
    workingDays: [1, 2, 3, 4, 5],
    onboardingComplete: true,
  };
}

// ── Backward compat stubs ───────────────────────────────────

export const useBackend = false;
export const storage = { clear: clearAllAppData };
