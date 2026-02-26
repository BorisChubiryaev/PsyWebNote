import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { User, Client, Session, Appointment, Package } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { addDays, format, startOfWeek, addWeeks, getDay } from 'date-fns';

interface AppContextType {
  user: User | null;
  clients: Client[];
  sessions: Session[];
  appointments: Appointment[];
  isAuthenticated: boolean;
  login: (email: string, password: string) => boolean;
  register: (email: string, password: string, name: string) => boolean;
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

const createDemoData = () => {
  const today = new Date();
  const formatDate = (d: Date) => format(d, 'yyyy-MM-dd');

  const demoClients: Client[] = [
    {
      id: 'demo-client-1',
      name: 'Мария Сидорова',
      phone: '+7 (999) 123-45-67',
      email: 'maria@example.com',
      socialLinks: [{ type: 'telegram', url: 'https://t.me/maria' }],
      notes: 'Обратилась с тревожным расстройством.',
      packageId: '2',
      remainingSessions: 5,
      schedules: [{ id: 's1', dayOfWeek: 2, time: '10:00', duration: 60 }],
      meetingLink: 'https://zoom.us/j/123456789',
      isOnline: true,
      createdAt: new Date(today.getTime() - 90 * 86400000).toISOString(),
      status: 'active',
    },
    {
      id: 'demo-client-2',
      name: 'Алексей Петров',
      phone: '+7 (999) 234-56-78',
      socialLinks: [{ type: 'whatsapp', url: 'https://wa.me/79992345678' }],
      notes: 'Работаем над управлением гневом.',
      remainingSessions: 0,
      schedules: [{ id: 's2', dayOfWeek: 4, time: '14:00', duration: 60 }],
      isOnline: false,
      createdAt: new Date(today.getTime() - 60 * 86400000).toISOString(),
      status: 'active',
    },
    {
      id: 'demo-client-3',
      name: 'Елена Козлова',
      phone: '+7 (999) 345-67-89',
      socialLinks: [],
      notes: 'Работа с самооценкой и личными границами.',
      packageId: '1',
      remainingSessions: 2,
      schedules: [
        { id: 's3', dayOfWeek: 1, time: '11:00', duration: 60 },
        { id: 's4', dayOfWeek: 5, time: '11:00', duration: 60 },
      ],
      meetingLink: 'https://meet.google.com/abc-defg-hij',
      isOnline: true,
      createdAt: new Date(today.getTime() - 30 * 86400000).toISOString(),
      status: 'active',
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
        const aptId = uuidv4();
        const sessionId = uuidv4();

        demoAppointments.push({
          id: aptId,
          clientId: client.id,
          clientName: client.name,
          date: dateStr,
          time: schedule.time,
          duration: schedule.duration,
          status: 'scheduled',
          isOnline: client.isOnline,
          meetingLink: client.meetingLink,
        });

        // Create a matching session for each appointment
        demoAppointmentSessions.push({
          id: sessionId,
          clientId: client.id,
          date: dateStr,
          time: schedule.time,
          duration: schedule.duration,
          status: 'scheduled',
          notes: '',
          topics: [],
          isPaid: false,
          amount: 5000,
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

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('psywebnote_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem('psywebnote_clients');
    return saved ? JSON.parse(saved) : [];
  });
  const [sessions, setSessions] = useState<Session[]>(() => {
    const saved = localStorage.getItem('psywebnote_sessions');
    return saved ? JSON.parse(saved) : [];
  });
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    const saved = localStorage.getItem('psywebnote_appointments');
    return saved ? JSON.parse(saved) : [];
  });
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('psywebnote_users');
    return saved ? JSON.parse(saved) : [];
  });

  // Refs for accessing latest state in callbacks
  const sessionsRef = useRef<Session[]>(sessions);
  useEffect(() => { sessionsRef.current = sessions; }, [sessions]);

  useEffect(() => {
    if (user) localStorage.setItem('psywebnote_user', JSON.stringify(user));
    else localStorage.removeItem('psywebnote_user');
  }, [user]);
  useEffect(() => { localStorage.setItem('psywebnote_clients', JSON.stringify(clients)); }, [clients]);
  useEffect(() => { localStorage.setItem('psywebnote_sessions', JSON.stringify(sessions)); }, [sessions]);
  useEffect(() => { localStorage.setItem('psywebnote_appointments', JSON.stringify(appointments)); }, [appointments]);
  useEffect(() => { localStorage.setItem('psywebnote_users', JSON.stringify(users)); }, [users]);

  const login = (email: string, password: string): boolean => {
    const foundUser = users.find(u => u.email === email && u.password === password);
    if (foundUser) { setUser(foundUser); return true; }
    return false;
  };

  const register = (email: string, password: string, name: string): boolean => {
    if (users.find(u => u.email === email)) return false;
    const newUser: User = {
      id: uuidv4(), email, password, name,
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
    setUsers(prev => [...prev, newUser]);
    setUser(newUser);
    return true;
  };

  const logout = () => { setUser(null); };

  const updateUser = (data: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...data };
      setUser(updatedUser);
      setUsers(prev => prev.map(u => u.id === user.id ? updatedUser : u));
    }
  };

  // Ensure a session record exists for a given appointment. Returns session ID.
  const ensureSessionForAppointment = useCallback((apt: Appointment): string => {
    const current = sessionsRef.current;
    const existing = current.find(s =>
      s.clientId === apt.clientId && s.date === apt.date && s.time === apt.time
    );
    if (existing) return existing.id;

    const newId = uuidv4();
    const newSession: Session = {
      id: newId,
      clientId: apt.clientId,
      date: apt.date,
      time: apt.time,
      duration: apt.duration,
      status: apt.status || 'scheduled',
      notes: '',
      topics: [],
      isPaid: false,
      amount: user?.hourlyRate || 5000,
    };
    setSessions(prev => [...prev, newSession]);
    sessionsRef.current = [...sessionsRef.current, newSession];
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

        const aptId = uuidv4();
        const sessId = uuidv4();

        newAppointments.push({
          id: aptId,
          clientId: client.id,
          clientName: client.name,
          date: dateStr,
          time: schedule.time,
          duration: schedule.duration,
          status: 'scheduled',
          isOnline: client.isOnline,
          meetingLink: client.meetingLink,
        });

        // Also create a matching session
        const existsSess = sessionsRef.current.some(s =>
          s.clientId === client.id && s.date === dateStr && s.time === schedule.time
        );
        if (!existsSess) {
          newSessions.push({
            id: sessId,
            clientId: client.id,
            date: dateStr,
            time: schedule.time,
            duration: schedule.duration,
            status: 'scheduled',
            notes: '',
            topics: [],
            isPaid: false,
            amount: user?.hourlyRate || 5000,
          });
        }
      }
    });

    if (newAppointments.length > 0) {
      setAppointments(prev => [...prev, ...newAppointments]);
    }
    if (newSessions.length > 0) {
      setSessions(prev => [...prev, ...newSessions]);
      sessionsRef.current = [...sessionsRef.current, ...newSessions];
    }
  }, [appointments, user]);

  const addClient = (client: Omit<Client, 'id' | 'createdAt'>) => {
    const newClient: Client = { ...client, id: uuidv4(), createdAt: new Date().toISOString() };
    setClients(prev => [...prev, newClient]);
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
      return updated;
    });
  };

  const deleteClient = (id: string) => {
    setClients(prev => prev.filter(c => c.id !== id));
    setSessions(prev => prev.filter(s => s.clientId !== id));
    setAppointments(prev => prev.filter(a => a.clientId !== id));
  };

  const addSession = (session: Omit<Session, 'id'>): string => {
    const newId = uuidv4();
    const newSession: Session = { ...session, id: newId };
    setSessions(prev => [...prev, newSession]);
    sessionsRef.current = [...sessionsRef.current, newSession];
    return newId;
  };

  const completeSession = (sessionId: string, sessionData: Partial<Session>) => {
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, ...sessionData } : s));
    const session = sessionsRef.current.find(s => s.id === sessionId);
    if (session && sessionData.status === 'completed') {
      const client = clients.find(c => c.id === session.clientId);
      if (client && client.packageId && client.remainingSessions && client.remainingSessions > 0) {
        updateClient(client.id, { remainingSessions: client.remainingSessions - 1 });
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

    if (wasNotCompleted && isNowCompleted && oldSession) {
      const client = clients.find(c => c.id === oldSession.clientId);
      if (client && client.packageId && client.remainingSessions && client.remainingSessions > 0) {
        updateClient(client.id, { remainingSessions: client.remainingSessions - 1 });
      }
    }
  };

  const deleteSession = (id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
  };

  const addAppointment = (appointment: Omit<Appointment, 'id'>) => {
    const newApt: Appointment = { ...appointment, id: uuidv4() };
    setAppointments(prev => [...prev, newApt]);
  };

  const updateAppointment = (id: string, data: Partial<Appointment>) => {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, ...data } : a));
  };

  const deleteAppointment = (id: string) => {
    setAppointments(prev => prev.filter(a => a.id !== id));
  };

  const getClientById = (id: string) => clients.find(c => c.id === id);

  const getSessionsByClientId = (clientId: string) =>
    sessions.filter(s => s.clientId === clientId).sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

  return (
    <AppContext.Provider value={{
      user, clients, sessions, appointments,
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
