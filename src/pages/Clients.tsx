import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, 
  UserPlus, 
  Video,
  MapPin,
  Package,
  ChevronRight
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import Layout from '../components/Layout';

export default function Clients() {
  const { clients } = useApp();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'completed'>('all');

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || client.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const statusColors = {
    active: 'bg-green-100 text-green-700',
    paused: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-gray-100 text-gray-700',
  };

  const statusLabels = {
    active: 'Активен',
    paused: 'Пауза',
    completed: 'Завершен',
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto animate-fadeIn">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Клиенты</h1>
            <p className="text-gray-500">{clients.length} клиентов</p>
          </div>
          <Link to="/clients/new" className="btn-primary flex items-center gap-2 justify-center">
            <UserPlus className="w-5 h-5" />
            Новый клиент
          </Link>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по имени..."
              className="input-field pl-12"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="input-field w-auto"
            >
              <option value="all">Все статусы</option>
              <option value="active">Активные</option>
              <option value="paused">На паузе</option>
              <option value="completed">Завершенные</option>
            </select>
          </div>
        </div>

        {/* Clients Grid */}
        {filteredClients.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClients.map(client => (
              <Link 
                key={client.id}
                to={`/clients/${client.id}`}
                className="card hover:shadow-md transition-shadow group"
              >
                <div className="flex items-start gap-4">
                  {client.avatar ? (
                    <img src={client.avatar} alt="" className="w-14 h-14 rounded-full object-cover" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xl font-medium">
                      {client.name.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                          {client.name}
                        </h3>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[client.status]}`}>
                          {statusLabels[client.status]}
                        </span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors" />
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    {client.isOnline ? (
                      <>
                        <Video className="w-4 h-4" />
                        <span>Онлайн</span>
                      </>
                    ) : (
                      <>
                        <MapPin className="w-4 h-4" />
                        <span>Очно</span>
                      </>
                    )}
                  </div>
                  {client.packageId && (
                    <div className="flex items-center gap-1">
                      <Package className="w-4 h-4" />
                      <span>{client.remainingSessions} сессий</span>
                    </div>
                  )}
                </div>

                {client.schedules.length > 0 && (
                  <div className="mt-3 text-sm text-gray-500">
                    {client.schedules.map((s, i) => (
                      <span key={s.id}>
                        {['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'][s.dayOfWeek]} {s.time}
                        {i < client.schedules.length - 1 && ', '}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Search className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {search ? 'Клиенты не найдены' : 'У вас пока нет клиентов'}
            </h3>
            <p className="text-gray-500 mb-6">
              {search ? 'Попробуйте изменить параметры поиска' : 'Добавьте первого клиента, чтобы начать работу'}
            </p>
            {!search && (
              <Link to="/clients/new" className="btn-primary inline-flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Добавить клиента
              </Link>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
