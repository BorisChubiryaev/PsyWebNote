import {
  createContext, useContext, useState, useEffect,
  useCallback, useRef, ReactNode,
} from 'react';
import { User, Client, Session, Appointment } from '../types';
import { addDays, format, startOfWeek, addWeeks, getDay } from 'date-fns';
import { supabase } from '../services/supabase';
import {
  AuthResult,
  authRegister, authLogin, authLogout, authGetCurrentUser, authUpdateProfile,
  fetchClients, insertClient, updateClientDb, deleteClientDb,
  fetchSessions, insertSession, updateSessionDb, deleteSessionDb,
  fetchAppointments, insertAppointment, updateAppointmentDb, deleteAppointmentDb,
  batchInsertAppointments, batchInsertSessions,
} from '../services/api';

// ─────────────────────────────────────────────────────────────
// Context type
// ─────────────────────────────────────────────────────────────

interface AppContextType {
  user: User | null;
  clients: Client[];
  sessions: Session[];
  appointments: Appointment[];
  isAuthenticated: boolean;
  loading: boolean;
  dataLoading: boolean;
  login:    (email: string, password: string) => Promise<AuthResult>;
  register: (email: string, password: string, name: string) => Promise<AuthResult>;
  logout:   () => Promise<void>;
  clearAllData: () => void;
  updateUser: (data: Partial<User>) => Promise<void>;
  addClient:    (client: Omit<Client, 'id' | 'createdAt'>) => Promise<void>;
  updateClient: (id: string, data: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  addSession:    (session: Omit<Session, 'id'>) => Promise<string>;
  updateSession: (id: string, data: Partial<Session>) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  addAppointment:    (appointment: Omit<Appointment, 'id'>) => Promise<Appointment | null>;
  updateAppointment: (id: string, data: Partial<Appointment>) => Promise<void>;
  deleteAppointment: (id: string) => Promise<void>;
  getClientById:         (id: string) => Client | undefined;
  getSessionsByClientId: (clientId: string) => Session[];
  generateAppointmentsForClient: (client: Client, weeksAhead?: number) => Promise<void>;
  completeSession:              (sessionId: string, data: Partial<Session>) => Promise<void>;
  ensureSessionForAppointment:  (appointment: Appointment) => Promise<string>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// ─────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser]               = useState<User | null>(null);
  const [clients, setClients]         = useState<Client[]>([]);
  const [sessions, setSessions]       = useState<Session[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading]         = useState(true);   // auth loading
  const [dataLoading, setDataLoading] = useState(false);  // data loading

  // Refs for latest state in async callbacks
  const sessionsRef     = useRef<Session[]>([]);
  const appointmentsRef = useRef<Appointment[]>([]);
  const userRef         = useRef<User | null>(null);

  useEffect(() => { sessionsRef.current = sessions; },         [sessions]);
  useEffect(() => { appointmentsRef.current = appointments; }, [appointments]);
  useEffect(() => { userRef.current = user; },                 [user]);

  // ── Bootstrap: check existing session ──────────────────────

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const profile = await authGetCurrentUser();
        if (mounted && profile) {
          setUser(profile);
          await loadAllData(profile.id);
        }
      } catch (e) {
        console.error('[Auth] init error:', e);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    // Listen for auth state changes (login / logout / token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === 'SIGNED_IN' && session?.user) {
          // Profile is set by login/register handlers; here we just ensure data
          if (!userRef.current) {
            const profile = await authGetCurrentUser();
            if (profile && mounted) {
              setUser(profile);
              await loadAllData(profile.id);
            }
          }
          setLoading(false);
        }

        if (event === 'SIGNED_OUT') {
          setUser(null);
          setClients([]);
          setSessions([]);
          setAppointments([]);
          sessionsRef.current = [];
          appointmentsRef.current = [];
          setLoading(false);
        }

        if (event === 'TOKEN_REFRESHED') {
          setLoading(false);
        }
      },
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load all user data ─────────────────────────────────────

  const loadAllData = async (userId: string) => {
    setDataLoading(true);
    try {
      const [cls, sess, apts] = await Promise.all([
        fetchClients(userId),
        fetchSessions(userId),
        fetchAppointments(userId),
      ]);
      setClients(cls);
      setSessions(sess);
      sessionsRef.current = sess;
      setAppointments(apts);
      appointmentsRef.current = apts;
    } catch (e) {
      console.error('[Data] load error:', e);
    } finally {
      setDataLoading(false);
    }
  };

  // ── Auth ───────────────────────────────────────────────────

  const login = async (email: string, password: string): Promise<AuthResult> => {
    setLoading(true);
    const result = await authLogin(email, password);
    if (result.success && result.user) {
      setUser(result.user);
      await loadAllData(result.user.id);
    }
    setLoading(false);
    return result;
  };

  const register = async (email: string, password: string, name: string): Promise<AuthResult> => {
    setLoading(true);
    const result = await authRegister(email, password, name);
    if (result.success && result.user) {
      setUser(result.user);
      // No data to load for new user
    }
    setLoading(false);
    return result;
  };

  const logout = async () => {
    await authLogout();
    setUser(null);
    setClients([]);
    setSessions([]);
    setAppointments([]);
    sessionsRef.current = [];
    appointmentsRef.current = [];
  };

  const clearAllData = () => logout();

  // ── Profile ────────────────────────────────────────────────

  const updateUser = async (data: Partial<User>) => {
    if (!userRef.current) return;
    const updated = { ...userRef.current, ...data };
    setUser(updated);
    userRef.current = updated;
    await authUpdateProfile(userRef.current.id, data);
  };

  // ── Session helpers ────────────────────────────────────────

  const ensureSessionForAppointment = useCallback(async (apt: Appointment): Promise<string> => {
    // First try to find by appointmentId
    const byAptId = sessionsRef.current.find(s => s.appointmentId === apt.id);
    if (byAptId) return byAptId.id;

    // Fallback: match by clientId + date + time
    const bySlot = sessionsRef.current.find(
      s => s.clientId === apt.clientId && s.date === apt.date && s.time === apt.time,
    );
    if (bySlot) {
      // Backfill appointmentId if missing
      if (!bySlot.appointmentId) {
        setSessions(prev => {
          const next = prev.map(s => s.id === bySlot.id ? { ...s, appointmentId: apt.id } : s);
          sessionsRef.current = next;
          return next;
        });
        await updateSessionDb(bySlot.id, { appointmentId: apt.id } as Partial<Session>);
      }
      return bySlot.id;
    }

    const u = userRef.current;
    if (!u) return '';

    const newSess = await insertSession(u.id, {
      clientId: apt.clientId,
      appointmentId: apt.id,
      date: apt.date, time: apt.time, duration: apt.duration,
      status: apt.status ?? 'scheduled', notes: '', topics: [], isPaid: false,
      amount: u.hourlyRate,
    });
    if (newSess) {
      setSessions(prev => {
        const next = [...prev, newSess];
        sessionsRef.current = next;
        return next;
      });
      return newSess.id;
    }
    return '';
  }, []);

  const generateAppointmentsForClient = useCallback(async (
    client: Client,
    weeksAhead = 8,
  ) => {
    const u = userRef.current;
    if (!u) return;

    const today = new Date();
    const newAptRows: Omit<Appointment, 'id'>[]  = [];
    const newSessRows: Omit<Session, 'id'>[]     = [];

    client.schedules.forEach(schedule => {
      for (let w = 0; w < weeksAhead; w++) {
        const weekStart = startOfWeek(addWeeks(today, w), { weekStartsOn: 1 });
        let target = weekStart;
        while (getDay(target) !== schedule.dayOfWeek) target = addDays(target, 1);
        const dateStr = format(target, 'yyyy-MM-dd');
        if (target < today && dateStr !== format(today, 'yyyy-MM-dd')) continue;

        const aptExists = appointmentsRef.current.some(
          a => a.clientId === client.id && a.date === dateStr && a.time === schedule.time,
        );
        if (aptExists) continue;

        newAptRows.push({
          clientId: client.id, clientName: client.name,
          date: dateStr, time: schedule.time, duration: schedule.duration,
          status: 'scheduled', isOnline: client.isOnline, meetingLink: client.meetingLink,
        });

        const sessExists = sessionsRef.current.some(
          s => s.clientId === client.id && s.date === dateStr && s.time === schedule.time,
        );
        if (!sessExists) {
          newSessRows.push({
            clientId: client.id,
            date: dateStr, time: schedule.time, duration: schedule.duration,
            status: 'scheduled', notes: '', topics: [], isPaid: false,
            amount: u.hourlyRate,
          });
        }
      }
    });

    const [insertedApts, insertedSess] = await Promise.all([
      batchInsertAppointments(u.id, newAptRows),
      batchInsertSessions(u.id, newSessRows),
    ]);

    if (insertedApts.length > 0) {
      setAppointments(prev => {
        const next = [...prev, ...insertedApts];
        appointmentsRef.current = next;
        return next;
      });
    }
    if (insertedSess.length > 0) {
      setSessions(prev => {
        const next = [...prev, ...insertedSess];
        sessionsRef.current = next;
        return next;
      });
    }
  }, []);

  // ── Clients CRUD ───────────────────────────────────────────

  const addClient = async (clientData: Omit<Client, 'id' | 'createdAt'>) => {
    const u = userRef.current;
    if (!u) return;

    const created = await insertClient(u.id, clientData);
    if (!created) return;

    setClients(prev => [...prev, created]);
    if (created.schedules.length > 0) {
      await generateAppointmentsForClient(created);
    }
  };

  const updateClient = useCallback(async (id: string, data: Partial<Client>) => {
    // Optimistic update
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));

    await updateClientDb(id, data);

    if (data.schedules) {
      const u = userRef.current;
      if (!u) return;

      // Remove future appointments & regenerate
      const futureApts = appointmentsRef.current.filter(
        a => a.clientId === id && new Date(a.date) >= new Date(),
      );
      await Promise.all(futureApts.map(a => deleteAppointmentDb(a.id)));

      const updatedClient = { ...clients.find(c => c.id === id)!, ...data };
      setAppointments(prev => {
        const filtered = prev.filter(
          a => a.clientId !== id || new Date(a.date) < new Date(),
        );
        appointmentsRef.current = filtered;
        return filtered;
      });
      await generateAppointmentsForClient(updatedClient);
    }

    if (data.name) {
      const aptUpdates = appointmentsRef.current
        .filter(a => a.clientId === id)
        .map(a => updateAppointmentDb(a.id, { clientName: data.name }));
      await Promise.all(aptUpdates);
      setAppointments(prev =>
        prev.map(a => a.clientId === id ? { ...a, clientName: data.name! } : a),
      );
    }
  }, [clients, generateAppointmentsForClient]);

  const deleteClient = async (id: string) => {
    await deleteClientDb(id);
    setClients(prev => prev.filter(c => c.id !== id));
    setSessions(prev => {
      const next = prev.filter(s => s.clientId !== id);
      sessionsRef.current = next;
      return next;
    });
    setAppointments(prev => {
      const next = prev.filter(a => a.clientId !== id);
      appointmentsRef.current = next;
      return next;
    });
  };

  // ── Sessions CRUD ──────────────────────────────────────────

  const addSession = async (session: Omit<Session, 'id'>): Promise<string> => {
    const u = userRef.current;
    if (!u) return '';

    const created = await insertSession(u.id, session);
    if (!created) return '';

    setSessions(prev => {
      const next = [...prev, created];
      sessionsRef.current = next;
      return next;
    });
    return created.id;
  };

  const updateSession = async (id: string, data: Partial<Session>) => {
    const old = sessionsRef.current.find(s => s.id === id);
    const wasNotCompleted = old?.status !== 'completed';
    const isNowCompleted  = data.status === 'completed';

    // Optimistic update
    setSessions(prev => {
      const next = prev.map(s => s.id === id ? { ...s, ...data } : s);
      sessionsRef.current = next;
      return next;
    });

    await updateSessionDb(id, data);

    // Sync appointment status
    if (data.status && old) {
      const aptToUpdate = appointmentsRef.current.find(
        a => a.clientId === old.clientId && a.date === old.date && a.time === old.time,
      );
      if (aptToUpdate) {
        setAppointments(prev =>
          prev.map(a => a.id === aptToUpdate.id ? { ...a, status: data.status! } : a),
        );
        await updateAppointmentDb(aptToUpdate.id, { status: data.status });
      }
    }

    // Deduct from package
    if (wasNotCompleted && isNowCompleted && old) {
      const client = clients.find(c => c.id === old.clientId);
      if (client?.packageId && client.remainingSessions > 0) {
        const newRemaining = client.remainingSessions - 1;
        setClients(prev =>
          prev.map(c => c.id === old.clientId
            ? { ...c, remainingSessions: newRemaining }
            : c,
          ),
        );
        await updateClientDb(old.clientId, { remainingSessions: newRemaining });
      }
    }
  };

  const completeSession = async (sessionId: string, data: Partial<Session>) => {
    await updateSession(sessionId, data);
  };

  const deleteSession = async (id: string) => {
    await deleteSessionDb(id);
    setSessions(prev => {
      const next = prev.filter(s => s.id !== id);
      sessionsRef.current = next;
      return next;
    });
  };

  // ── Appointments CRUD ──────────────────────────────────────

  const addAppointment = async (apt: Omit<Appointment, 'id'>): Promise<Appointment | null> => {
    const u = userRef.current;
    if (!u) return null;

    const created = await insertAppointment(u.id, apt);
    if (!created) return null;

    setAppointments(prev => {
      const next = [...prev, created];
      appointmentsRef.current = next;
      return next;
    });

    // Ensure session exists and link appointmentId
    await ensureSessionForAppointment(created);
    return created;
  };

  const updateAppointment = async (id: string, data: Partial<Appointment>) => {
    setAppointments(prev => {
      const next = prev.map(a => a.id === id ? { ...a, ...data } : a);
      appointmentsRef.current = next;
      return next;
    });

    await updateAppointmentDb(id, data);

    // Sync session status
    if (data.status) {
      const apt = appointmentsRef.current.find(a => a.id === id);
      if (apt) {
        const sess = sessionsRef.current.find(
          s => s.clientId === apt.clientId && s.date === apt.date && s.time === apt.time,
        );
        if (sess) {
          setSessions(prev => {
            const next = prev.map(s => s.id === sess.id ? { ...s, status: data.status! } : s);
            sessionsRef.current = next;
            return next;
          });
          await updateSessionDb(sess.id, { status: data.status });
        }
      }
    }
  };

  const deleteAppointment = async (id: string) => {
    await deleteAppointmentDb(id);
    setAppointments(prev => {
      const next = prev.filter(a => a.id !== id);
      appointmentsRef.current = next;
      return next;
    });
  };

  // ── Getters ────────────────────────────────────────────────

  const getClientById = (id: string) => clients.find(c => c.id === id);

  const getSessionsByClientId = (clientId: string) =>
    sessions
      .filter(s => s.clientId === clientId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // ── Render ─────────────────────────────────────────────────

  return (
    <AppContext.Provider value={{
      user, clients, sessions, appointments,
      loading, dataLoading,
      isAuthenticated: !!user,
      login, register, logout, clearAllData, updateUser,
      addClient, updateClient, deleteClient,
      addSession, updateSession, deleteSession,
      addAppointment, updateAppointment, deleteAppointment,
      getClientById, getSessionsByClientId,
      generateAppointmentsForClient, completeSession,
      ensureSessionForAppointment,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
