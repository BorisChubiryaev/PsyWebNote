import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Edit, Trash2, Video, MapPin, Phone, Mail,
  MessageCircle, Instagram, Plus, Calendar, FileText, ExternalLink,
  Filter, CheckCircle, XCircle, Clock, AlertTriangle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { enUS } from 'date-fns/locale';
import Layout from '../components/Layout';

type SessionFilter = 'all' | 'completed' | 'scheduled' | 'cancelled' | 'no-show';

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getClientById, getSessionsByClientId, deleteClient, user } = useApp();
  const { t, language } = useLanguage();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'sessions'>('info');
  const [sessionFilter, setSessionFilter] = useState<SessionFilter>('all');

  const dateLocale = language === 'en' ? enUS : ru;

  const client = getClientById(id || '');
  const allSessions = getSessionsByClientId(id || '');

  const filteredSessions = useMemo(() => {
    if (sessionFilter === 'all') return allSessions;
    return allSessions.filter(s => s.status === sessionFilter);
  }, [allSessions, sessionFilter]);

  if (!client) {
    return (
      <Layout>
        <div className="text-center py-16">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('client_not_found')}</h2>
          <Link to="/clients" className="btn-primary">{t('back_to_list')}</Link>
        </div>
      </Layout>
    );
  }

  const handleDelete = () => { deleteClient(client.id); navigate('/clients'); };
  const packageInfo = user?.packages.find(p => p.id === client.packageId);

  const socialIcons: Record<string, typeof MessageCircle> = {
    telegram: MessageCircle, instagram: Instagram, whatsapp: Phone, other: ExternalLink,
  };

  const dayShorts = [t('day_sun'), t('day_mon'), t('day_tue'), t('day_wed'), t('day_thu'), t('day_fri'), t('day_sat')];

  const statusConfig = {
    completed: { label: t('status_completed_session'), bg: 'bg-green-100 dark:bg-green-900/30',  text: 'text-green-700 dark:text-green-400',  icon: CheckCircle,    filterBg: 'bg-green-100 border-green-400 text-green-700' },
    scheduled: { label: t('status_scheduled'),         bg: 'bg-blue-100 dark:bg-blue-900/30',    text: 'text-blue-700 dark:text-blue-400',    icon: Clock,          filterBg: 'bg-blue-100 border-blue-400 text-blue-700' },
    cancelled: { label: t('status_cancelled'),         bg: 'bg-red-100 dark:bg-red-900/30',      text: 'text-red-700 dark:text-red-400',      icon: XCircle,        filterBg: 'bg-red-100 border-red-400 text-red-700' },
    'no-show': { label: t('status_no_show'),           bg: 'bg-yellow-100 dark:bg-yellow-900/30',text: 'text-yellow-700 dark:text-yellow-400',icon: AlertTriangle,  filterBg: 'bg-yellow-100 border-yellow-400 text-yellow-700' },
  };

  const counts = {
    all: allSessions.length,
    completed: allSessions.filter(s => s.status === 'completed').length,
    scheduled: allSessions.filter(s => s.status === 'scheduled').length,
    cancelled: allSessions.filter(s => s.status === 'cancelled').length,
    'no-show': allSessions.filter(s => s.status === 'no-show').length,
  };

  const clientCurrency = client.individualCurrency || user?.currency || '₽';

  const acquisitionLabels: Record<string, string> = {
    aggregator: t('channel_aggregator'),
    word_of_mouth: t('channel_word_of_mouth'),
    colleague_referral: t('channel_colleague_referral'),
    social_media: t('channel_social_media'),
    other: t('channel_other'),
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto animate-fadeIn">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate('/clients')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{client.name}</h1>
            <p className="text-gray-500">{t('client_since')} {format(parseISO(client.createdAt), 'd MMMM yyyy', { locale: dateLocale })}</p>
          </div>
          <div className="flex gap-2">
            <Link to={`/clients/${client.id}/edit`} className="btn-secondary p-2.5"><Edit className="w-5 h-5" /></Link>
            <button onClick={() => setShowDeleteModal(true)} className="btn-danger p-2.5"><Trash2 className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Client Card */}
        <div className="card mb-6">
          <div className="flex flex-col sm:flex-row gap-6">
            {client.avatar ? (
              <img src={client.avatar} alt="" className="w-24 h-24 rounded-2xl object-cover" />
            ) : (
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-3xl font-bold">
                {client.name.charAt(0)}
              </div>
            )}
            <div className="flex-1">
              <div className="flex flex-wrap gap-3 mb-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  client.status === 'active' ? 'bg-green-100 text-green-700' :
                  client.status === 'paused' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {client.status === 'active' ? `● ${t('status_active')}` : client.status === 'paused' ? `⏸ ${t('status_paused')}` : `○ ${t('status_completed_client')}`}
                </span>
                <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-sm font-medium flex items-center gap-1">
                  {client.isOnline ? <Video className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                  {client.isOnline ? t('online') : t('offline')}
                </span>
                {client.individualRate !== undefined && (
                  <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-medium">
                    {client.individualRate.toLocaleString()} {clientCurrency}
                  </span>
                )}
                {client.acquisitionChannel && (
                  <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-sm font-medium">
                    {acquisitionLabels[client.acquisitionChannel] || client.acquisitionChannel}
                  </span>
                )}
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {client.phone && (
                  <a href={`tel:${client.phone}`} className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-indigo-600">
                    <Phone className="w-4 h-4" />{client.phone}
                  </a>
                )}
                {client.email && (
                  <a href={`mailto:${client.email}`} className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-indigo-600">
                    <Mail className="w-4 h-4" />{client.email}
                  </a>
                )}
                {client.socialLinks.map((link, i) => {
                  const Icon = socialIcons[link.type] || ExternalLink;
                  return (
                    <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-indigo-600">
                      <Icon className="w-4 h-4" />{link.type.charAt(0).toUpperCase() + link.type.slice(1)}
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Package & Schedule */}
        <div className="grid sm:grid-cols-2 gap-6 mb-6">
          <div className="card">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">{t('package_info')}</h3>
            {packageInfo ? (
              <div>
                <p className="text-lg font-bold text-indigo-600">{packageInfo.name}</p>
                <p className="text-gray-500 mb-3">{t('remaining_sessions')}: {client.remainingSessions} / {packageInfo.sessions}</p>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2.5 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (client.remainingSessions / packageInfo.sessions) * 100)}%` }} />
                </div>
                {client.remainingSessions <= 2 && (
                  <p className="text-amber-600 text-sm mt-2 font-medium">
                    ⚠️ {t('remaining_sessions')}: {client.remainingSessions}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-500">{t('no_package')}</p>
            )}
          </div>
          <div className="card">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">{t('schedule_info')}</h3>
            {client.schedules.length > 0 ? (
              <div className="space-y-2">
                {client.schedules.map(schedule => (
                  <div key={schedule.id} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{dayShorts[schedule.dayOfWeek]}</p>
                      <p className="text-sm text-gray-500">{schedule.time} · {schedule.duration} {t('minutes')}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">{t('no_schedule')}</p>
            )}
          </div>
        </div>

        {client.isOnline && client.meetingLink && (
          <div className="card mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{t('meeting_link')}</h3>
            <a href={client.meetingLink} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700">
              <Video className="w-5 h-5" />{client.meetingLink}
            </a>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b dark:border-gray-700 pb-1">
          <button onClick={() => setActiveTab('info')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
              activeTab === 'info' ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}>
            {t('info_tab')}
          </button>
          <button onClick={() => setActiveTab('sessions')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors text-sm flex items-center gap-2 ${
              activeTab === 'sessions' ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}>
            {t('sessions_tab')}
            <span className="bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs px-2 py-0.5 rounded-full">
              {allSessions.length}
            </span>
          </button>
        </div>

        {activeTab === 'info' ? (
          <div className="card">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">{t('notes')}</h3>
            {client.notes ? (
              <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{client.notes}</p>
            ) : (
              <p className="text-gray-500">{t('no_sessions')}</p>
            )}
          </div>
        ) : (
          <div>
            {/* Session controls */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <button
                  onClick={() => setSessionFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-all ${
                    sessionFilter === 'all'
                      ? 'bg-gray-800 dark:bg-gray-200 border-gray-800 dark:border-gray-200 text-white dark:text-gray-800'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                  }`}
                >
                  {t('all')} ({counts.all})
                </button>
                {(Object.keys(statusConfig) as SessionFilter[]).map(status => {
                  if (status === 'all') return null;
                  const cfg = statusConfig[status as keyof typeof statusConfig];
                  const count = counts[status as keyof typeof counts];
                  if (count === 0) return null;
                  return (
                    <button
                      key={status}
                      onClick={() => setSessionFilter(status)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border-2 transition-all ${
                        sessionFilter === status
                          ? cfg.filterBg
                          : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                      }`}
                    >
                      {cfg.label} ({count})
                    </button>
                  );
                })}
              </div>
              <Link
                to={`/clients/${client.id}/sessions/new`}
                className="btn-primary flex items-center gap-2 text-sm flex-shrink-0"
              >
                <Plus className="w-4 h-4" /> {t('add_session')}
              </Link>
            </div>

            {filteredSessions.length > 0 ? (
              <div className="space-y-3">
                {filteredSessions.map(session => {
                  const cfg = statusConfig[session.status as keyof typeof statusConfig] || statusConfig.scheduled;
                  const Icon = cfg.icon;
                  return (
                    <Link
                      key={session.id}
                      to={`/clients/${client.id}/sessions/${session.id}`}
                      className="card block hover:shadow-md transition-all hover:-translate-y-0.5 border border-transparent hover:border-indigo-100 dark:hover:border-indigo-800"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                            <Icon className={`w-5 h-5 ${cfg.text}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-white">
                              {format(parseISO(session.date), 'd MMMM yyyy', { locale: dateLocale })}
                            </p>
                            <p className="text-sm text-gray-500">
                              {session.time} · {session.duration} {t('minutes')}
                              {session.mood ? ` · ${t('mood_label')}: ${session.mood}/10` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
                            {cfg.label}
                          </span>
                          {session.amount != null && (
                            <span className={`text-xs font-medium ${session.isPaid ? 'text-green-600' : 'text-red-500'}`}>
                              {session.isPaid ? '✓' : '○'} {session.amount.toLocaleString()} {clientCurrency}
                            </span>
                          )}
                        </div>
                      </div>

                      {session.topics.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3 ml-12">
                          {session.topics.map((topic, i) => (
                            <span key={i} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs text-gray-600 dark:text-gray-400">
                              {topic}
                            </span>
                          ))}
                        </div>
                      )}

                      {session.notes && (
                        <p className="mt-2 ml-12 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {session.notes}
                        </p>
                      )}
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="card text-center py-12">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">
                  {sessionFilter === 'all'
                    ? t('no_sessions')
                    : `${t('filter')}: ${statusConfig[sessionFilter as keyof typeof statusConfig]?.label}`
                  }
                </p>
                {sessionFilter !== 'all' ? (
                  <button onClick={() => setSessionFilter('all')} className="text-indigo-600 text-sm hover:underline">
                    {t('all')}
                  </button>
                ) : (
                  <Link to={`/clients/${client.id}/sessions/new`} className="btn-primary inline-flex items-center gap-2 mt-2">
                    <Plus className="w-5 h-5" /> {t('add_session')}
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {/* Delete modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full animate-fadeIn">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{t('delete_client_confirm')}?</h3>
              <p className="text-gray-500 mb-6">
                {t('delete_client_text')} <strong>{client.name}</strong>?{' '}
                {t('delete_client_warning')}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteModal(false)} className="btn-secondary flex-1">{t('cancel')}</button>
                <button onClick={handleDelete} className="btn-danger flex-1">{t('delete')}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
