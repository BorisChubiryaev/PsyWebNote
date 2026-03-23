import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Plus, X, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import { format } from 'date-fns';
import Layout from '../components/Layout';

export default function SessionForm() {
  const { clientId: urlClientId, sessionId } = useParams();
  const navigate = useNavigate();
  const {
    addSession, updateSession, sessions, getClientById, user,
    appointments, addAppointment, updateAppointment, updateClient, clients,
  } = useApp();
  const { t } = useLanguage();

  const isEditing = !!sessionId;
  const existingSession = sessions.find(s => s.id === sessionId);
  const clientId = urlClientId || existingSession?.clientId || '';
  const client = getClientById(clientId);

  const initializedRef = useRef(false);

  const defaultAmount = client?.individualRate ?? user?.hourlyRate ?? 3000;

  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '10:00',
    duration: 50,
    status: 'completed' as 'scheduled' | 'completed' | 'cancelled' | 'no-show',
    notes: '',
    mood: 5,
    homework: '',
    nextSessionGoals: '',
    isPaid: true,
    amount: defaultAmount,
  });
  const [topics, setTopics] = useState<string[]>([]);
  const [newTopic, setNewTopic] = useState('');

  useEffect(() => {
    if (isEditing && existingSession && !initializedRef.current) {
      initializedRef.current = true;
      setFormData({
        date: existingSession.date,
        time: existingSession.time,
        duration: existingSession.duration,
        status: existingSession.status,
        notes: existingSession.notes || '',
        mood: existingSession.mood ?? 5,
        homework: existingSession.homework || '',
        nextSessionGoals: existingSession.nextSessionGoals || '',
        isPaid: existingSession.isPaid,
        amount: existingSession.amount || client?.individualRate || user?.hourlyRate || 3000,
      });
      setTopics(existingSession.topics || []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, existingSession?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sessionData = { ...formData, clientId, topics };

    const wasCompleted = existingSession?.status === 'completed';
    const isNowCompleted = formData.status === 'completed';

    if (isEditing && sessionId) {
      await updateSession(sessionId, sessionData);

      const relatedApt = appointments.find(a =>
        a.clientId === clientId && a.date === formData.date && a.time === formData.time
      );
      if (relatedApt) {
        await updateAppointment(relatedApt.id, { status: formData.status });
      }
    } else {
      let aptId: string | undefined;
      const existingApt = appointments.find(a =>
        a.clientId === clientId && a.date === formData.date && a.time === formData.time
      );
      if (existingApt) {
        aptId = existingApt.id;
      } else if (client) {
        const newApt = await addAppointment({
          clientId,
          clientName: client.name,
          date: formData.date,
          time: formData.time,
          duration: formData.duration,
          status: formData.status,
          isOnline: client.isOnline,
          meetingLink: client.meetingLink,
        });
        aptId = newApt?.id;
      }
      await addSession({ ...sessionData, appointmentId: aptId });
    }

    if (!wasCompleted && isNowCompleted) {
      const currentClient = clients.find(c => c.id === clientId);
      if (currentClient?.packageId && (currentClient.remainingSessions ?? 0) > 0) {
        await updateClient(clientId, { remainingSessions: (currentClient.remainingSessions ?? 1) - 1 });
      }
    }

    if (urlClientId) {
      navigate(`/clients/${clientId}`);
    } else {
      navigate(-1);
    }
  };

  const ownAppointment = useMemo(() => {
    if (!existingSession) return null;
    return appointments.find(a =>
      (existingSession.appointmentId && a.id === existingSession.appointmentId) ||
      (a.clientId === existingSession.clientId &&
       a.date === existingSession.date &&
       a.time === existingSession.time)
    ) || null;
  }, [existingSession, appointments]);

  const hasConflict = (): boolean => {
    if (!formData.date || !formData.time) return false;
    return appointments.some(a => {
      if (ownAppointment && a.id === ownAppointment.id) return false;
      if (a.date !== formData.date) return false;
      const [aH, aM] = a.time.split(':').map(Number);
      const [fH, fM] = formData.time.split(':').map(Number);
      const aStart = aH * 60 + aM;
      const aEnd = aStart + a.duration;
      const fStart = fH * 60 + fM;
      const fEnd = fStart + formData.duration;
      return fStart < aEnd && fEnd > aStart;
    });
  };

  const conflict = hasConflict();

  const addTopic = () => {
    if (newTopic.trim() && !topics.includes(newTopic.trim())) {
      setTopics([...topics, newTopic.trim()]);
      setNewTopic('');
    }
  };
  const removeTopic = (topic: string) => setTopics(topics.filter(t => t !== topic));

  const moodLabels = (t('mood_labels') as unknown as string[]);

  const statusOptions = [
    { value: 'completed', label: t('status_completed_session'), color: 'bg-green-100 border-green-500 text-green-700' },
    { value: 'scheduled', label: t('status_scheduled'),          color: 'bg-blue-100 border-blue-500 text-blue-700' },
    { value: 'cancelled', label: t('status_cancelled'),          color: 'bg-red-100 border-red-500 text-red-700' },
    { value: 'no-show',   label: t('status_no_show'),            color: 'bg-yellow-100 border-yellow-500 text-yellow-700' },
  ];

  const clientCurrency = client?.individualCurrency || user?.currency || '₽';

  if (!client) {
    return (
      <Layout>
        <div className="text-center py-16">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">{t('client_not_found')}</h2>
          <button onClick={() => navigate(-1)} className="btn-primary">{t('back')}</button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto animate-fadeIn">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex-shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate">
              {isEditing ? t('edit_session') : t('new_session')}
            </h1>
            <p className="text-gray-500 text-sm truncate">{t('client_label')}: {client.name}</p>
          </div>
        </div>

        {/* Conflict warning */}
        {conflict && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-red-700 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>⚠️ {t('status_scheduled')} — {t('time')} {t('not_specified')}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date & Time */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-3">{t('session_date')} & {t('session_time')}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('session_date')}</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('session_time')}</label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={e => setFormData(prev => ({ ...prev, time: e.target.value }))}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('session_duration')}</label>
                <select
                  value={formData.duration}
                  onChange={e => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                  className="input-field"
                >
                  <option value={30}>30 {t('minutes')}</option>
                  <option value={45}>45 {t('minutes')}</option>
                  <option value={50}>50 {t('minutes')}</option>
                  <option value={60}>60 {t('minutes')}</option>
                  <option value={90}>90 {t('minutes')}</option>
                  <option value={120}>120 {t('minutes')}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-3">{t('session_status')}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {statusOptions.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, status: s.value as typeof formData.status }))}
                  className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    formData.status === s.value ? s.color : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Topics */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-3">{t('session_topics')}</h2>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newTopic}
                onChange={e => setNewTopic(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTopic())}
                className="input-field flex-1 text-sm"
                placeholder={t('enter_topic')}
              />
              <button type="button" onClick={addTopic} className="btn-secondary p-3 flex-shrink-0">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {topics.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {topics.map(topic => (
                  <span key={topic} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-lg text-sm">
                    {topic}
                    <button type="button" onClick={() => removeTopic(topic)} className="hover:text-indigo-900 ml-1">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Mood */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-3">{t('session_mood')}</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                <span>{moodLabels[0]}</span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  {formData.mood} / 10 — {moodLabels[formData.mood - 1]}
                </span>
                <span>{moodLabels[9]}</span>
              </div>
              <div className="grid grid-cols-10 gap-1">
                {Array.from({ length: 10 }, (_, i) => i + 1).map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, mood: val }))}
                    className={`h-10 rounded-lg text-sm font-bold transition-all ${
                      formData.mood === val
                        ? 'bg-indigo-500 text-white scale-110 shadow-md'
                        : val <= formData.mood
                        ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-3">{t('session_notes')}</h2>
            <textarea
              value={formData.notes}
              onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="input-field min-h-[120px] resize-y text-sm"
            />
          </div>

          {/* Homework */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-3">{t('session_homework')}</h2>
            <textarea
              value={formData.homework}
              onChange={e => setFormData(prev => ({ ...prev, homework: e.target.value }))}
              className="input-field min-h-[80px] resize-y text-sm"
            />
          </div>

          {/* Goals */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-3">{t('session_goals')}</h2>
            <textarea
              value={formData.nextSessionGoals}
              onChange={e => setFormData(prev => ({ ...prev, nextSessionGoals: e.target.value }))}
              className="input-field min-h-[80px] resize-y text-sm"
            />
          </div>

          {/* Payment */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-3">{t('session_paid')}</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, isPaid: true }))}
                  className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    formData.isPaid
                      ? 'bg-green-100 border-green-500 text-green-700'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  ✅ {t('is_paid')}
                </button>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, isPaid: false }))}
                  className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    !formData.isPaid
                      ? 'bg-red-100 border-red-500 text-red-700'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-gray-300'
                  }`}
                >
                  ❌ {t('not_paid')}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={formData.amount}
                  onChange={e => setFormData(prev => ({ ...prev, amount: parseInt(e.target.value) || 0 }))}
                  className="input-field text-sm flex-1"
                  placeholder={t('session_amount')}
                  min={0}
                />
                <span className="text-gray-500 dark:text-gray-400 text-sm flex-shrink-0 font-medium">
                  {clientCurrency}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pb-4">
            <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1 text-sm">
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={conflict}
              className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {isEditing ? t('save') : t('new_session')}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
