import { TR } from '../utils/tr';
/**
 * PsyWebNote — Data Layer
 * Primary:  Supabase (PostgreSQL + Auth)
 * Fallback: localStorage (if Supabase unavailable)
 */

import { supabase } from './supabase';
import { User, Client, Session, Appointment } from '../types';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface AuthResult {
  success: boolean;
  user: User | null;
  error?: string;
}

export interface UserData {
  clients:      Client[];
  sessions:     Session[];
  appointments: Appointment[];
}

// ─────────────────────────────────────────────────────────────
// DB → Frontend mappers
// ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProfile(row: any): User {
  return {
    id:                 row.id,
    email:              row.email,
    name:               row.name ?? '',
    avatar:             row.avatar ?? undefined,
    therapyType:        row.therapy_type ?? '',
    hourlyRate:         Number(row.hourly_rate ?? 5000),
    currency:           row.currency ?? '₽',
    bio:                row.bio ?? '',
    phone:              row.phone ?? '',
    workingHours:       row.working_hours ?? { start: '09:00', end: '18:00' },
    workingDays:        row.working_days ?? [1, 2, 3, 4, 5],
    packages:           row.packages ?? [],
    onboardingComplete: row.onboarding_complete ?? false,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapClient(row: any): Client {
  return {
    id:                  row.id,
    name:                row.name,
    phone:               row.phone ?? undefined,
    email:               row.email ?? undefined,
    avatar:              row.avatar ?? undefined,
    notes:               row.notes ?? '',
    socialLinks:         row.social_links ?? [],
    packageId:           row.package_id ?? undefined,
    remainingSessions:   row.remaining_sessions ?? 0,
    schedules:           row.schedules ?? [],
    meetingLink:         row.meeting_link ?? undefined,
    isOnline:            row.is_online ?? false,
    status:              row.status ?? 'active',
    createdAt:           row.created_at,
    individualRate:      row.individual_rate != null ? Number(row.individual_rate) : undefined,
    individualCurrency:  row.individual_currency ?? undefined,
    acquisitionChannel:  row.acquisition_channel ?? undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapSession(row: any): Session {
  return {
    id:               row.id,
    clientId:         row.client_id,
    appointmentId:    row.appointment_id ?? undefined,
    date:             typeof row.date === 'string' ? row.date.slice(0, 10) : row.date,
    time:             row.time,
    duration:         row.duration ?? 60,
    status:           row.status ?? 'scheduled',
    notes:            row.notes ?? '',
    mood:             row.mood ?? undefined,
    topics:           row.topics ?? [],
    homework:         row.homework ?? undefined,
    nextSessionGoals: row.next_session_goals ?? undefined,
    isPaid:           row.is_paid ?? false,
    amount:           Number(row.amount ?? 0),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAppointment(row: any): Appointment {
  return {
    id:          row.id,
    clientId:    row.client_id ?? undefined,
    clientName:  row.client_name,
    date:        typeof row.date === 'string' ? row.date.slice(0, 10) : row.date,
    time:        row.time,
    duration:    row.duration ?? 60,
    status:      row.status ?? 'scheduled',
    isOnline:    row.is_online ?? false,
    meetingLink: row.meeting_link ?? undefined,
    kind:        row.kind ?? 'session',
    customType:  row.custom_type ?? undefined,
  };
}

// ─────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────

export async function authRegister(
  email: string,
  password: string,
  name: string,
): Promise<AuthResult> {
  const e = email.trim().toLowerCase();
  const n = name.trim();

  if (!e || !password || !n)
    return { success: false, user: null, error: TR("Заполните все поля", "Fill in all fields") };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
    return { success: false, user: null, error: TR("Некорректный email", "Incorrect email") };
  if (password.length < 6)
    return { success: false, user: null, error: TR("Пароль должен быть не менее 6 символов", "The password must be at least 6 characters") };

  const { data, error } = await supabase.auth.signUp({
    email: e,
    password,
    options: { data: { name: n } },
  });

  if (error) {
    // Supabase error messages → русские
    const msg = error.message.toLowerCase();
    if (msg.includes('already registered') || msg.includes('already exists') || msg.includes('email'))
      return { success: false, user: null, error: TR("Пользователь с таким email уже существует", "A user with this email already exists") };
    if (msg.includes('password'))
      return { success: false, user: null, error: TR("Пароль должен быть не менее 6 символов", "The password must be at least 6 characters") };
    return { success: false, user: null, error: TR("Ошибка регистрации: ", "Registration error:") + error.message };
  }

  if (!data.user)
    return { success: false, user: null, error: TR("Ошибка создания пользователя", "Error creating user") };

  // Wait a moment for the trigger to create the profile
  await new Promise(r => setTimeout(r, 800));

  // Fetch or construct profile
  const profile = await _fetchOrCreateProfile(data.user.id, e, n);
  return { success: true, user: profile };
}

export async function authLogin(email: string, password: string): Promise<AuthResult> {
  const e = email.trim().toLowerCase();
  if (!e || !password)
    return { success: false, user: null, error: TR("Заполните все поля", "Fill in all fields") };

  const { data, error } = await supabase.auth.signInWithPassword({ email: e, password });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('invalid') || msg.includes('credentials') || msg.includes('wrong'))
      return { success: false, user: null, error: TR("Неверный email или пароль", "Invalid email or password") };
    if (msg.includes('email not confirmed'))
      return { success: false, user: null, error: TR("Подтвердите email (проверьте почту)", "Confirm your email (check your email)") };
    return { success: false, user: null, error: TR("Ошибка входа: ", "Login error:") + error.message };
  }

  if (!data.user)
    return { success: false, user: null, error: TR("Ошибка входа", "Login error") };

  const profile = await _fetchOrCreateProfile(
    data.user.id,
    data.user.email ?? e,
    data.user.user_metadata?.name ?? '',
  );
  return { success: true, user: profile };
}

export async function authLogout(): Promise<void> {
  await supabase.auth.signOut();
}

export async function authGetCurrentUser(): Promise<User | null> {
  const { data } = await supabase.auth.getSession();
  if (!data.session?.user) return null;
  const u = data.session.user;
  return _fetchOrCreateProfile(u.id, u.email ?? '', u.user_metadata?.name ?? '');
}

export async function authUpdateProfile(userId: string, updates: Partial<User>): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (updates.name               !== undefined) payload.name                = updates.name;
  if (updates.avatar             !== undefined) payload.avatar              = updates.avatar;
  if (updates.therapyType        !== undefined) payload.therapy_type        = updates.therapyType;
  if (updates.hourlyRate         !== undefined) payload.hourly_rate         = updates.hourlyRate;
  if (updates.currency           !== undefined) payload.currency            = updates.currency;
  if (updates.bio                !== undefined) payload.bio                 = updates.bio;
  if (updates.phone              !== undefined) payload.phone               = updates.phone;
  if (updates.workingHours       !== undefined) payload.working_hours       = updates.workingHours;
  if (updates.workingDays        !== undefined) payload.working_days        = updates.workingDays;
  if (updates.packages           !== undefined) payload.packages            = updates.packages;
  if (updates.onboardingComplete !== undefined) payload.onboarding_complete = updates.onboardingComplete;

  if (Object.keys(payload).length === 0) return;

  const { error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', userId);

  if (error) console.error('[Profile] update error:', error.message);
}

// ─────────────────────────────────────────────────────────────
// Clients
// ─────────────────────────────────────────────────────────────

export async function fetchClients(userId: string): Promise<Client[]> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) { console.error('[Clients] fetch error:', error.message); return []; }
  return (data ?? []).map(mapClient);
}

export async function insertClient(userId: string, client: Omit<Client, 'id' | 'createdAt'>): Promise<Client | null> {
  // Build base payload — always-present columns
  const basePayload: Record<string, unknown> = {
    user_id:            userId,
    name:               client.name,
    phone:              client.phone ?? null,
    email:              client.email ?? null,
    avatar:             client.avatar ?? null,
    notes:              client.notes,
    social_links:       client.socialLinks,
    package_id:         client.packageId ?? null,
    remaining_sessions: client.remainingSessions,
    schedules:          client.schedules,
    meeting_link:       client.meetingLink ?? null,
    is_online:          client.isOnline,
    status:             client.status,
  };

  // Try first with extended fields
  const extPayload = {
    ...basePayload,
    individual_rate:     client.individualRate ?? null,
    individual_currency: client.individualCurrency ?? null,
    acquisition_channel: client.acquisitionChannel ?? null,
  };

  const { data, error } = await supabase
    .from('clients')
    .insert(extPayload)
    .select()
    .single();

  if (!error) return mapClient(data);

  // If extended columns don't exist yet — retry without them
  console.warn('[Clients] insert with extended fields failed, retrying without:', error.message);
  const { data: data2, error: error2 } = await supabase
    .from('clients')
    .insert(basePayload)
    .select()
    .single();

  if (error2) { console.error('[Clients] insert error:', error2.message); return null; }
  return mapClient(data2);
}

export async function updateClientDb(clientId: string, data: Partial<Client>): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (data.name              !== undefined) payload.name               = data.name;
  if (data.phone             !== undefined) payload.phone              = data.phone;
  if (data.email             !== undefined) payload.email              = data.email;
  if (data.avatar            !== undefined) payload.avatar             = data.avatar;
  if (data.notes             !== undefined) payload.notes              = data.notes;
  if (data.socialLinks       !== undefined) payload.social_links       = data.socialLinks;
  if (data.packageId         !== undefined) payload.package_id         = data.packageId;
  if (data.remainingSessions !== undefined) payload.remaining_sessions = data.remainingSessions;
  if (data.schedules         !== undefined) payload.schedules          = data.schedules;
  if (data.meetingLink       !== undefined) payload.meeting_link       = data.meetingLink;
  if (data.isOnline          !== undefined) payload.is_online          = data.isOnline;
  if (data.status            !== undefined) payload.status             = data.status;

  // Extended fields — add only if defined
  const extended: Record<string, unknown> = {};
  if (data.individualRate     !== undefined) extended.individual_rate     = data.individualRate;
  if (data.individualCurrency !== undefined) extended.individual_currency = data.individualCurrency;
  if (data.acquisitionChannel !== undefined) extended.acquisition_channel = data.acquisitionChannel;

  const { error } = await supabase.from('clients').update({ ...payload, ...extended }).eq('id', clientId);
  if (error) {
    // If extended columns don't exist, retry without them
    if (Object.keys(extended).length > 0 && Object.keys(payload).length > 0) {
      console.warn('[Clients] update with extended fields failed, retrying:', error.message);
      const { error: error2 } = await supabase.from('clients').update(payload).eq('id', clientId);
      if (error2) console.error('[Clients] update error:', error2.message);
    } else {
      console.error('[Clients] update error:', error.message);
    }
  }
}

export async function deleteClientDb(clientId: string): Promise<void> {
  const { error } = await supabase.from('clients').delete().eq('id', clientId);
  if (error) console.error('[Clients] delete error:', error.message);
}

// ─────────────────────────────────────────────────────────────
// Sessions
// ─────────────────────────────────────────────────────────────

export async function fetchSessions(userId: string): Promise<Session[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false });

  if (error) { console.error('[Sessions] fetch error:', error.message); return []; }
  return (data ?? []).map(mapSession);
}

export async function insertSession(userId: string, session: Omit<Session, 'id'>): Promise<Session | null> {
  const basePayload = {
    user_id:            userId,
    client_id:          session.clientId,
    date:               session.date,
    time:               session.time,
    duration:           session.duration,
    status:             session.status,
    notes:              session.notes,
    mood:               session.mood ?? null,
    topics:             session.topics,
    homework:           session.homework ?? null,
    next_session_goals: session.nextSessionGoals ?? null,
    is_paid:            session.isPaid,
    amount:             session.amount,
  };

  const { data, error } = await supabase
    .from('sessions')
    .insert({
      ...basePayload,
      appointment_id:     session.appointmentId ?? null,
    })
    .select()
    .single();

  if (!error) return mapSession(data);

  console.warn('[Sessions] insert with appointment_id failed, retrying without:', error.message);
  const { data: data2, error: error2 } = await supabase
    .from('sessions')
    .insert(basePayload)
    .select()
    .single();

  if (error2) { console.error('[Sessions] insert error:', error2.message); return null; }
  return mapSession(data2);
}

export async function updateSessionDb(sessionId: string, data: Partial<Session>): Promise<void> {
  const payload: Record<string, unknown> = {};
  const extended: Record<string, unknown> = {};
  if (data.appointmentId      !== undefined) extended.appointment_id      = data.appointmentId;
  if (data.date               !== undefined) payload.date               = data.date;
  if (data.time               !== undefined) payload.time               = data.time;
  if (data.duration           !== undefined) payload.duration           = data.duration;
  if (data.status             !== undefined) payload.status             = data.status;
  if (data.notes              !== undefined) payload.notes              = data.notes;
  if (data.mood               !== undefined) payload.mood               = data.mood;
  if (data.topics             !== undefined) payload.topics             = data.topics;
  if (data.homework           !== undefined) payload.homework           = data.homework;
  if (data.nextSessionGoals   !== undefined) payload.next_session_goals = data.nextSessionGoals;
  if (data.isPaid             !== undefined) payload.is_paid            = data.isPaid;
  if (data.amount             !== undefined) payload.amount             = data.amount;

  const { error } = await supabase.from('sessions').update({ ...payload, ...extended }).eq('id', sessionId);
  if (error) {
    if (Object.keys(extended).length > 0 && Object.keys(payload).length > 0) {
      console.warn('[Sessions] update with appointment_id failed, retrying:', error.message);
      const { error: error2 } = await supabase.from('sessions').update(payload).eq('id', sessionId);
      if (error2) console.error('[Sessions] update error:', error2.message);
    } else {
      console.error('[Sessions] update error:', error.message);
    }
  }
}

export async function deleteSessionDb(sessionId: string): Promise<void> {
  const { error } = await supabase.from('sessions').delete().eq('id', sessionId);
  if (error) console.error('[Sessions] delete error:', error.message);
}

// ─────────────────────────────────────────────────────────────
// Appointments
// ─────────────────────────────────────────────────────────────

export async function fetchAppointments(userId: string): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: true });

  if (error) { console.error('[Appointments] fetch error:', error.message); return []; }
  return (data ?? []).map(mapAppointment);
}

export async function insertAppointment(userId: string, apt: Omit<Appointment, 'id'>): Promise<Appointment | null> {
  const payload = {
    user_id:      userId,
    client_id:    apt.clientId ?? null,
    client_name:  apt.clientName,
    date:         apt.date,
    time:         apt.time,
    duration:     apt.duration,
    status:       apt.status,
    is_online:    apt.isOnline,
    meeting_link: apt.meetingLink ?? null,
    kind:         apt.kind ?? 'session',
    custom_type:  apt.customType ?? null,
  };

  const { data, error } = await supabase
    .from('appointments')
    .insert(payload)
    .select()
    .single();

  if (!error) return mapAppointment(data);

  // Backward compatibility: old schema may not have kind/custom_type columns.
  const { data: fallback, error: fallbackError } = await supabase
    .from('appointments')
    .insert({
      user_id:      userId,
      client_id:    apt.clientId ?? null,
      client_name:  apt.clientName,
      date:         apt.date,
      time:         apt.time,
      duration:     apt.duration,
      status:       apt.status,
      is_online:    apt.isOnline,
      meeting_link: apt.meetingLink ?? null,
    })
    .select()
    .single();

  if (fallbackError) { console.error('[Appointments] insert error:', fallbackError.message); return null; }
  return mapAppointment(fallback);
}

export async function updateAppointmentDb(aptId: string, data: Partial<Appointment>): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (data.clientId    !== undefined) payload.client_id    = data.clientId ?? null;
  if (data.clientName  !== undefined) payload.client_name  = data.clientName;
  if (data.date        !== undefined) payload.date         = data.date;
  if (data.time        !== undefined) payload.time         = data.time;
  if (data.duration    !== undefined) payload.duration     = data.duration;
  if (data.status      !== undefined) payload.status       = data.status;
  if (data.isOnline    !== undefined) payload.is_online    = data.isOnline;
  if (data.meetingLink !== undefined) payload.meeting_link = data.meetingLink;
  if (data.kind        !== undefined) payload.kind         = data.kind;
  if (data.customType  !== undefined) payload.custom_type  = data.customType;

  const { error } = await supabase.from('appointments').update(payload).eq('id', aptId);
  if (!error) return;

  const fallbackPayload = { ...payload };
  delete fallbackPayload.kind;
  delete fallbackPayload.custom_type;
  const { error: fallbackError } = await supabase.from('appointments').update(fallbackPayload).eq('id', aptId);
  if (fallbackError) console.error('[Appointments] update error:', fallbackError.message);
}

export async function deleteAppointmentDb(aptId: string): Promise<void> {
  const { error } = await supabase.from('appointments').delete().eq('id', aptId);
  if (error) console.error('[Appointments] delete error:', error.message);
}

// ─────────────────────────────────────────────────────────────
// Batch helpers (for schedule generation)
// ─────────────────────────────────────────────────────────────

export async function batchInsertAppointments(
  userId: string,
  apts: Omit<Appointment, 'id'>[],
): Promise<Appointment[]> {
  if (apts.length === 0) return [];
  const rows = apts.map(apt => ({
    user_id:      userId,
    client_id:    apt.clientId ?? null,
    client_name:  apt.clientName,
    date:         apt.date,
    time:         apt.time,
    duration:     apt.duration,
    status:       apt.status,
    is_online:    apt.isOnline,
    meeting_link: apt.meetingLink ?? null,
    kind:         apt.kind ?? 'session',
    custom_type:  apt.customType ?? null,
  }));
  const { data, error } = await supabase.from('appointments').insert(rows).select();
  if (!error) return (data ?? []).map(mapAppointment);

  const fallbackRows = apts.map(apt => ({
    user_id:      userId,
    client_id:    apt.clientId ?? null,
    client_name:  apt.clientName,
    date:         apt.date,
    time:         apt.time,
    duration:     apt.duration,
    status:       apt.status,
    is_online:    apt.isOnline,
    meeting_link: apt.meetingLink ?? null,
  }));
  const { data: fallback, error: fallbackError } = await supabase.from('appointments').insert(fallbackRows).select();
  if (fallbackError) { console.error('[Appointments] batch insert error:', fallbackError.message); return []; }
  return (fallback ?? []).map(mapAppointment);
}

export async function batchInsertSessions(
  userId: string,
  sessions: Omit<Session, 'id'>[],
): Promise<Session[]> {
  if (sessions.length === 0) return [];
  const rows = sessions.map(s => ({
    user_id:   userId,
    client_id: s.clientId,
    appointment_id: s.appointmentId ?? null,
    date:      s.date,
    time:      s.time,
    duration:  s.duration,
    status:    s.status,
    notes:     s.notes,
    topics:    s.topics,
    is_paid:   s.isPaid,
    amount:    s.amount,
  }));
  const { data, error } = await supabase.from('sessions').insert(rows).select();
  if (!error) return (data ?? []).map(mapSession);

  console.warn('[Sessions] batch insert with appointment_id failed, retrying without:', error.message);
  const fallbackRows = sessions.map(s => ({
    user_id:   userId,
    client_id: s.clientId,
    date:      s.date,
    time:      s.time,
    duration:  s.duration,
    status:    s.status,
    notes:     s.notes,
    topics:    s.topics,
    is_paid:   s.isPaid,
    amount:    s.amount,
  }));
  const { data: data2, error: error2 } = await supabase.from('sessions').insert(fallbackRows).select();
  if (error2) { console.error('[Sessions] batch insert error:', error2.message); return []; }
  return (data2 ?? []).map(mapSession);
}

// ─────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────

async function _fetchOrCreateProfile(
  userId: string,
  email: string,
  name: string,
): Promise<User> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (!error && data) return mapProfile(data);

  // Trigger didn't fire or row missing — create manually
  const defaultPackages = [
    { id: 'pkg1', name: TR("Базовый", "Base"),  sessions: 4,  price: 20000, discount: 10 },
    { id: 'pkg2', name: TR("Стандарт", "Standard"), sessions: 8,  price: 36000, discount: 15 },
    { id: 'pkg3', name: TR("Премиум", "Premium"),  sessions: 12, price: 48000, discount: 20 },
  ];

  const { data: created } = await supabase
    .from('profiles')
    .upsert({
      id: userId, email, name,
      therapy_type: '', hourly_rate: 5000, currency: '₽',
      bio: '', phone: '',
      working_hours: { start: '09:00', end: '18:00' },
      working_days: [1, 2, 3, 4, 5],
      packages: defaultPackages,
      onboarding_complete: false,
    })
    .select()
    .single();

  if (created) return mapProfile(created);

  // Last resort — return in-memory user
  return {
    id: userId, email, name,
    therapyType: '', hourlyRate: 5000, currency: '₽',
    bio: '', phone: '',
    workingHours: { start: '09:00', end: '18:00' },
    workingDays: [1, 2, 3, 4, 5],
    packages: defaultPackages,
    onboardingComplete: false,
  };
}

// ─────────────────────────────────────────────────────────────
// Backward compat (unused stubs so old imports don't break)
// ─────────────────────────────────────────────────────────────

export const clearAllAppData = () => { /* handled by Supabase auth.signOut */ };
export const useBackend = true;
