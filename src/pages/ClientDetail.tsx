import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Edit, Trash2, Video, MapPin, Phone, Mail,
  MessageCircle, Instagram, Plus, Calendar, FileText, ExternalLink
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import Layout from '../components/Layout';

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getClientById, getSessionsByClientId, deleteClient, user } = useApp();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'sessions'>('info');

  const client = getClientById(id || '');
  const sessions = getSessionsByClientId(id || '');

  if (!client) {
    return (
      <Layout>
        <div className="text-center py-16">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Клиент не найден</h2>
          <Link to="/clients" className="btn-primary">Вернуться к списку</Link>
        </div>
      </Layout>
    );
  }

  const handleDelete = () => { deleteClient(client.id); navigate('/clients'); };
  const packageInfo = user?.packages.find(p => p.id === client.packageId);

  const socialIcons: Record<string, typeof MessageCircle> = {
    telegram: MessageCircle, instagram: Instagram, whatsapp: Phone, other: ExternalLink,
  };
  const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

  return (
    <Layout>
      <div className="max-w-4xl mx-auto animate-fadeIn">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate('/clients')} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{client.name}</h1>
            <p className="text-gray-500">Клиент с {format(parseISO(client.createdAt), 'd MMMM yyyy', { locale: ru })}</p>
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
                  {client.status === 'active' ? 'Активен' : client.status === 'paused' ? 'На паузе' : 'Завершен'}
                </span>
                <span className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 text-sm font-medium flex items-center gap-1">
                  {client.isOnline ? <Video className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                  {client.isOnline ? 'Онлайн' : 'Очно'}
                </span>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {client.phone && (
                  <a href={`tel:${client.phone}`} className="flex items-center gap-2 text-gray-600 hover:text-indigo-600">
                    <Phone className="w-4 h-4" />{client.phone}
                  </a>
                )}
                {client.email && (
                  <a href={`mailto:${client.email}`} className="flex items-center gap-2 text-gray-600 hover:text-indigo-600">
                    <Mail className="w-4 h-4" />{client.email}
                  </a>
                )}
                {client.socialLinks.map((link, i) => {
                  const Icon = socialIcons[link.type] || ExternalLink;
                  return (
                    <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-gray-600 hover:text-indigo-600">
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
            <h3 className="font-semibold text-gray-900 mb-4">Пакет услуг</h3>
            {packageInfo ? (
              <div>
                <p className="text-lg font-bold text-indigo-600">{packageInfo.name}</p>
                <p className="text-gray-500 mb-3">Осталось {client.remainingSessions} из {packageInfo.sessions} сессий</p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-indigo-500 h-2 rounded-full transition-all"
                    style={{ width: `${(client.remainingSessions / packageInfo.sessions) * 100}%` }} />
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Без пакета (поштучная оплата)</p>
            )}
          </div>
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Расписание</h3>
            {client.schedules.length > 0 ? (
              <div className="space-y-2">
                {client.schedules.map(schedule => (
                  <div key={schedule.id} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{dayNames[schedule.dayOfWeek]}</p>
                      <p className="text-sm text-gray-500">{schedule.time} • {schedule.duration} мин</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Расписание не задано</p>
            )}
          </div>
        </div>

        {client.isOnline && client.meetingLink && (
          <div className="card mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Ссылка на встречу</h3>
            <a href={client.meetingLink} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700">
              <Video className="w-5 h-5" />{client.meetingLink}
            </a>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button onClick={() => setActiveTab('info')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'info' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
            }`}>Заметки</button>
          <button onClick={() => setActiveTab('sessions')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'sessions' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-600 hover:bg-gray-100'
            }`}>Журнал сессий ({sessions.length})</button>
        </div>

        {activeTab === 'info' ? (
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Заметки о клиенте</h3>
            {client.notes ? (
              <p className="text-gray-600 whitespace-pre-wrap">{client.notes}</p>
            ) : (
              <p className="text-gray-500">Заметок пока нет</p>
            )}
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-900">История сессий</h3>
              <Link to={`/clients/${client.id}/sessions/new`} className="btn-primary flex items-center gap-2">
                <Plus className="w-5 h-5" /> Новая запись
              </Link>
            </div>

            {sessions.length > 0 ? (
              <div className="space-y-4">
                {sessions.map(session => (
                  <Link key={session.id} to={`/clients/${client.id}/sessions/${session.id}`}
                    className="card block hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {format(parseISO(session.date), 'd MMMM yyyy', { locale: ru })}
                        </p>
                        <p className="text-sm text-gray-500">{session.time} • {session.duration} мин</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        session.status === 'completed' ? 'bg-green-100 text-green-700' :
                        session.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        session.status === 'no-show' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {session.status === 'completed' ? 'Проведена' :
                         session.status === 'cancelled' ? 'Отменена' :
                         session.status === 'no-show' ? 'Неявка' : 'Запланирована'}
                      </span>
                    </div>
                    {session.topics.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {session.topics.map((topic, i) => (
                          <span key={i} className="px-2 py-1 bg-gray-100 rounded-lg text-xs text-gray-600">{topic}</span>
                        ))}
                      </div>
                    )}
                    {session.notes && (
                      <p className="mt-3 text-sm text-gray-600 line-clamp-2">{session.notes}</p>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="card text-center py-12">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">Записей о сессиях пока нет</p>
                <Link to={`/clients/${client.id}/sessions/new`} className="btn-primary inline-flex items-center gap-2">
                  <Plus className="w-5 h-5" /> Добавить первую запись
                </Link>
              </div>
            )}
          </div>
        )}

        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full animate-fadeIn">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Удалить клиента?</h3>
              <p className="text-gray-500 mb-6">Вы уверены, что хотите удалить клиента {client.name}? Это действие нельзя отменить.</p>
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
