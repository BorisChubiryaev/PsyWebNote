import { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Bell, X, Clock, CheckCircle, FileText, AlertCircle, ExternalLink, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ActiveNotification {
  id: string;
  type: 'session_ended' | 'session_starting';
  appointmentId: string;
  clientId: string;
  clientName: string;
  message: string;
  timestamp: string;
  read: boolean;
  date: string;
  time: string;
}

// ── Persistent notified IDs in localStorage ──────────────────────────────────
const NOTIFIED_KEY = 'psywebnote_notified_ids';
const BROWSER_NOTIF_KEY = 'psywebnote_browser_notified';

function getNotifiedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(NOTIFIED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}
function saveNotifiedIds(ids: Set<string>) {
  // Keep max 500 entries to avoid bloat
  const arr = Array.from(ids).slice(-500);
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify(arr));
}

function getBrowserNotified(): Set<string> {
  try {
    const raw = localStorage.getItem(BROWSER_NOTIF_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}
function saveBrowserNotified(ids: Set<string>) {
  const arr = Array.from(ids).slice(-500);
  localStorage.setItem(BROWSER_NOTIF_KEY, JSON.stringify(arr));
}

// ── Quick Note Modal ─────────────────────────────────────────────────────────
interface QuickNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  aptDate: string;
  aptTime: string;
}

const QuickNoteModal = ({ isOpen, onClose, clientId, clientName, aptDate, aptTime }: QuickNoteModalProps) => {
  const { sessions, updateSession, appointments, updateAppointment, ensureSessionForAppointment, clients, updateClient } = useApp();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'completed' | 'cancelled' | 'no-show'>('completed');
  const [quickNote, setQuickNote] = useState('');
  const [clientMood, setClientMood] = useState(5);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) { setStatus('completed'); setQuickNote(''); setClientMood(5); }
  }, [isOpen]);

  const session = sessions.find(s => s.clientId === clientId && s.date === aptDate && s.time === aptTime);
  const appointment = appointments.find(a => a.clientId === clientId && a.date === aptDate && a.time === aptTime);

  const handleSave = async () => {
    setSaving(true);
    let sessionId = session?.id;
    if (!sessionId && appointment) sessionId = await ensureSessionForAppointment(appointment);

    const wasCompleted = session?.status === 'completed';
    const isNowCompleted = status === 'completed';

    if (sessionId) {
      const existing = sessions.find(s => s.id === sessionId);
      await updateSession(sessionId, {
        status,
        notes: existing?.notes ? `${existing.notes}\n\n--- Быстрая заметка ---\n${quickNote}` : quickNote,
        mood: clientMood,
        isPaid: status === 'completed',
      });
    }

    if (appointment) await updateAppointment(appointment.id, { status });

    if (!wasCompleted && isNowCompleted) {
      const client = clients.find(c => c.id === clientId);
      if (client?.packageId && (client.remainingSessions ?? 0) > 0) {
        await updateClient(clientId, { remainingSessions: (client.remainingSessions ?? 1) - 1 });
      }
    }

    setSaving(false);
    onClose();
  };

  const handleOpenFull = async () => {
    let sessionId = session?.id;
    if (!sessionId && appointment) sessionId = await ensureSessionForAppointment(appointment);
    if (sessionId) navigate(`/clients/${clientId}/sessions/${sessionId}/edit`);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-[70] p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-5">
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4 sm:hidden" />

          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Сессия завершена</h2>
              <p className="text-gray-500 text-xs mt-0.5">{clientName} · {aptDate} · {aptTime}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Статус сессии</label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { val: 'completed' as const, label: 'Проведена', icon: CheckCircle, active: 'border-green-500 bg-green-50 text-green-700' },
                  { val: 'cancelled' as const, label: 'Отменена', icon: X, active: 'border-orange-500 bg-orange-50 text-orange-700' },
                  { val: 'no-show' as const, label: 'Не пришёл', icon: AlertCircle, active: 'border-red-500 bg-red-50 text-red-700' },
                ]).map(s => (
                  <button key={s.val} onClick={() => setStatus(s.val)}
                    className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 text-xs font-medium ${status === s.val ? s.active : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}>
                    <s.icon className="w-5 h-5" />
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {status === 'completed' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Состояние клиента: <span className="text-indigo-600 font-bold">{clientMood}</span>/10
                </label>
                <input type="range" min="1" max="10" value={clientMood}
                  onChange={e => setClientMood(Number(e.target.value))}
                  className="w-full h-3 rounded-lg cursor-pointer accent-indigo-600" />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>😔 Плохо</span><span>😊 Отлично</span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <FileText className="w-4 h-4 inline mr-1" />
                Быстрая заметка
              </label>
              <textarea value={quickNote} onChange={e => setQuickNote(e.target.value)}
                rows={3}
                placeholder="Основные темы, инсайты, важные моменты..."
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none text-sm"
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button onClick={onClose}
                  className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 text-sm font-medium">
                  Позже
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 text-sm font-medium">
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
              <button onClick={handleOpenFull}
                className="flex items-center justify-center gap-2 px-4 py-2.5 text-indigo-600 hover:bg-indigo-50 rounded-xl text-sm font-medium border border-indigo-200">
                <ExternalLink className="w-4 h-4" /> Открыть полную форму
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main Notification System (SINGLETON — render only ONCE in App) ────────────
export const NotificationSystem = () => {
  const { appointments, clients } = useApp();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<ActiveNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [quickNote, setQuickNote] = useState<{
    isOpen: boolean; clientId: string; clientName: string; aptDate: string; aptTime: string;
  }>({ isOpen: false, clientId: '', clientName: '', aptDate: '', aptTime: '' });

  const bellRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        bellRef.current && !bellRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Request permission once
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const checkAppointments = useCallback(() => {
    const now = new Date();
    const notifiedIds = getNotifiedIds();
    const browserNotified = getBrowserNotified();
    const toAdd: ActiveNotification[] = [];
    let idsChanged = false;
    let browserChanged = false;

    appointments.forEach(apt => {
      if (apt.status !== 'scheduled') return;
      const client = clients.find(c => c.id === apt.clientId);
      if (!client) return;

      const aptStart = new Date(`${apt.date}T${apt.time}:00`);
      const aptEnd = new Date(aptStart.getTime() + apt.duration * 60_000);
      const msSinceEnd = now.getTime() - aptEnd.getTime();
      const minSinceEnd = msSinceEnd / 60_000;
      const hoursSinceEnd = minSinceEnd / 60;

      // Past sessions (0–48h window)
      if (minSinceEnd >= 0 && hoursSinceEnd <= 48) {
        const notifId = `${apt.id}-ended`;
        if (!notifiedIds.has(notifId)) {
          notifiedIds.add(notifId);
          idsChanged = true;

          let message: string;
          if (hoursSinceEnd < 0.25) message = `Сессия с ${apt.clientName} только что завершилась — обновите статус!`;
          else if (hoursSinceEnd < 1) message = `Сессия с ${apt.clientName} завершилась ${Math.round(minSinceEnd)} мин. назад.`;
          else if (hoursSinceEnd < 3) message = `Сессия с ${apt.clientName} завершилась ${Math.floor(hoursSinceEnd)} ч. назад.`;
          else message = `⚠️ Сессия с ${apt.clientName} (${apt.date} ${apt.time}) требует обновления статуса!`;

          toAdd.push({
            id: notifId, type: 'session_ended',
            appointmentId: apt.id, clientId: apt.clientId, clientName: apt.clientName,
            message, timestamp: new Date().toISOString(), read: false, date: apt.date, time: apt.time,
          });

          // Browser notification — only ONCE per appointment, ever
          if ('Notification' in window && Notification.permission === 'granted' && !browserNotified.has(notifId)) {
            browserNotified.add(notifId);
            browserChanged = true;
            new window.Notification('PsyWebNote', { body: message, icon: '/favicon.ico', tag: notifId });
          }
        }
      }

      // Upcoming (within 15 min)
      const msUntilStart = aptStart.getTime() - now.getTime();
      const minUntilStart = msUntilStart / 60_000;
      if (minUntilStart > 0 && minUntilStart <= 15) {
        const notifId = `${apt.id}-starting`;
        if (!notifiedIds.has(notifId)) {
          notifiedIds.add(notifId);
          idsChanged = true;

          const message = `Сессия с ${apt.clientName} начнётся через ${Math.round(minUntilStart)} мин.`;
          toAdd.push({
            id: notifId, type: 'session_starting',
            appointmentId: apt.id, clientId: apt.clientId, clientName: apt.clientName,
            message, timestamp: new Date().toISOString(), read: false, date: apt.date, time: apt.time,
          });

          if ('Notification' in window && Notification.permission === 'granted' && !browserNotified.has(notifId)) {
            browserNotified.add(notifId);
            browserChanged = true;
            new window.Notification('PsyWebNote', { body: message, icon: '/favicon.ico', tag: notifId });
          }
        }
      }
    });

    if (idsChanged) saveNotifiedIds(notifiedIds);
    if (browserChanged) saveBrowserNotified(browserNotified);
    if (toAdd.length > 0) setNotifications(prev => [...toAdd, ...prev]);
  }, [appointments, clients]);

  // Check on mount and when appointments change
  useEffect(() => { checkAppointments(); }, [checkAppointments]);

  // Poll every 60s
  useEffect(() => {
    const interval = setInterval(checkAppointments, 60_000);
    return () => clearInterval(interval);
  }, [checkAppointments]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleClick = (n: ActiveNotification) => {
    setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
    setIsOpen(false);
    if (n.type === 'session_ended') {
      setQuickNote({ isOpen: true, clientId: n.clientId, clientName: n.clientName, aptDate: n.date, aptTime: n.time });
    } else {
      navigate(`/clients/${n.clientId}`);
    }
  };

  const clearAll = () => { setNotifications([]); setIsOpen(false); };
  const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));

  return (
    <>
      {/* Bell button */}
      <button
        ref={bellRef}
        onClick={() => { setIsOpen(!isOpen); if (!isOpen) markAllRead(); }}
        className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center animate-pulse font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown — fixed position, calculated from bell button */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="fixed z-[60] w-[calc(100vw-16px)] sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
          style={{
            top: (() => {
              if (bellRef.current) {
                const rect = bellRef.current.getBoundingClientRect();
                return Math.min(rect.bottom + 8, window.innerHeight - 420) + 'px';
              }
              return '60px';
            })(),
            right: (() => {
              if (window.innerWidth < 640) return '8px';
              if (bellRef.current) {
                const rect = bellRef.current.getBoundingClientRect();
                return Math.max(window.innerWidth - rect.right, 8) + 'px';
              }
              return '16px';
            })(),
          }}
        >
          {/* Header */}
          <div className="p-4 flex items-center justify-between bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              <span className="font-semibold text-sm">Уведомления</span>
              {unreadCount > 0 && (
                <span className="bg-white/30 text-white text-xs px-2 py-0.5 rounded-full">{unreadCount}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {notifications.length > 0 && (
                <button onClick={clearAll} className="text-xs opacity-80 hover:opacity-100">Очистить</button>
              )}
              <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto divide-y divide-gray-50">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Bell className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="font-medium text-sm">Нет уведомлений</p>
                <p className="text-xs mt-1">Все сессии в порядке</p>
              </div>
            ) : notifications.map(n => (
              <button key={n.id} onClick={() => handleClick(n)}
                className={`w-full p-3 text-left hover:bg-gray-50 transition-colors flex items-start gap-3 ${!n.read ? 'bg-indigo-50/60' : ''}`}>
                <div className={`p-1.5 rounded-full flex-shrink-0 ${n.type === 'session_ended' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                  {n.type === 'session_ended' ? <FileText className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 leading-snug">{n.message}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Calendar className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-500">{n.date} · {n.time}</span>
                    {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {notifications.length > 0 && (
            <div className="p-2.5 border-t bg-gray-50 text-center">
              <p className="text-xs text-gray-400">Нажмите для обновления статуса сессии</p>
            </div>
          )}
        </div>
      )}

      <QuickNoteModal
        isOpen={quickNote.isOpen}
        onClose={() => setQuickNote({ isOpen: false, clientId: '', clientName: '', aptDate: '', aptTime: '' })}
        clientId={quickNote.clientId}
        clientName={quickNote.clientName}
        aptDate={quickNote.aptDate}
        aptTime={quickNote.aptTime}
      />
    </>
  );
};

export default NotificationSystem;
