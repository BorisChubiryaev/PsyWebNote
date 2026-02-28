export interface User {
  id: string;
  email: string;
  password?: string;
  name: string;
  avatar?: string;
  therapyType: string;
  hourlyRate: number;
  currency: string;
  packages: Package[];
  bio: string;
  phone: string;
  workingHours: {
    start: string;
    end: string;
  };
  workingDays: number[];
  onboardingComplete?: boolean;
}

export interface Package {
  id: string;
  name: string;
  sessions: number;
  price: number;
  discount: number;
}

export interface Client {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  socialLinks: SocialLink[];
  avatar?: string;
  notes: string;
  packageId?: string;
  remainingSessions: number;
  schedules: Schedule[];
  meetingLink?: string;
  isOnline: boolean;
  createdAt: string;
  status: 'active' | 'paused' | 'completed';
}

export interface SocialLink {
  type: 'telegram' | 'instagram' | 'whatsapp' | 'other';
  url: string;
}

export interface Schedule {
  id: string;
  dayOfWeek: number;
  time: string;
  duration: number;
}

export interface Session {
  id: string;
  clientId: string;
  date: string;
  time: string;
  duration: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  notes: string;
  mood?: number;
  topics: string[];
  homework?: string;
  nextSessionGoals?: string;
  isPaid: boolean;
  amount: number;
}

export interface Appointment {
  id: string;
  clientId: string;
  clientName: string;
  date: string;
  time: string;
  duration: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  isOnline: boolean;
  meetingLink?: string;
}
