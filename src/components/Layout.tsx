import { TR } from '../utils/tr';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Calendar, User, LogOut,
  Menu, X, Brain, BarChart3, BookOpen, Settings, Sun, Moon
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import NotificationSystem from './NotificationSystem';

interface LayoutProps { children: React.ReactNode; }

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useApp();
  const { isDark, toggleTheme } = useTheme();
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: t('nav_dashboard') },
    { path: '/clients',   icon: Users,           label: t('nav_clients') },
    { path: '/calendar',  icon: Calendar,         label: t('nav_calendar') },
    { path: '/journal',   icon: BookOpen,         label: t('nav_journal') },
    { path: '/reports',   icon: BarChart3,        label: t('nav_reports') },
    { path: '/profile',   icon: User,             label: t('nav_profile') },
  ];

  const handleLogout = () => { logout(); navigate('/login'); };
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 transition-colors duration-200">

      {/* ── Mobile Header ── */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 z-40 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-gray-900 dark:text-white text-sm">PsyWebNote</span>
        </div>
        <div className="flex items-center gap-1">
          <NotificationSystem />
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300"
          >
            {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* ── Sidebar Overlay ── */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={closeSidebar} />
      )}

      {/* ── Sidebar ── */}
      <aside className={`
        fixed top-0 left-0 h-full w-64 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 z-50 flex flex-col
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="p-5 border-b border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center flex-shrink-0">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="font-bold text-gray-900 dark:text-white text-sm">PsyWebNote</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('app_subtitle')}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <NotificationSystem />
              <button
                onClick={toggleTheme}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-gray-400 transition-colors"
                title={isDark ? t('theme_light') : t('theme_dark')}
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl">
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-indigo-500 flex items-center justify-center text-white font-medium text-sm flex-shrink-0">
                {user?.name?.charAt(0) || TR("П", "P")}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 dark:text-white truncate text-sm">{user?.name || TR("Психолог", "Psychologist")}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.therapyType?.split(' ')[0] || t('app_subtitle')}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {navItems.map(item => {
            const active = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={closeSidebar}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium
                  ${active
                    ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white'}
                `}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}

          {/* Settings */}
          <Link
            to="/settings"
            onClick={closeSidebar}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-sm font-medium
              ${location.pathname === '/settings'
                ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-gray-900 dark:hover:text-white'}
            `}
          >
            <Settings className="w-5 h-5 flex-shrink-0" />
            {t('nav_settings')}
          </Link>
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-gray-100 dark:border-slate-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200 text-sm font-medium"
          >
            <LogOut className="w-5 h-5" />
            {t('nav_logout')}
          </button>
        </div>
      </aside>

      {/* ── Bottom Nav (Mobile) ── */}
      <nav className="bottom-nav lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 z-40 flex">
        {navItems.map(item => {
          const active = location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={closeSidebar}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
                active ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[9px] font-medium leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* ── Main Content ── */}
      <main className="lg:ml-64 pt-14 pb-20 lg:pt-0 lg:pb-0 min-h-screen">
        <div className="p-3 sm:p-5 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
