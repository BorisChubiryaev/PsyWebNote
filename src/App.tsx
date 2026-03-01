import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AppProvider, useApp } from './context/AppContext';
import LoadingScreen from './components/LoadingScreen';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import ClientDetail from './pages/ClientDetail';
import ClientForm from './pages/ClientForm';
import SessionForm from './pages/SessionForm';
import SessionDetail from './pages/SessionDetail';
import Calendar from './pages/Calendar';
import Profile from './pages/Profile';
import Reports from './pages/Reports';
import Journal from './pages/Journal';
import VKCallback from './pages/VKCallback';
import YandexCallback from './pages/YandexCallback';
import AIFloatingChat from './components/AIFloatingChat';
import NotificationSystem from './components/NotificationSystem';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'placeholder.apps.googleusercontent.com';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useApp();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useApp();
  if (loading) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { user } = useApp();
  if (user && !user.onboardingComplete) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

function GlobalNotifications() {
  const { isAuthenticated } = useApp();
  if (!isAuthenticated) return null;
  return (
    <div className="fixed top-2 right-14 lg:top-4 lg:left-[17.5rem] lg:right-auto z-[55]">
      <NotificationSystem />
    </div>
  );
}

function AppRoutes() {
  const { isAuthenticated, user, loading } = useApp();

  if (loading) return <LoadingScreen />;

  return (
    <>
      {isAuthenticated && user?.onboardingComplete && <GlobalNotifications />}
      {isAuthenticated && user?.onboardingComplete && <AIFloatingChat />}
      <Routes>
        {/* ── Public ── */}
        <Route path="/" element={<PublicRoute><Landing /></PublicRoute>} />
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

        {/* ── OAuth callbacks — не требуют auth ── */}
        <Route path="/auth/vk/callback"     element={<VKCallback />} />
        <Route path="/auth/yandex/callback" element={<YandexCallback />} />

        {/* ── Onboarding ── */}
        <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />

        {/* ── App ── */}
        <Route path="/dashboard" element={<ProtectedRoute><OnboardingGuard><Dashboard /></OnboardingGuard></ProtectedRoute>} />
        <Route path="/clients"   element={<ProtectedRoute><OnboardingGuard><Clients /></OnboardingGuard></ProtectedRoute>} />
        <Route path="/clients/new" element={<ProtectedRoute><OnboardingGuard><ClientForm /></OnboardingGuard></ProtectedRoute>} />
        <Route path="/clients/:id" element={<ProtectedRoute><OnboardingGuard><ClientDetail /></OnboardingGuard></ProtectedRoute>} />
        <Route path="/clients/:id/edit" element={<ProtectedRoute><OnboardingGuard><ClientForm /></OnboardingGuard></ProtectedRoute>} />

        <Route path="/clients/:clientId/sessions/new" element={<ProtectedRoute><OnboardingGuard><SessionForm /></OnboardingGuard></ProtectedRoute>} />
        <Route path="/clients/:clientId/sessions/:sessionId" element={<ProtectedRoute><OnboardingGuard><SessionDetail /></OnboardingGuard></ProtectedRoute>} />
        <Route path="/clients/:clientId/sessions/:sessionId/edit" element={<ProtectedRoute><OnboardingGuard><SessionForm /></OnboardingGuard></ProtectedRoute>} />
        <Route path="/sessions/:sessionId/edit" element={<ProtectedRoute><OnboardingGuard><SessionForm /></OnboardingGuard></ProtectedRoute>} />

        <Route path="/calendar" element={<ProtectedRoute><OnboardingGuard><Calendar /></OnboardingGuard></ProtectedRoute>} />
        <Route path="/journal"  element={<ProtectedRoute><OnboardingGuard><Journal /></OnboardingGuard></ProtectedRoute>} />
        <Route path="/reports"  element={<ProtectedRoute><OnboardingGuard><Reports /></OnboardingGuard></ProtectedRoute>} />
        <Route path="/profile"  element={<ProtectedRoute><OnboardingGuard><Profile /></OnboardingGuard></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <AppProvider>
          <AppRoutes />
        </AppProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}
