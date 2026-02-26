import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Plus, X } from 'lucide-react';
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

  useEffect(() => {
    if (isEditing && existingSession) {
      setFormData({
        date: existingSession.date,
        time: existingSession.time,
        duration: existingSession.duration,
        status: existingSession.status,
        notes: existingSession.notes || '',
        mood: existingSession.mood || 5,
        homework: existingSession.homework || '',
        nextSessionGoals: existingSession.nextSessionGoals || '',
        isPaid: existingSession.isPaid,
        amount: existingSession.amount || user?.hourlyRate || 3000,
      });
      setTopics(existingSession.topics || []);
    }
  }, [isEditing, existingSession, user?.hourlyRate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sessionData = { ...formData, clientId, topics };

    const wasCompleted = existingSession?.status === 'completed';
    const isNowCompleted = formData.status === 'completed';

    if (isEditing && sessionId) {
      updateSession(sessionId, sessionData);
    } else {
      // NEW session from client card → also create/update appointment
      addSession(sessionData);

      const existingApt = appointments.find(a =>
        a.clientId === clientId && a.date === formData.date && a.time === formData.time
      );
      if (!existingApt && client) {
        addAppointment({
          clientId,
          clientName: client.name,
          date: formData.date,
          time: formData.time,
          duration: formData.duration,
          status: formData.status,
          isOnline: client.isOnline,
          meetingLink: client.meetingLink,
        });
      }
    }

    // Sync appointment status
    const relatedApt = appointments.find(a =>
      a.clientId === clientId && a.date === formData.date && a.time === formData.time
    );
    if (relatedApt) {
      updateAppointment(relatedApt.id, { status: formData.status });
    }

    // Deduct from package only when transitioning TO completed
    if (!wasCompleted && isNowCompleted) {
      const currentClient = clients.find(c => c.id === clientId);
      if (currentClient?.packageId && (currentClient.remainingSessions ?? 0) > 0) {
        updateClient(clientId, { remainingSessions: (currentClient.remainingSessions ?? 1) - 1 });
      }
    }

    if (urlClientId) {
      navigate(`/clients/${clientId}`);
    } else {
      navigate(-1);
    }
  };

  // Conflict check
  const hasConflict = () => {
    if (!formData.date || !formData.time) return false;
    return appointments.some(a => {
      if (a.clientId === clientId && a.date === formData.date && a.time === formData.time) return false; // same client same slot — ok (editing)
      if (existingSession && a.clientId === clientId && a.date === existingSession.date && a.time === existingSession.time) return false;
      if (a.date !== formData.date) return false;
      // Check time overlap
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

  if (!client) {
    return (
      <Layout>
        <div className="text-center py-16">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Клиент не найден</h2>
          <button onClick={() => navigate(-1)} className="btn-primary">Назад</button>
        </div>
      </Layout>
    );
  }

  const moodLabels = ['Очень плохо','Плохо','Ниже среднего','Удовлетворительно','Нормально','Хорошо','Довольно хорошо','Очень хорошо','Отлично','Превосходно'];

  return (
    <Layout>
      <div className="max-w-2xl mx-auto animate-fadeIn">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg flex-shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">
              {isEditing ? 'Редактировать сессию' : 'Новая запись о сессии'}
            </h1>
            <p className="text-gray-500 text-sm truncate">Клиент: {client.name}</p>
          </div>
        </div>

        {/* Conflict warning */}
        {conflict && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
            ⚠️ В это время уже запланирована другая сессия. Пожалуйста, выберите другое время.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date & Time */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-3">Дата и время</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Дата</label>
                <input type="date" value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                  className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Время</label>
                <input type="time" value={formData.time}
                  onChange={e => setFormData({ ...formData, time: e.target.value })}
                  className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Длит.</label>
                <select value={formData.duration}
                  onChange={e => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                  className="input-field">
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
            <h2 className="font-semibold text-gray-900 mb-3">Статус сессии</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { value: 'completed',  label: 'Проведена',    color: 'bg-green-100 border-green-500 text-green-700' },
                { value: 'scheduled',  label: 'Запланирована',color: 'bg-blue-100 border-blue-500 text-blue-700' },
                { value: 'cancelled',  label: 'Отменена',     color: 'bg-red-100 border-red-500 text-red-700' },
                { value: 'no-show',    label: 'Неявка',       color: 'bg-yellow-100 border-yellow-500 text-yellow-700' },
              ].map(s => (
                <button key={s.value} type="button"
                  onClick={() => setFormData({ ...formData, status: s.value as typeof formData.status })}
                  className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                    formData.status === s.value ? s.color : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Topics */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-3">Темы сессии</h2>
            <div className="flex gap-2 mb-3">
              <input type="text" value={newTopic}
                onChange={e => setNewTopic(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTopic())}
                className="input-field flex-1 text-sm" placeholder="Добавить тему..." />
              <button type="button" onClick={addTopic} className="btn-secondary p-3 flex-shrink-0">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {topics.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {topics.map(topic => (
                  <span key={topic} className="flex items-center gap-1 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-sm">
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
            <h2 className="font-semibold text-gray-900 mb-3">Состояние клиента</h2>
            <input type="range" min="1" max="10" value={formData.mood}
              onChange={e => setFormData({ ...formData, mood: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
            <div className="flex justify-between text-sm text-gray-500 mt-1.5">
              <span>1</span>
              <span className="font-medium text-indigo-600">{formData.mood} — {moodLabels[formData.mood - 1]}</span>
              <span>10</span>
            </div>
          </div>

          {/* Notes */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-3">Заметки о сессии</h2>
            <textarea value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              className="input-field min-h-[120px] resize-y text-sm"
              placeholder="Опишите, что обсуждали на сессии..." />
          </div>

          {/* Homework */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-3">Домашнее задание</h2>
            <textarea value={formData.homework}
              onChange={e => setFormData({ ...formData, homework: e.target.value })}
              className="input-field min-h-[80px] resize-y text-sm"
              placeholder="Что клиент должен сделать до следующей сессии..." />
          </div>

          {/* Goals */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-3">Цели на следующую сессию</h2>
            <textarea value={formData.nextSessionGoals}
              onChange={e => setFormData({ ...formData, nextSessionGoals: e.target.value })}
              className="input-field min-h-[80px] resize-y text-sm"
              placeholder="Над чем планируете работать в следующий раз..." />
          </div>

          {/* Payment */}
          <div className="card">
            <h2 className="font-semibold text-gray-900 mb-3">Оплата</h2>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formData.isPaid}
                  onChange={e => setFormData({ ...formData, isPaid: e.target.checked })}
                  className="w-5 h-5 rounded text-indigo-600" />
                <span className="text-sm font-medium">Оплачено</span>
              </label>
              <div className="flex-1 flex items-center gap-2">
                <input type="number" value={formData.amount}
                  onChange={e => setFormData({ ...formData, amount: parseInt(e.target.value) || 0 })}
                  className="input-field text-sm" placeholder="Сумма" />
                <span className="text-gray-500 text-sm flex-shrink-0">{user?.currency || '₽'}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pb-4">
            <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1 text-sm">Отмена</button>
            <button type="submit" disabled={conflict}
              className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed">
              <Save className="w-4 h-4" /> {isEditing ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
