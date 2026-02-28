/**
 * PsyWebNote — Unified API Layer
 *
 * Dual-mode architecture:
 * - Backend mode:    VITE_API_URL is set → real HTTP calls with JWT auth
 * - Offline mode:    VITE_API_URL is empty → localStorage (current behavior)
 *
 * The AppContext doesn't need to know which mode is active.
 * All mutations are optimistic (update state first, sync in background).
 */

import { User, Client, Session, Appointment } from '../types';

// ── Mode Detection ──────────────────────────────────────────

const API_URL = import.meta.env.VITE_API_URL || '';
export const useBackend = !!API_URL;

// ── Token Management ────────────────────────────────────────

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) {
    sessionStorage.setItem('psywebnote_access_token', token);
  } else {
    sessionStorage.removeItem('psywebnote_access_token');
  }
}

export function getAccessToken(): string | null {
  if (!accessToken) {
    accessToken = sessionStorage.getItem('psywebnote_access_token');
  }
  return accessToken;
}

// ── HTTP Client with JWT + Refresh ──────────────────────────

async function refreshAccessToken(): Promise<boolean> {
  if (!API_URL) return false;
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      setAccessToken(data.accessToken);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function fetchAPI<T = unknown>(
  endpoint: string,
  options: RequestInit = {},
  retry = true
): Promise<T> {
  if (!API_URL) throw new Error('Backend not configured');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  const token = getAccessToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (response.status === 401 && retry) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return fetchAPI<T>(endpoint, options, false);
    }
    // Session expired — clear everything
    setAccessToken(null);
    throw new Error('SESSION_EXPIRED');
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// ── Password Hashing (for offline mode only) ────────────────

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'psywebnote_salt_2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const computed = await hashPassword(password);
  return computed === hash;
}

// ── Input Sanitization ──────────────────────────────────────

export function sanitizeForDisplay(input: string): string {
  return input.trim();
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ── localStorage Cache ──────────────────────────────────────

const STORAGE_PREFIX = 'psywebnote_';

export const storage = {
  get<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },

  set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    } catch (e) {
      console.error('Storage write failed:', e);
    }
  },

  remove(key: string): void {
    localStorage.removeItem(STORAGE_PREFIX + key);
  },

  clear(): void {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(STORAGE_PREFIX));
    keys.forEach(k => localStorage.removeItem(k));
  },
};

// ── Backend API (HTTP calls) ────────────────────────────────

export const backendApi = {
  // Auth
  async login(email: string, password: string): Promise<{ user: User; accessToken: string }> {
    const data = await fetchAPI<{ user: User; accessToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAccessToken(data.accessToken);
    return data;
  },

  async register(email: string, password: string, name: string): Promise<{ user: User; accessToken: string }> {
    const data = await fetchAPI<{ user: User; accessToken: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
    setAccessToken(data.accessToken);
    return data;
  },

  async logout(): Promise<void> {
    try {
      await fetchAPI('/auth/logout', { method: 'POST' });
    } catch { /* ignore */ }
    setAccessToken(null);
  },

  async refreshSession(): Promise<User | null> {
    try {
      const data = await fetchAPI<{ user: User; accessToken: string }>('/auth/refresh', {
        method: 'POST',
      });
      setAccessToken(data.accessToken);
      return data.user;
    } catch {
      return null;
    }
  },

  // Profile
  async getProfile(): Promise<User> {
    const data = await fetchAPI<{ user: User }>('/profile');
    return data.user;
  },

  async updateProfile(profileData: Partial<User>): Promise<User> {
    const data = await fetchAPI<{ user: User }>('/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
    return data.user;
  },

  // Clients
  async getClients(): Promise<Client[]> {
    const data = await fetchAPI<{ clients: Client[] }>('/clients');
    return data.clients;
  },

  async createClient(client: Client): Promise<Client> {
    const data = await fetchAPI<{ client: Client }>('/clients', {
      method: 'POST',
      body: JSON.stringify(client),
    });
    return data.client;
  },

  async updateClient(id: string, clientData: Partial<Client>): Promise<Client> {
    const data = await fetchAPI<{ client: Client }>(`/clients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(clientData),
    });
    return data.client;
  },

  async deleteClient(id: string): Promise<void> {
    await fetchAPI(`/clients/${id}`, { method: 'DELETE' });
  },

  // Sessions
  async getSessions(clientId?: string): Promise<Session[]> {
    const query = clientId ? `?clientId=${clientId}` : '';
    const data = await fetchAPI<{ sessions: Session[] }>(`/sessions${query}`);
    return data.sessions;
  },

  async createSession(session: Session): Promise<Session> {
    const data = await fetchAPI<{ session: Session }>('/sessions', {
      method: 'POST',
      body: JSON.stringify(session),
    });
    return data.session;
  },

  async updateSession(id: string, sessionData: Partial<Session>): Promise<Session> {
    const data = await fetchAPI<{ session: Session }>(`/sessions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(sessionData),
    });
    return data.session;
  },

  async deleteSession(id: string): Promise<void> {
    await fetchAPI(`/sessions/${id}`, { method: 'DELETE' });
  },

  // Appointments
  async getAppointments(from?: string, to?: string): Promise<Appointment[]> {
    const params = from && to ? `?from=${from}&to=${to}` : '';
    const data = await fetchAPI<{ appointments: Appointment[] }>(`/appointments${params}`);
    return data.appointments;
  },

  async createAppointment(appointment: Appointment): Promise<Appointment> {
    const data = await fetchAPI<{ appointment: Appointment }>('/appointments', {
      method: 'POST',
      body: JSON.stringify(appointment),
    });
    return data.appointment;
  },

  async updateAppointment(id: string, appointmentData: Partial<Appointment>): Promise<Appointment> {
    const data = await fetchAPI<{ appointment: Appointment }>(`/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(appointmentData),
    });
    return data.appointment;
  },

  async deleteAppointment(id: string): Promise<void> {
    await fetchAPI(`/appointments/${id}`, { method: 'DELETE' });
  },

  // Batch sync
  async batchSync(items: {
    clients?: Client[];
    sessions?: Session[];
    appointments?: Appointment[];
  }): Promise<void> {
    await fetchAPI('/batch', {
      method: 'POST',
      body: JSON.stringify(items),
    });
  },
};

// ── Unified API Interface ───────────────────────────────────
// Used by AppContext — automatically chooses backend or localStorage

export const api = {
  // Auth
  async login(email: string, password: string): Promise<User | null> {
    if (useBackend) {
      try {
        const { user } = await backendApi.login(email, password);
        return user;
      } catch {
        return null;
      }
    } else {
      const users = storage.get<User[]>('users', []);
      for (const u of users) {
        if (u.email === email) {
          const isHashed = /^[a-f0-9]{64}$/.test(u.password || '');
          let match = false;
          if (isHashed) {
            match = await verifyPassword(password, u.password || '');
          } else {
            match = u.password === password;
            if (match) {
              const hashed = await hashPassword(password);
              const updated = users.map(x => x.id === u.id ? { ...x, password: hashed } : x);
              storage.set('users', updated);
            }
          }
          if (match) return u;
        }
      }
      return null;
    }
  },

  async register(email: string, password: string, name: string): Promise<User | null> {
    if (useBackend) {
      try {
        const { user } = await backendApi.register(email, password, name);
        return user;
      } catch {
        return null;
      }
    } else {
      const users = storage.get<User[]>('users', []);
      if (users.find(u => u.email === email)) return null;
      const hashed = await hashPassword(password);
      const newUser: User = {
        id: crypto.randomUUID(), email, password: hashed, name,
        therapyType: 'Когнитивно-поведенческая терапия (КПТ)',
        hourlyRate: 5000, currency: '₽',
        packages: [
          { id: '1', name: 'Базовый', sessions: 4, price: 20000, discount: 10 },
          { id: '2', name: 'Стандарт', sessions: 8, price: 36000, discount: 15 },
          { id: '3', name: 'Премиум', sessions: 12, price: 48000, discount: 20 },
        ],
        bio: '', phone: '',
        workingHours: { start: '09:00', end: '18:00' },
        workingDays: [1, 2, 3, 4, 5],
      };
      storage.set('users', [...users, newUser]);
      return newUser;
    }
  },

  async logout(): Promise<void> {
    if (useBackend) {
      await backendApi.logout();
    }
  },

  // Data fetching (backend mode)
  async fetchAllData(): Promise<{ clients: Client[]; sessions: Session[]; appointments: Appointment[] } | null> {
    if (!useBackend) return null;
    try {
      const [clients, sessions, appointments] = await Promise.all([
        backendApi.getClients(),
        backendApi.getSessions(),
        backendApi.getAppointments(),
      ]);
      return { clients, sessions, appointments };
    } catch (err) {
      console.error('Failed to fetch data:', err);
      return null;
    }
  },

  // Cache operations (always localStorage)
  saveUser(user: User | null): void {
    if (user) storage.set('user', user);
    else storage.remove('user');
  },
  getUser(): User | null {
    return storage.get<User | null>('user', null);
  },
  saveClients(clients: Client[]): void {
    storage.set('clients', clients);
  },
  getClients(): Client[] {
    return storage.get<Client[]>('clients', []);
  },
  saveSessions(sessions: Session[]): void {
    storage.set('sessions', sessions);
  },
  getSessions(): Session[] {
    return storage.get<Session[]>('sessions', []);
  },
  saveAppointments(appointments: Appointment[]): void {
    storage.set('appointments', appointments);
  },
  getAppointments(): Appointment[] {
    return storage.get<Appointment[]>('appointments', []);
  },

  // Background sync helpers (fire-and-forget with error logging)
  syncClient(action: 'create' | 'update' | 'delete', client: Client, data?: Partial<Client>): void {
    if (!useBackend) return;
    const promise = action === 'create'
      ? backendApi.createClient(client)
      : action === 'update'
        ? backendApi.updateClient(client.id, data || client)
        : backendApi.deleteClient(client.id);
    promise.catch(err => console.error(`[Sync] Client ${action} failed:`, err));
  },

  syncSession(action: 'create' | 'update' | 'delete', session: Session, data?: Partial<Session>): void {
    if (!useBackend) return;
    const promise = action === 'create'
      ? backendApi.createSession(session)
      : action === 'update'
        ? backendApi.updateSession(session.id, data || session)
        : backendApi.deleteSession(session.id);
    promise.catch(err => console.error(`[Sync] Session ${action} failed:`, err));
  },

  syncAppointment(action: 'create' | 'update' | 'delete', appointment: Appointment, data?: Partial<Appointment>): void {
    if (!useBackend) return;
    const promise = action === 'create'
      ? backendApi.createAppointment(appointment)
      : action === 'update'
        ? backendApi.updateAppointment(appointment.id, data || appointment)
        : backendApi.deleteAppointment(appointment.id);
    promise.catch(err => console.error(`[Sync] Appointment ${action} failed:`, err));
  },

  syncProfile(data: Partial<User>): void {
    if (!useBackend) return;
    backendApi.updateProfile(data).catch(err => console.error('[Sync] Profile update failed:', err));
  },
};
