import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Calendar, Clock, CheckCircle, XCircle, AlertCircle, DollarSign } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import Layout from '../components/Layout';
import { useState } from 'react';

export default function SessionDetail() {
  const { clientId, sessionId } = useParams();
  const navigate = useNavigate();
  const { sessions, getClientById, deleteSession, user } = useApp();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const session = sessions.find(s => s.id === sessionId);
  const client = getClientById(clientId || '');

  if (!session || !client) {
    return (
      <Layout>
        <div className="text-center py-16">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Сессия не найдена</h2>
          <Link to={clientId ? `/clients/${clientId}` : '/journal'} className="btn-primary">Назад</Link>
        </div>
      </Layout>
    );
  }

  const handleDelete = () => {
    deleteSession(session.id);
    navigate(`/clients/${clientId}`);
  };

  const statusConfig = {
    scheduled: { label: 'Запланирована', icon: Calendar, color: 'bg-blue-100 text-blue-700' },
    completed: { label: 'Проведена', icon: CheckCircle, color: 'bg-green-100 text-green-700' },
    cancelled: { label: 'Отменена', icon: XCircle, color: 'bg-red-100 text-red-700' },
    'no-show': { label: 'Неявка', icon: AlertCircle, color: 'bg-yellow-100 text-yellow-700' },
  };
  const status = statusConfig[session.status];
  const StatusIcon = status.icon;
  const moodLabels = ['Очень плохо', 'Плохо', 'Ниже среднего', 'Удовлетворительно', 'Нормально', 'Хорошо', 'Довольно хорошо', 'Очень хорошо', 'Отлично', 'Превосходно'];

  return (
    <Layout>
      <div className="max-w-3xl mx-auto animate-fadeIn">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">Запись о сессии</h1>
            <p className="text-gray-500">Клиент: {client.name}</p>
          </div>
          <div className="flex gap-2">
            <Link to={`/clients/${clientId}/sessions/${sessionId}/edit`} className="btn-secondary p-2.5">
              <Edit className="w-5 h-5" />
            </Link>
            <button onClick={() => setShowDeleteModal(true)} className="btn-danger p-2.5">
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="card mb-6">
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${status.color}`}>
              <StatusIcon className="w-5 h-5" /><span className="font-medium">{status.label}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="w-5 h-5" />
              <span>{format(parseISO(session.date), 'd MMMM yyyy', { locale: ru })}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="w-5 h-5" />
              <span>{session.time} • {session.duration} мин</span>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {session.mood && (
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Состояние клиента</h3>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center text-xl font-bold text-indigo-600">
                    {session.mood}
                  </div>
                  <span className="text-gray-900">{moodLabels[session.mood - 1]}</span>
                </div>
              </div>
            )}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Оплата</h3>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${session.isPaid ? 'bg-green-100' : 'bg-yellow-100'}`}>
                  <DollarSign className={`w-6 h-6 ${session.isPaid ? 'text-green-600' : 'text-yellow-600'}`} />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{session.amount.toLocaleString()} {user?.currency || '₽'}</p>
                  <p className={`text-sm ${session.isPaid ? 'text-green-600' : 'text-yellow-600'}`}>
                    {session.isPaid ? 'Оплачено' : 'Ожидает оплаты'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {session.topics.length > 0 && (
          <div className="card mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Темы сессии</h3>
            <div className="flex flex-wrap gap-2">
              {session.topics.map((topic, i) => (
                <span key={i} className="px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium">{topic}</span>
              ))}
            </div>
          </div>
        )}

        {session.notes && (
          <div className="card mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Заметки о сессии</h3>
            <p className="text-gray-600 whitespace-pre-wrap">{session.notes}</p>
          </div>
        )}

        {session.homework && (
          <div className="card mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Домашнее задание</h3>
            <p className="text-gray-600 whitespace-pre-wrap">{session.homework}</p>
          </div>
        )}

        {session.nextSessionGoals && (
          <div className="card mb-6">
            <h3 className="font-semibold text-gray-900 mb-4">Цели на следующую сессию</h3>
            <p className="text-gray-600 whitespace-pre-wrap">{session.nextSessionGoals}</p>
          </div>
        )}

        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full animate-fadeIn">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Удалить запись?</h3>
              <p className="text-gray-500 mb-6">Это действие нельзя отменить.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowDeleteModal(false)} className="btn-secondary flex-1">Отмена</button>
                <button onClick={handleDelete} className="btn-danger flex-1">Удалить</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
