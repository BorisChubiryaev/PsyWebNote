import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Plus, X, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { format } from 'date-fns';
import Layout from '../components/Layout';

export default function SessionForm() {
  const { clientId: urlClientId, sessionId } = useParams();
  const navigate = useNavigate();
  const {
    addSession, updateSession, sessions, getClientById, user,
    appointments, addAppointment, updateAppointment, updateClient, clients,
  } = useApp();

  const isEditing = !!sessionId;
  const existingSession = sessions.find(s => s.id === sessionId);
  const clientId = urlClientId || existingSession?.clientId || '';
  const client = getClientById(clientId);

  // Track if form was initialized from existing session
  const initializedRef = useRef(false);

  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '10:00',
    duration: 60,
    status: 'completed' as 'scheduled' | 'completed' | 'cancelled' | 'no-show',
    notes: '',
    mood: 5,
    homework: '',
    nextSessionGoals: '',
    isPaid: true,
    amount: user?.hourlyRate || 3000,
  });
  const [topics, setTopics] = useState<string[]>([]);
  const [newTopic, setNewTopic] = useState('');

  // Initialize form ONCE from existing session — never re-run when user changes
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
        amount: existingSession.amount || user?.hourlyRate || 3000,
      });
      setTopics(existingSession.topics || []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, existingSession?.id]); // Only re-init if sessionId changes

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sessionData = { ...formData, clientId, topics };

    const wasCompleted = existingSession?.status === 'completed';
    const isNowCompleted = formData.status === 'completed';

    if (isEditing && sessionId) {
      await updateSession(sessionId, sessionData);

      // Sync related appointment status
      const relatedApt = appointments.find(a =>
        a.clientId === clientId && a.date === formData.date && a.time === formData.time
      );
      if (relatedApt) {
        await updateAppointment(relatedApt.id, { status: formData.status });
      }
    } else {
      // NEW session → find or create appointment first, then link
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

    // Deduct from package only when transitioning TO completed
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

  // Find the appointment that belongs to this session (to exclude it from conflict check)
  const ownAppointment = useMemo(() => {
    if (!existingSession) return null;
    // Match by appointmentId stored on session, or by date+time+clientId
    return appointments.find(a =>
      (existingSession.appointmentId && a.id === existingSession.appointmentId) ||
      (a.clientId === existingSession.clientId &&
       a.date === existingSession.date &&
       a.time === existingSession.time)
    ) || null;
  }, [existingSession, appointments]);

  // Conflict check — exclude the appointment that belongs to THIS session
  const hasConflict = (): boolean => {
    if (!formData.date || !formData.time) return false;
    return appointments.some(a => {
      // Skip own appointment when editing
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

  const moodLabels = [
    'Очень плохо', 'Плохо', 'Ниже среднего', 'Удовлетворительно', 'Нормально',
    'Хорошо', 'Довольно хорошо', 'Очень хорошо', 'Отлично', 'Превосходно'
  ];

  if (!client) {
    return (
      <Layout>
        <div className="text-center py-16">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Клиент не найден</h2>
          <button onClick={() => navigate(-1)} className="btn-primary">Назад</button>
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
              {isEditing ? 'Редактировать сессию' : 'Новая запись о сессии'}
            </h1>
            <p className="text-gray-500 text-sm truncate">Клиент: {client.name}</p>
          </div>
        </div>

        {/* Conflict warning */}
        {conflict && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2 text-red-700 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>⚠️ В это время уже запланирована другая сессия. Пожалуйста, выберите другое время.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date & Time */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Дата и время</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Дата</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={e => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Время</label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={e => setFormData(prev => ({ ...prev, time: e.target.value }))}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Длит.</label>
                <select
                  value={formData.duration}
                  onChange={e => setFormData(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                  className="input-field"
                >
                  <option value={30}>30 мин</option>
                  <option value={45}>45 мин</option>
                  <option value={60}>60 мин</option>
                  <option value={90}>90 мин</option>
                  <option value={120}>120 мин</option>
                </select>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Статус сессии</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { value: 'completed',  label: 'Проведена',     color: 'bg-green-100 border-green-500 text-green-700' },
                { value: 'scheduled',  label: 'Запланирована', color: 'bg-blue-100 border-blue-500 text-blue-700' },
                { value: 'cancelled',  label: 'Отменена',      color: 'bg-red-100 border-red-500 text-red-700' },
                { value: 'no-show',    label: 'Неявка',        color: 'bg-yellow-100 border-yellow-500 text-yellow-700' },
              ].map(s => (
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
            <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Темы сессии</h2>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newTopic}
                onChange={e => setNewTopic(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTopic())}
                className="input-field flex-1 text-sm"
                placeholder="Добавить тему..."
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
            <h2 className="font-semibold text-gray-900 dark:text-white mb-3">
              Состояние клиента
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400">
                <span>Очень плохо</span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                  {formData.mood} / 10 — {moodLabels[formData.mood - 1]}
                </span>
                <span>Превосходно</span>
              </div>
              {/* Visual mood buttons instead of slider — always visible */}
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
            <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Заметки о сессии</h2>
            <textarea
              value={formData.notes}
              onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="input-field min-h-[120px] resize-y text-sm"
              placeholder="Опишите, что обсуждали на сессии..."
            />
          </div>

          {/* Homework */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Домашнее задание</h2>
            <textarea
              value={formData.homework}
              onChange={e => setFormData(prev => ({ ...prev, homework: e.target.value }))}
              className="input-field min-h-[80px] resize-y text-sm"
              placeholder="Что клиент должен сделать до следующей сессии..."
            />
          </div>

          {/* Goals */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Цели на следующую сессию</h2>
            <textarea
              value={formData.nextSessionGoals}
              onChange={e => setFormData(prev => ({ ...prev, nextSessionGoals: e.target.value }))}
              className="input-field min-h-[80px] resize-y text-sm"
              placeholder="Над чем планируете работать в следующий раз..."
            />
          </div>

          {/* Payment */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Оплата</h2>
            <div className="space-y-3">
              {/* Paid toggle as visible buttons */}
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
                  ✅ Оплачено
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
                  ❌ Не оплачено
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={formData.amount}
                  onChange={e => setFormData(prev => ({ ...prev, amount: parseInt(e.target.value) || 0 }))}
                  className="input-field text-sm flex-1"
                  placeholder="Сумма"
                  min={0}
                />
                <span className="text-gray-500 dark:text-gray-400 text-sm flex-shrink-0 font-medium">
                  {user?.currency || '₽'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pb-4">
            <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1 text-sm">
              Отмена
            </button>
            <button
              type="submit"
              disabled={conflict}
              className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {isEditing ? 'Сохранить изменения' : 'Создать запись'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
