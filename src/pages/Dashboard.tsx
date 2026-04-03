import { TR } from '../utils/tr';
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users, Clock, DollarSign, TrendingUp, UserPlus,
  Calendar as CalendarIcon, ChevronRight, Video, MapPin, Edit, Package, Loader2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { format, startOfWeek, endOfWeek, isWithinInterval, parseISO, isToday, isTomorrow } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import Layout from '../components/Layout';

export default function Dashboard() {
  const { clients, sessions, appointments, user, ensureSessionForAppointment } = useApp();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const locale = language === 'ru' ? ru : enUS;

  const stats = useMemo(() => {
    const now = new Date();
    const wStart = startOfWeek(now, { weekStartsOn: 1 });
    const wEnd = endOfWeek(now, { weekStartsOn: 1 });

    const weeklySessions = sessions.filter(s => {
      const d = parseISO(s.date);
      return isWithinInterval(d, { start: wStart, end: wEnd }) && s.status === 'completed';
    });
    const weeklyEarnings = weeklySessions.reduce((sum, s) => sum + s.amount, 0);
    const weeklyHours = weeklySessions.reduce((sum, s) => sum + s.duration, 0) / 60;

    const upcomingAppointments = appointments
      .filter(a => a.status === 'scheduled' && parseISO(a.date) >= now)
      .sort((a, b) => {
        const d = parseISO(a.date).getTime() - parseISO(b.date).getTime();
        return d !== 0 ? d : a.time.localeCompare(b.time);
      });

    const todayAppointments = appointments
      .filter(a => isToday(parseISO(a.date)) && a.status !== 'cancelled')
      .sort((a, b) => a.time.localeCompare(b.time));

    const weeklyScheduledHours = appointments
      .filter(a => {
        const d = parseISO(a.date);
        return isWithinInterval(d, { start: wStart, end: wEnd }) && a.status === 'scheduled';
      })
      .reduce((sum, a) => sum + a.duration, 0) / 60;

    return {
      totalClients: clients.filter(c => c.status === 'active').length,
      weeklyEarnings, weeklyHours: Math.round(weeklyHours * 10) / 10,
      weeklyScheduledHours: Math.round(weeklyScheduledHours * 10) / 10,
      upcomingAppointments, todayAppointments,
    };
  }, [clients, sessions, appointments]);

  const formatDate = (dateStr: string) => {
    const d = parseISO(dateStr);
    if (isToday(d)) return t('today');
    if (isTomorrow(d)) return t('tomorrow');
    return format(d, 'd MMM', { locale });
  };

  const [navigatingId, setNavigatingId] = useState<string | null>(null);
  const isCustomEvent = (apt: typeof appointments[number]) => apt.kind === 'custom' || !apt.clientId;
  const customTypeLabel = (apt: typeof appointments[number]) => {
    switch (apt.customType) {
      case 'supervision': return t('calendar_event_supervision');
      case 'seminar': return t('calendar_event_seminar');
      case 'group_supervision': return t('calendar_event_group_supervision');
      case 'intervision': return t('calendar_event_intervision');
      default: return t('calendar_custom_events');
    }
  };

  const goToSession = async (apt: typeof appointments[0]) => {
    if (navigatingId) return;
    if (!apt.clientId || isCustomEvent(apt)) return;
    setNavigatingId(apt.id);
    try {
      const sid = await ensureSessionForAppointment(apt);
      if (!sid) return;
      navigate(`/clients/${apt.clientId}/sessions/${sid}/edit`);
    } finally {
      setNavigatingId(null);
    }
  };

  const goToSessionView = async (apt: typeof appointments[0]) => {
    if (navigatingId) return;
    if (!apt.clientId || isCustomEvent(apt)) return;
    setNavigatingId(apt.id);
    try {
      const sid = await ensureSessionForAppointment(apt);
      if (!sid) return;
      navigate(`/clients/${apt.clientId}/sessions/${sid}`);
    } finally {
      setNavigatingId(null);
    }
  };

  const lowPackageClients = clients.filter(c =>
    c.status === 'active' && c.packageId && (c.remainingSessions ?? 0) <= 2 && (c.remainingSessions ?? 0) > 0
  );

  const greeting = language === 'ru'
    ? `Добрый день, ${user?.name?.split(' ')[0] || TR("Психолог", "Psychologist")}! 👋`
    : `Hello, ${user?.name?.split(' ')[0] || 'Psychologist'}! 👋`;



  return (
    <Layout>
      <div className="max-w-7xl mx-auto animate-fadeIn">

        {/* ── Greeting ── */}
        <div className="mb-5">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-1">
            {greeting}
          </h1>
          <p className="text-gray-500 text-sm">{format(new Date(), "EEEE, d MMMM yyyy", { locale })}</p>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {[
            { icon: Users,     bg: 'bg-indigo-100', color: 'text-indigo-600', value: stats.totalClients,                           label: t('active_clients') },
            { icon: DollarSign,bg: 'bg-green-100',  color: 'text-green-600',  value: `${stats.weeklyEarnings.toLocaleString()} ${user?.currency || '₽'}`, label: t('weekly_earnings') },
            { icon: Clock,     bg: 'bg-purple-100', color: 'text-purple-600', value: `${stats.weeklyHours}${t('hours')}`,          label: t('status_completed_session') },
            { icon: TrendingUp,bg: 'bg-amber-100',  color: 'text-amber-600',  value: `${stats.weeklyScheduledHours}${t('hours')}`, label: t('status_scheduled') },
          ].map((s, i) => (
            <div key={i} className="card p-4">
              <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-2`}>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <p className="text-xl font-bold text-gray-900 leading-tight">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Quick Actions ── */}
        <div className="flex flex-wrap gap-2 mb-5">
          <Link to="/clients/new" className="btn-primary flex items-center gap-2 text-sm py-2.5">
            <UserPlus className="w-4 h-4" /> {t('new_client')}
          </Link>
          <Link to="/calendar" className="btn-secondary flex items-center gap-2 text-sm py-2.5">
            <CalendarIcon className="w-4 h-4" /> {t('nav_calendar')}
          </Link>
        </div>

        {/* ── Low package warning ── */}
        {lowPackageClients.length > 0 && (
          <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
            <div className="flex items-start gap-3">
              <Package className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800 mb-1">
                  {t('package_sessions')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {lowPackageClients.map(c => (
                    <Link key={c.id} to={`/clients/${c.id}`}
                      className="text-xs px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors font-medium">
                      {c.name} — {language === 'ru' ? `осталось ${c.remainingSessions}` : `${c.remainingSessions} left`}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-5">
          {/* ── Today ── */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">{t('today_schedule')}</h2>
              <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
                {stats.todayAppointments.length} {language === 'ru' ? TR("встреч", "meetings") : 'meetings'}
              </span>
            </div>
            {stats.todayAppointments.length > 0 ? (
              <div className="space-y-2">
                {stats.todayAppointments.map(apt => {
                  const custom = isCustomEvent(apt);
                  const eventClass = custom
                    ? 'bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800'
                    : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800';
                  return (
                  <div key={apt.id} className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${eventClass}`}>
                    <div className="text-center min-w-[44px] flex-shrink-0">
                      <p className={`text-base font-bold leading-tight ${custom ? 'text-violet-700 dark:text-violet-300' : 'text-indigo-600'}`}>{apt.time}</p>
                    </div>
                    <button onClick={() => !custom && goToSessionView(apt)} disabled={!!navigatingId || custom} className="flex-1 min-w-0 text-left disabled:cursor-default">
                      <p className="font-medium text-gray-900 dark:text-white text-sm truncate hover:text-indigo-600 transition-colors">
                        {apt.clientName}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                        {custom ? <CalendarIcon className="w-3 h-3" /> : (apt.isOnline ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />)}
                        <span>{custom ? customTypeLabel(apt) : (apt.isOnline ? t('online') : t('offline'))}</span>
                        <span>· {apt.duration} {t('minutes')}</span>
                      </div>
                    </button>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {!custom && (
                        <button
                          onClick={() => goToSession(apt)}
                          disabled={!!navigatingId}
                          className="flex items-center gap-1 py-1.5 px-2.5 text-xs bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors font-medium disabled:opacity-60"
                        >
                          {navigatingId === apt.id
                            ? <Loader2 className="w-3 h-3 animate-spin" />
                            : <Edit className="w-3 h-3" />}
                          {language === 'ru' ? TR("Записать", "Write down") : 'Record'}
                        </button>
                      )}
                      {!custom && apt.isOnline && apt.meetingLink && (
                        <a href={apt.meetingLink} target="_blank" rel="noopener noreferrer"
                          className="py-1.5 px-2.5 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium">
                          {language === 'ru' ? TR("Войти", "Login") : 'Join'}
                        </a>
                      )}
                      {custom && (
                        <span className="py-1.5 px-2.5 text-xs bg-violet-100 text-violet-700 rounded-lg font-medium">
                          {t('calendar_custom_events')}
                        </span>
                      )}
                    </div>
                  </div>
                )})}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CalendarIcon className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">{t('no_sessions_today')}</p>
              </div>
            )}
          </div>

          {/* ── Upcoming ── */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">{t('upcoming')}</h2>
              <Link to="/calendar" className="text-indigo-600 text-xs hover:text-indigo-700 flex items-center gap-1">
                {language === 'ru' ? TR("Все", "All") : 'All'} <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {stats.upcomingAppointments.length > 0 ? (
              <div className="space-y-1">
                {stats.upcomingAppointments.slice(0, 5).map(apt => (
                  <button
                    key={apt.id}
                    onClick={() => goToSessionView(apt)}
                    disabled={!!navigatingId}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-xl transition-colors text-left disabled:opacity-60"
                  >
                    <div className="text-center min-w-[52px] flex-shrink-0">
                      <p className="text-xs text-gray-400">{formatDate(apt.date)}</p>
                      <p className="font-bold text-gray-900 dark:text-white text-sm">{apt.time}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{apt.clientName}</p>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        {apt.isOnline ? <Video className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                        <span>{apt.duration} {t('minutes')}</span>
                      </div>
                    </div>
                    {navigatingId === apt.id
                      ? <Loader2 className="w-4 h-4 text-indigo-500 animate-spin flex-shrink-0" />
                      : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <CalendarIcon className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">{t('no_upcoming')}</p>
                <Link to="/clients" className="text-indigo-600 text-xs mt-2 inline-block hover:underline">
                  {t('add_client')}
                </Link>
              </div>
            )}
          </div>

          {/* ── Quick Client Access ── */}
          <div className="card lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">{t('nav_clients')}</h2>
              <Link to="/clients" className="text-indigo-600 text-xs hover:text-indigo-700 flex items-center gap-1">
                {language === 'ru' ? TR("Все", "All") : 'All'} <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            {clients.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {clients.filter(c => c.status === 'active').slice(0, 6).map(client => (
                  <Link key={client.id} to={`/clients/${client.id}`}
                    className="flex flex-col items-center p-3 hover:bg-gray-50 rounded-xl transition-colors group">
                    {client.avatar ? (
                      <img src={client.avatar} alt="" className="w-11 h-11 rounded-full object-cover mb-2" />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-medium mb-2 group-hover:shadow-md transition-shadow">
                        {client.name.charAt(0)}
                      </div>
                    )}
                    <p className="text-xs font-medium text-gray-900 text-center truncate w-full">{client.name.split(' ')[0]}</p>
                    {client.packageId && (
                      <p className="text-[10px] text-indigo-600 mt-0.5">{client.remainingSessions} {language === 'ru' ? TR("сес.", "ses.") : 'ses.'}</p>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">{t('no_clients_yet')}</p>
                <Link to="/clients/new" className="btn-primary mt-4 inline-flex items-center gap-2 text-sm">
                  <UserPlus className="w-4 h-4" /> {t('add_client')}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
