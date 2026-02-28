import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { User, Client, Session, Appointment, Package } from '../types';
import { addDays, format, startOfWeek, addWeeks, getDay } from 'date-fns';
import { api, useBackend, storage, hashPassword, verifyPassword } from '../services/api';

interface AppContextType {
  user: User | null;
  clients: Client[];
  sessions: Session[];
  appointments: Appointment[];
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
  addClient: (client: Omit<Client, 'id' | 'createdAt'>) => void;
  updateClient: (id: string, data: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  addSession: (session: Omit<Session, 'id'>) => string;
  updateSession: (id: string, data: Partial<Session>) => void;
  deleteSession: (id: string) => void;
  addAppointment: (appointment: Omit<Appointment, 'id'>) => void;
  updateAppointment: (id: string, data: Partial<Appointment>) => void;
  deleteAppointment: (id: string) => void;
  getClientById: (id: string) => Client | undefined;
  getSessionsByClientId: (clientId: string) => Session[];
  generateAppointmentsForClient: (client: Client, weeksAhead?: number) => void;
  completeSession: (sessionId: string, sessionData: Partial<Session>) => void;
  ensureSessionForAppointment: (appointment: Appointment) => string;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const defaultPackages: Package[] = [
  { id: '1', name: 'Базовый', sessions: 4, price: 20000, discount: 10 },
  { id: '2', name: 'Стандарт', sessions: 8, price: 36000, discount: 15 },
  { id: '3', name: 'Премиум', sessions: 12, price: 48000, discount: 20 },
];

// ── Demo Data (localStorage mode only) ──────────────────────

const createDemoData = () => {
  const today = new Date();
  const formatDate = (d: Date) => format(d, 'yyyy-MM-dd');

  const demoClients: Client[] = [
    {
      id: 'demo-client-1', name: 'Мария Сидорова',
      phone: '+7 (999) 123-45-67', email: 'maria@example.com',
      socialLinks: [{ type: 'telegram', url: 'https://t.me/maria' }],
      notes: 'Обратилась с тревожным расстройством.',
      packageId: '2', remainingSessions: 5,
      schedules: [{ id: 's1', dayOfWeek: 2, time: '10:00', duration: 60 }],
      meetingLink: 'https://zoom.us/j/123456789', isOnline: true,
      createdAt: new Date(today.getTime() - 90 * 86400000).toISOString(), status: 'active',
    },
    {
      id: 'demo-client-2', name: 'Алексей Петров',
      phone: '+7 (999) 234-56-78',
      socialLinks: [{ type: 'whatsapp', url: 'https://wa.me/79992345678' }],
      notes: 'Работаем над управлением гневом.',
      remainingSessions: 0,
      schedules: [{ id: 's2', dayOfWeek: 4, time: '14:00', duration: 60 }],
      isOnline: false,
      createdAt: new Date(today.getTime() - 60 * 86400000).toISOString(), status: 'active',
    },
    {
      id: 'demo-client-3', name: 'Елена Козлова',
      phone: '+7 (999) 345-67-89', socialLinks: [],
      notes: 'Работа с самооценкой и личными границами.',
      packageId: '1', remainingSessions: 2,
      schedules: [
        { id: 's3', dayOfWeek: 1, time: '11:00', duration: 60 },
        { id: 's4', dayOfWeek: 5, time: '11:00', duration: 60 },
      ],
      meetingLink: 'https://meet.google.com/abc-defg-hij', isOnline: true,
      createdAt: new Date(today.getTime() - 30 * 86400000).toISOString(), status: 'active',
    },
  ];

  const demoSessions: Session[] = [
    {
      id: 'demo-session-1', clientId: 'demo-client-1',
      date: formatDate(new Date(today.getTime() - 7 * 86400000)),
      time: '10:00', duration: 60, status: 'completed',
      notes: 'Обсудили прогресс с дыхательными упражнениями.',
      mood: 7, topics: ['Тревожность', 'Дыхательные техники'],
      homework: 'Продолжать ведение дневника тревоги.',
      nextSessionGoals: 'Начать работу с когнитивными искажениями',
      isPaid: true, amount: 4500,
    },
    {
      id: 'demo-session-2', clientId: 'demo-client-2',
      date: formatDate(new Date(today.getTime() - 3 * 86400000)),
      time: '14:00', duration: 60, status: 'completed',
      notes: 'Разобрали конфликтную ситуацию на работе.',
      mood: 6, topics: ['Управление гневом', 'Конфликты'],
      homework: 'Вести дневник триггеров.',
      isPaid: true, amount: 5000,
    },
    {
      id: 'demo-session-3', clientId: 'demo-client-3',
      date: formatDate(new Date(today.getTime() - 2 * 86400000)),
      time: '11:00', duration: 60, status: 'completed',
      notes: 'Работали над установкой границ с родителями.',
      mood: 8, topics: ['Личные границы', 'Семейные отношения'],
      homework: 'Написать письмо с выражением чувств.',
      nextSessionGoals: 'Обсудить результаты упражнения',
      isPaid: true, amount: 5000,
    },
    {
      id: 'demo-session-4', clientId: 'demo-client-1',
      date: formatDate(new Date(today.getTime() - 14 * 86400000)),
      time: '10:00', duration: 60, status: 'completed',
      notes: 'Первичная консультация. Сбор анамнеза.',
      mood: 5, topics: ['Первичная консультация'],
      isPaid: true, amount: 4500,
    },
    {
      id: 'demo-session-5', clientId: 'demo-client-2',
      date: formatDate(new Date(today.getTime() - 10 * 86400000)),
      time: '14:00', duration: 60, status: 'completed',
      notes: 'Работа с техниками релаксации.',
      mood: 6, topics: ['Релаксация'],
      isPaid: true, amount: 5000,
    },
    {
      id: 'demo-session-6', clientId: 'demo-client-3',
      date: formatDate(new Date(today.getTime() - 9 * 86400000)),
      time: '11:00', duration: 60, status: 'completed',
      notes: 'Работа с установками.',
      mood: 7, topics: ['Самооценка', 'Установки'],
      isPaid: true, amount: 5000,
    },
  ];

  const demoAppointments: Appointment[] = [];
  const demoAppointmentSessions: Session[] = [];

  demoClients.forEach(client => {
    client.schedules.forEach(schedule => {
      for (let week = 0; week < 4; week++) {
        const weekStart = startOfWeek(addWeeks(today, week), { weekStartsOn: 1 });
        let targetDate = weekStart;
        while (getDay(targetDate) !== schedule.dayOfWeek) {
          targetDate = addDays(targetDate, 1);
        }
        if (targetDate < today && format(targetDate, 'yyyy-MM-dd') !== format(today, 'yyyy-MM-dd')) continue;

        const dateStr = formatDate(targetDate);
        const aptId = crypto.randomUUID();
        const sessionId = crypto.randomUUID();

        demoAppointments.push({
          id: aptId, clientId: client.id, clientName: client.name,
          date: dateStr, time: schedule.time, duration: schedule.duration,
          status: 'scheduled', isOnline: client.isOnline, meetingLink: client.meetingLink,
        });

        demoAppointmentSessions.push({
          id: sessionId, clientId: client.id,
          date: dateStr, time: schedule.time, duration: schedule.duration,
          status: 'scheduled', notes: '', topics: [], isPaid: false, amount: 5000,
        });
      }
    });
  });

  return {
    demoClients,
    demoSessions: [...demoSessions, ...demoAppointmentSessions],
    demoAppointments,
  };
};

// ── Provider ────────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => api.getUser());
  const [clients, setClients] = useState<Client[]>(() => api.getClients());
  const [sessions, setSessions] = useState<Session[]>(() => api.getSessions());
  const [appointments, setAppointments] = useState<Appointment[]>(() => api.getAppointments());
  const [loading, setLoading] = useState(false);

  const sessionsRef = useRef<Session[]>(sessions);
  useEffect(() => { sessionsRef.current = sessions; }, [sessions]);

  // ── Persist to localStorage (always, as cache) ──
  useEffect(() => { api.saveUser(user); }, [user]);
  useEffect(() => { api.saveClients(clients); }, [clients]);
  useEffect(() => { api.saveSessions(sessions); }, [sessions]);
  useEffect(() => { api.saveAppointments(appointments); }, [appointments]);

  // ── Backend: Fetch all data after login ──
  const fetchDataFromBackend = useCallback(async () => {
    if (!useBackend) return;
    setLoading(true);
    try {
      const data = await api.fetchAllData();
      if (data) {
        setClients(data.clients);
        setSessions(data.sessions);
        sessionsRef.current = data.sessions;
        setAppointments(data.appointments);
      }
    } catch (err) {
      console.error('Failed to fetch data from backend:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Auth ──────────────────────────────────────────────────

  const login = async (email: string, password: string): Promise<boolean> => {
    if (useBackend) {
      const u = await api.login(email, password);
      if (u) {
        setUser(u);
        // Fetch all data from backend
        setTimeout(fetchDataFromBackend, 0);
        return true;
      }
      return false;
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
          if (match) {
            setUser(u);
            return true;
          }
        }
      }
      return false;
    }
  };

  const register = async (email: string, password: string, name: string): Promise<boolean> => {
    if (useBackend) {
      const u = await api.register(email, password, name);
      if (u) {
        setUser(u);
        // No demo data in backend mode — start with clean account
        setClients([]);
        setSessions([]);
        sessionsRef.current = [];
        setAppointments([]);
        return true;
      }
      return false;
    } else {
      const users = storage.get<User[]>('users', []);
      if (users.find(u => u.email === email)) return false;

      const hashed = await hashPassword(password);
      const newUser: User = {
        id: crypto.randomUUID(), email, password: hashed, name,
        therapyType: 'Когнитивно-поведенческая терапия (КПТ)',
        hourlyRate: 5000, currency: '₽',
        packages: defaultPackages,
        bio: 'Практикующий психолог с опытом работы более 5 лет.',
        phone: '+7 (999) 000-00-00',
        workingHours: { start: '09:00', end: '18:00' },
        workingDays: [1, 2, 3, 4, 5],
      };

      const { demoClients, demoSessions, demoAppointments } = createDemoData();
      setClients(demoClients);
      setSessions(demoSessions);
      sessionsRef.current = demoSessions;
      setAppointments(demoAppointments);
      storage.set('users', [...users, newUser]);
      setUser(newUser);
      return true;
    }
  };

  const logout = () => {
    api.logout();
    setUser(null);
    if (useBackend) {
      // In backend mode, clear local data on logout
      setClients([]);
      setSessions([]);
      sessionsRef.current = [];
      setAppointments([]);
    }
  };

  // ── Profile ───────────────────────────────────────────────

  const updateUser = (data: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...data };
      setUser(updatedUser);

      if (useBackend) {
        api.syncProfile(data);
      } else {
        const users = storage.get<User[]>('users', []);
        storage.set('users', users.map(u => u.id === user.id ? updatedUser : u));
      }
    }
  };

  // ── Sessions helper ───────────────────────────────────────

  const ensureSessionForAppointment = useCallback((apt: Appointment): string => {
    const current = sessionsRef.current;
    const existing = current.find(s =>
      s.clientId === apt.clientId && s.date === apt.date && s.time === apt.time
    );
    if (existing) return existing.id;

    const newId = crypto.randomUUID();
    const newSession: Session = {
      id: newId, clientId: apt.clientId,
      date: apt.date, time: apt.time, duration: apt.duration,
      status: apt.status || 'scheduled',
      notes: '', topics: [], isPaid: false,
      amount: user?.hourlyRate || 5000,
    };
    setSessions(prev => [...prev, newSession]);
    sessionsRef.current = [...sessionsRef.current, newSession];
    api.syncSession('create', newSession);
    return newId;
  }, [user]);

  const generateAppointmentsForClient = useCallback((client: Client, weeksAhead: number = 8) => {
    const today = new Date();
    const newAppointments: Appointment[] = [];
    const newSessions: Session[] = [];

    client.schedules.forEach(schedule => {
      for (let week = 0; week < weeksAhead; week++) {
        const weekStart = startOfWeek(addWeeks(today, week), { weekStartsOn: 1 });
        let targetDate = weekStart;
        while (getDay(targetDate) !== schedule.dayOfWeek) {
          targetDate = addDays(targetDate, 1);
        }
        const dateStr = format(targetDate, 'yyyy-MM-dd');
        if (targetDate < today && dateStr !== format(today, 'yyyy-MM-dd')) continue;

        const existsApt = appointments.some(a =>
          a.clientId === client.id && a.date === dateStr && a.time === schedule.time
        );
        if (existsApt) continue;

        const aptId = crypto.randomUUID();
        const sessId = crypto.randomUUID();

        const newApt: Appointment = {
          id: aptId, clientId: client.id, clientName: client.name,
          date: dateStr, time: schedule.time, duration: schedule.duration,
          status: 'scheduled', isOnline: client.isOnline, meetingLink: client.meetingLink,
        };
        newAppointments.push(newApt);

        const existsSess = sessionsRef.current.some(s =>
          s.clientId === client.id && s.date === dateStr && s.time === schedule.time
        );
        if (!existsSess) {
          const newSess: Session = {
            id: sessId, clientId: client.id,
            date: dateStr, time: schedule.time, duration: schedule.duration,
            status: 'scheduled', notes: '', topics: [], isPaid: false,
            amount: user?.hourlyRate || 5000,
          };
          newSessions.push(newSess);
        }
      }
    });

    if (newAppointments.length > 0) {
      setAppointments(prev => [...prev, ...newAppointments]);
      newAppointments.forEach(a => api.syncAppointment('create', a));
    }
    if (newSessions.length > 0) {
      setSessions(prev => [...prev, ...newSessions]);
      sessionsRef.current = [...sessionsRef.current, ...newSessions];
      newSessions.forEach(s => api.syncSession('create', s));
    }
  }, [appointments, user]);

  // ── Clients CRUD ──────────────────────────────────────────

  const addClient = (clientData: Omit<Client, 'id' | 'createdAt'>) => {
    const newClient: Client = { ...clientData, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
    setClients(prev => [...prev, newClient]);
    api.syncClient('create', newClient);

    if (newClient.schedules.length > 0) {
      setTimeout(() => generateAppointmentsForClient(newClient), 100);
    }
  };

  const updateClient = (id: string, data: Partial<Client>) => {
    setClients(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, ...data } : c);
      const updatedClient = updated.find(c => c.id === id);

      if (data.schedules && updatedClient) {
        setAppointments(prevApt => prevApt.filter(a => {
          if (a.clientId !== id) return true;
          return new Date(a.date) < new Date();
        }));
        setTimeout(() => {
          if (updatedClient) generateAppointmentsForClient(updatedClient);
        }, 100);
      }

      if (data.name) {
        setAppointments(prevApt => prevApt.map(a =>
          a.clientId === id ? { ...a, clientName: data.name! } : a
        ));
      }

      // Sync to backend
      if (updatedClient) {
        api.syncClient('update', updatedClient, data);
      }

      return updated;
    });
  };

  const deleteClient = (id: string) => {
    const client = clients.find(c => c.id === id);
    if (client) {
      api.syncClient('delete', client);
    }
    setClients(prev => prev.filter(c => c.id !== id));
    setSessions(prev => prev.filter(s => s.clientId !== id));
    setAppointments(prev => prev.filter(a => a.clientId !== id));
  };

  // ── Sessions CRUD ─────────────────────────────────────────

  const addSession = (session: Omit<Session, 'id'>): string => {
    const newId = crypto.randomUUID();
    const newSession: Session = { ...session, id: newId };
    setSessions(prev => [...prev, newSession]);
    sessionsRef.current = [...sessionsRef.current, newSession];
    api.syncSession('create', newSession);
    return newId;
  };

  const completeSession = (sessionId: string, sessionData: Partial<Session>) => {
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, ...sessionData } : s));
    const session = sessionsRef.current.find(s => s.id === sessionId);
    if (session) {
      api.syncSession('update', session, sessionData);
      if (sessionData.status === 'completed') {
        const client = clients.find(c => c.id === session.clientId);
        if (client && client.packageId && client.remainingSessions && client.remainingSessions > 0) {
          updateClient(client.id, { remainingSessions: client.remainingSessions - 1 });
        }
      }
    }
  };

  const updateSession = (id: string, data: Partial<Session>) => {
    const oldSession = sessionsRef.current.find(s => s.id === id);
    const wasNotCompleted = oldSession?.status !== 'completed';
    const isNowCompleted = data.status === 'completed';

    setSessions(prev => {
      const updated = prev.map(s => s.id === id ? { ...s, ...data } : s);
      sessionsRef.current = updated;
      return updated;
    });

    if (oldSession) {
      api.syncSession('update', oldSession, data);
    }

    if (wasNotCompleted && isNowCompleted && oldSession) {
      const client = clients.find(c => c.id === oldSession.clientId);
      if (client && client.packageId && client.remainingSessions && client.remainingSessions > 0) {
        updateClient(client.id, { remainingSessions: client.remainingSessions - 1 });
      }
    }
  };

  const deleteSession = (id: string) => {
    const session = sessionsRef.current.find(s => s.id === id);
    if (session) {
      api.syncSession('delete', session);
    }
    setSessions(prev => prev.filter(s => s.id !== id));
  };

  // ── Appointments CRUD ─────────────────────────────────────

  const addAppointment = (appointment: Omit<Appointment, 'id'>) => {
    const newApt: Appointment = { ...appointment, id: crypto.randomUUID() };
    setAppointments(prev => [...prev, newApt]);
    api.syncAppointment('create', newApt);
  };

  const updateAppointment = (id: string, data: Partial<Appointment>) => {
    setAppointments(prev => {
      const updated = prev.map(a => a.id === id ? { ...a, ...data } : a);
      const updatedApt = updated.find(a => a.id === id);
      if (updatedApt) {
        api.syncAppointment('update', updatedApt, data);
      }
      return updated;
    });
  };

  const deleteAppointment = (id: string) => {
    const apt = appointments.find(a => a.id === id);
    if (apt) {
      api.syncAppointment('delete', apt);
    }
    setAppointments(prev => prev.filter(a => a.id !== id));
  };

  // ── Getters ───────────────────────────────────────────────

  const getClientById = (id: string) => clients.find(c => c.id === id);

  const getSessionsByClientId = (clientId: string) =>
    sessions.filter(s => s.clientId === clientId).sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

  return (
    <AppContext.Provider value={{
      user, clients, sessions, appointments, loading,
      isAuthenticated: !!user,
      login, register, logout, updateUser,
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
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
