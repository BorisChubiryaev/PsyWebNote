import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { User, Client, Session, Appointment } from '../types';
import { addDays, format, startOfWeek, addWeeks, getDay } from 'date-fns';
import {
  authLogin, authRegister, authLogout, authGetCurrentUser, authUpdateProfile,
  loadUserData, saveUserData, clearAllAppData, AuthResult,
} from '../services/api';

// ── Context types ───────────────────────────────────────────

interface AppContextType {
  user: User | null;
  clients: Client[];
  sessions: Session[];
  appointments: Appointment[];
  isAuthenticated: boolean;
  loading: boolean;
  login:    (email: string, password: string) => Promise<AuthResult>;
  register: (email: string, password: string, name: string) => Promise<AuthResult>;
  logout:   () => void;
  clearAllData: () => void;
  updateUser: (data: Partial<User>) => void;
  addClient:    (client: Omit<Client, 'id' | 'createdAt'>) => void;
  updateClient: (id: string, data: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  addSession:    (session: Omit<Session, 'id'>) => string;
  updateSession: (id: string, data: Partial<Session>) => void;
  deleteSession: (id: string) => void;
  addAppointment:    (appointment: Omit<Appointment, 'id'>) => void;
  updateAppointment: (id: string, data: Partial<Appointment>) => void;
  deleteAppointment: (id: string) => void;
  getClientById:         (id: string) => Client | undefined;
  getSessionsByClientId: (clientId: string) => Session[];
  generateAppointmentsForClient: (client: Client, weeksAhead?: number) => void;
  completeSession:              (sessionId: string, data: Partial<Session>) => void;
  ensureSessionForAppointment:  (appointment: Appointment) => string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// ── Provider ────────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser]               = useState<User | null>(() => authGetCurrentUser());
  const [clients, setClients]         = useState<Client[]>([]);
  const [sessions, setSessions]       = useState<Session[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading]                     = useState(false);

  const sessionsRef = useRef<Session[]>([]);
  const appointmentsRef = useRef<Appointment[]>([]);

  // Keep refs in sync
  useEffect(() => { sessionsRef.current = sessions; },     [sessions]);
  useEffect(() => { appointmentsRef.current = appointments; }, [appointments]);

  // Load data when user changes
  useEffect(() => {
    if (user) {
      const d = loadUserData(user.id);
      setClients(d.clients);
      setSessions(d.sessions);
      sessionsRef.current = d.sessions;
      setAppointments(d.appointments);
      appointmentsRef.current = d.appointments;
    } else {
      setClients([]);
      setSessions([]);
      sessionsRef.current = [];
      setAppointments([]);
      appointmentsRef.current = [];
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist data whenever it changes
  useEffect(() => {
    if (user) saveUserData(user.id, { clients, sessions, appointments });
  }, [clients, sessions, appointments]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auth ─────────────────────────────────────────────────

  const login = async (email: string, password: string): Promise<AuthResult> => {
    const result = await authLogin(email, password);
    if (result.success && result.user) setUser(result.user);
    return result;
  };

  const register = async (email: string, password: string, name: string): Promise<AuthResult> => {
    const result = await authRegister(email, password, name);
    if (result.success && result.user) setUser(result.user);
    return result;
  };

  const logout = () => {
    authLogout();
    setUser(null);
  };

  const clearAllData = () => {
    clearAllAppData();
    setUser(null);
  };

  // ── Profile ───────────────────────────────────────────────

  const updateUser = (data: Partial<User>) => {
    if (!user) return;
    const updated = { ...user, ...data };
    setUser(updated);
    authUpdateProfile(user.id, data);
  };

  // ── Session helpers ───────────────────────────────────────

  const ensureSessionForAppointment = useCallback((apt: Appointment): string => {
    const existing = sessionsRef.current.find(
      s => s.clientId === apt.clientId && s.date === apt.date && s.time === apt.time,
    );
    if (existing) return existing.id;

    const newId = crypto.randomUUID();
    const newSession: Session = {
      id: newId, clientId: apt.clientId,
      date: apt.date, time: apt.time, duration: apt.duration,
      status: 'scheduled', notes: '', topics: [], isPaid: false,
      amount: user?.hourlyRate || 5000,
    };
    setSessions(prev => {
      const next = [...prev, newSession];
      sessionsRef.current = next;
      return next;
    });
    return newId;
  }, [user]);

  const generateAppointmentsForClient = useCallback((client: Client, weeksAhead = 8) => {
    const today = new Date();
    const newApts: Appointment[]  = [];
    const newSess: Session[]      = [];

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

        const aptId  = crypto.randomUUID();
        const sessId = crypto.randomUUID();

        newApts.push({
          id: aptId, clientId: client.id, clientName: client.name,
          date: dateStr, time: schedule.time, duration: schedule.duration,
          status: 'scheduled', isOnline: client.isOnline, meetingLink: client.meetingLink,
        });

        const sessExists = sessionsRef.current.some(
          s => s.clientId === client.id && s.date === dateStr && s.time === schedule.time,
        );
        if (!sessExists) {
          newSess.push({
            id: sessId, clientId: client.id,
            date: dateStr, time: schedule.time, duration: schedule.duration,
            status: 'scheduled', notes: '', topics: [], isPaid: false,
            amount: user?.hourlyRate || 5000,
          });
        }
      }
    });

    if (newApts.length > 0) {
      setAppointments(prev => {
        const next = [...prev, ...newApts];
        appointmentsRef.current = next;
        return next;
      });
    }
    if (newSess.length > 0) {
      setSessions(prev => {
        const next = [...prev, ...newSess];
        sessionsRef.current = next;
        return next;
      });
    }
  }, [user]);

  // ── Clients CRUD ──────────────────────────────────────────

  const addClient = (clientData: Omit<Client, 'id' | 'createdAt'>) => {
    const newClient: Client = {
      ...clientData,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    setClients(prev => [...prev, newClient]);
    if (newClient.schedules.length > 0) {
      setTimeout(() => generateAppointmentsForClient(newClient), 100);
    }
  };

  const updateClient = useCallback((id: string, data: Partial<Client>) => {
    setClients(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, ...data } : c);
      const updatedClient = updated.find(c => c.id === id);

      if (data.schedules && updatedClient) {
        // Remove future appointments, regenerate
        setAppointments(prevApt => {
          const filtered = prevApt.filter(
            a => a.clientId !== id || new Date(a.date) < new Date(),
          );
          appointmentsRef.current = filtered;
          return filtered;
        });
        setTimeout(() => generateAppointmentsForClient(updatedClient), 100);
      }

      if (data.name) {
        setAppointments(prevApt =>
          prevApt.map(a => a.clientId === id ? { ...a, clientName: data.name! } : a),
        );
      }

      return updated;
    });
  }, [generateAppointmentsForClient]);

  const deleteClient = (id: string) => {
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

  // ── Sessions CRUD ─────────────────────────────────────────

  const addSession = (session: Omit<Session, 'id'>): string => {
    const id = crypto.randomUUID();
    const newSession: Session = { ...session, id };
    setSessions(prev => {
      const next = [...prev, newSession];
      sessionsRef.current = next;
      return next;
    });
    return id;
  };

  const updateSession = (id: string, data: Partial<Session>) => {
    const old = sessionsRef.current.find(s => s.id === id);
    const wasNotCompleted = old?.status !== 'completed';
    const isNowCompleted  = data.status === 'completed';

    setSessions(prev => {
      const next = prev.map(s => s.id === id ? { ...s, ...data } : s);
      sessionsRef.current = next;
      return next;
    });

    // Sync appointment status
    if (data.status && old) {
      setAppointments(prev =>
        prev.map(a =>
          a.clientId === old.clientId && a.date === old.date && a.time === old.time
            ? { ...a, status: data.status! }
            : a,
        ),
      );
    }

    // Deduct from package
    if (wasNotCompleted && isNowCompleted && old) {
      setClients(prev =>
        prev.map(c => {
          if (c.id !== old.clientId) return c;
          if (c.packageId && c.remainingSessions > 0) {
            return { ...c, remainingSessions: c.remainingSessions - 1 };
          }
          return c;
        }),
      );
    }
  };

  const completeSession = (sessionId: string, data: Partial<Session>) => {
    updateSession(sessionId, data);
  };

  const deleteSession = (id: string) => {
    setSessions(prev => {
      const next = prev.filter(s => s.id !== id);
      sessionsRef.current = next;
      return next;
    });
  };

  // ── Appointments CRUD ─────────────────────────────────────

  const addAppointment = (appointment: Omit<Appointment, 'id'>) => {
    const newApt: Appointment = { ...appointment, id: crypto.randomUUID() };
    setAppointments(prev => {
      const next = [...prev, newApt];
      appointmentsRef.current = next;
      return next;
    });
    // Ensure session exists
    setTimeout(() => ensureSessionForAppointment(newApt), 50);
  };

  const updateAppointment = (id: string, data: Partial<Appointment>) => {
    setAppointments(prev => {
      const next = prev.map(a => a.id === id ? { ...a, ...data } : a);
      appointmentsRef.current = next;
      return next;
    });
    // Sync session status
    if (data.status) {
      const apt = appointmentsRef.current.find(a => a.id === id);
      if (apt) {
        setSessions(prev => {
          const next = prev.map(s =>
            s.clientId === apt.clientId && s.date === apt.date && s.time === apt.time
              ? { ...s, status: data.status! }
              : s,
          );
          sessionsRef.current = next;
          return next;
        });
      }
    }
  };

  const deleteAppointment = (id: string) => {
    setAppointments(prev => {
      const next = prev.filter(a => a.id !== id);
      appointmentsRef.current = next;
      return next;
    });
  };

  // ── Getters ───────────────────────────────────────────────

  const getClientById = (id: string) => clients.find(c => c.id === id);

  const getSessionsByClientId = (clientId: string) =>
    sessions
      .filter(s => s.clientId === clientId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <AppContext.Provider value={{
      user, clients, sessions, appointments, loading,
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
