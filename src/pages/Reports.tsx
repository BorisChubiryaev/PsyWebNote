import { TR } from '../utils/tr';
import { useMemo, useState } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Clock, 
  Calendar,
  ChevronDown,
  BarChart3,
  PieChart as PieChartIcon
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { 
  format, 
  subDays, 
  subMonths, 
  endOfMonth, 
  endOfWeek,
  eachDayOfInterval,
  eachWeekOfInterval,
  eachMonthOfInterval,
  isWithinInterval,
  parseISO
} from 'date-fns';
import { ru } from 'date-fns/locale';
import Layout from '../components/Layout';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend
} from 'recharts';

type Period = 'week' | 'month' | '3months' | 'year' | 'all';

export default function Reports() {
  const { sessions, clients, user } = useApp();
  const [period, setPeriod] = useState<Period>('month');

  const periodDates = useMemo(() => {
    const today = new Date();
    switch (period) {
      case 'week':
        return { start: subDays(today, 7), end: today };
      case 'month':
        return { start: subDays(today, 30), end: today };
      case '3months':
        return { start: subMonths(today, 3), end: today };
      case 'year':
        return { start: subMonths(today, 12), end: today };
      case 'all':
        return { start: new Date(2020, 0, 1), end: today };
    }
  }, [period]);

  const filteredSessions = useMemo(() => {
    return sessions.filter(s => {
      const sessionDate = parseISO(s.date);
      return isWithinInterval(sessionDate, periodDates) && s.status === 'completed';
    });
  }, [sessions, periodDates]);

  // Key metrics
  const metrics = useMemo(() => {
    const totalRevenue = filteredSessions.reduce((acc, s) => acc + (s.isPaid ? s.amount : 0), 0);
    const totalSessions = filteredSessions.length;
    const totalHours = filteredSessions.reduce((acc, s) => acc + s.duration, 0) / 60;
    const uniqueClients = new Set(filteredSessions.map(s => s.clientId)).size;
    const avgSessionPrice = totalSessions > 0 ? totalRevenue / totalSessions : 0;
    const avgMood = filteredSessions.length > 0 
      ? filteredSessions.reduce((acc, s) => acc + (s.mood || 0), 0) / filteredSessions.length 
      : 0;
    
    // Compare with previous period
    const prevPeriodDates = {
      start: subDays(periodDates.start, Math.ceil((periodDates.end.getTime() - periodDates.start.getTime()) / (1000 * 60 * 60 * 24))),
      end: periodDates.start
    };
    
    const prevSessions = sessions.filter(s => {
      const sessionDate = parseISO(s.date);
      return isWithinInterval(sessionDate, prevPeriodDates) && s.status === 'completed';
    });
    
    const prevRevenue = prevSessions.reduce((acc, s) => acc + (s.isPaid ? s.amount : 0), 0);
    const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
    
    const prevSessionCount = prevSessions.length;
    const sessionsChange = prevSessionCount > 0 ? ((totalSessions - prevSessionCount) / prevSessionCount) * 100 : 0;

    return {
      totalRevenue,
      totalSessions,
      totalHours,
      uniqueClients,
      avgSessionPrice,
      avgMood,
      revenueChange,
      sessionsChange
    };
  }, [filteredSessions, periodDates, sessions]);

  // Revenue by day/week/month chart data
  const revenueChartData = useMemo(() => {
    const daysDiff = Math.ceil((periodDates.end.getTime() - periodDates.start.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= 14) {
      // Daily data
      const days = eachDayOfInterval(periodDates);
      return days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const daySessions = filteredSessions.filter(s => s.date === dayStr);
        return {
          name: format(day, 'd MMM', { locale: ru }),
          revenue: daySessions.reduce((acc, s) => acc + (s.isPaid ? s.amount : 0), 0),
          sessions: daySessions.length
        };
      });
    } else if (daysDiff <= 90) {
      // Weekly data
      const weeks = eachWeekOfInterval(periodDates, { weekStartsOn: 1 });
      return weeks.map(weekStart => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const weekSessions = filteredSessions.filter(s => {
          const date = parseISO(s.date);
          return isWithinInterval(date, { start: weekStart, end: weekEnd });
        });
        return {
          name: format(weekStart, 'd MMM', { locale: ru }),
          revenue: weekSessions.reduce((acc, s) => acc + (s.isPaid ? s.amount : 0), 0),
          sessions: weekSessions.length
        };
      });
    } else {
      // Monthly data
      const months = eachMonthOfInterval(periodDates);
      return months.map(monthStart => {
        const monthEnd = endOfMonth(monthStart);
        const monthSessions = filteredSessions.filter(s => {
          const date = parseISO(s.date);
          return isWithinInterval(date, { start: monthStart, end: monthEnd });
        });
        return {
          name: format(monthStart, 'MMM yyyy', { locale: ru }),
          revenue: monthSessions.reduce((acc, s) => acc + (s.isPaid ? s.amount : 0), 0),
          sessions: monthSessions.length
        };
      });
    }
  }, [periodDates, filteredSessions]);

  // Sessions by client
  const clientSessionsData = useMemo(() => {
    const clientMap: Record<string, { name: string; sessions: number; revenue: number }> = {};
    
    filteredSessions.forEach(session => {
      const client = clients.find(c => c.id === session.clientId);
      if (client) {
        if (!clientMap[client.id]) {
          clientMap[client.id] = { name: client.name, sessions: 0, revenue: 0 };
        }
        clientMap[client.id].sessions++;
        clientMap[client.id].revenue += session.isPaid ? session.amount : 0;
      }
    });
    
    return Object.values(clientMap)
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 10);
  }, [filteredSessions, clients]);

  // Topics distribution
  const topicsData = useMemo(() => {
    const topicMap: Record<string, number> = {};
    
    filteredSessions.forEach(session => {
      session.topics.forEach(topic => {
        topicMap[topic] = (topicMap[topic] || 0) + 1;
      });
    });
    
    return Object.entries(topicMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));
  }, [filteredSessions]);

  // Client mood over time
  const moodChartData = useMemo(() => {
    const daysDiff = Math.ceil((periodDates.end.getTime() - periodDates.start.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= 30) {
      const days = eachDayOfInterval(periodDates);
      return days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const daySessions = filteredSessions.filter(s => s.date === dayStr && s.mood);
        const avgMood = daySessions.length > 0 
          ? daySessions.reduce((acc, s) => acc + (s.mood || 0), 0) / daySessions.length 
          : null;
        return {
          name: format(day, 'd MMM', { locale: ru }),
          mood: avgMood
        };
      }).filter(d => d.mood !== null);
    } else {
      const weeks = eachWeekOfInterval(periodDates, { weekStartsOn: 1 });
      return weeks.map(weekStart => {
        const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
        const weekSessions = filteredSessions.filter(s => {
          const date = parseISO(s.date);
          return isWithinInterval(date, { start: weekStart, end: weekEnd }) && s.mood;
        });
        const avgMood = weekSessions.length > 0 
          ? weekSessions.reduce((acc, s) => acc + (s.mood || 0), 0) / weekSessions.length 
          : null;
        return {
          name: format(weekStart, 'd MMM', { locale: ru }),
          mood: avgMood
        };
      }).filter(d => d.mood !== null);
    }
  }, [periodDates, filteredSessions]);

  // Session status distribution
  const sessionStatusData = useMemo(() => {
    const allPeriodSessions = sessions.filter(s => {
      const sessionDate = parseISO(s.date);
      return isWithinInterval(sessionDate, periodDates);
    });
    
    const completed = allPeriodSessions.filter(s => s.status === 'completed').length;
    const cancelled = allPeriodSessions.filter(s => s.status === 'cancelled').length;
    const noShow = allPeriodSessions.filter(s => s.status === 'no-show').length;
    
    return [
      { name: TR("Проведено", "Conducted"), value: completed, color: '#10B981' },
      { name: TR("Отменено", "Canceled"), value: cancelled, color: '#EF4444' },
      { name: TR("Неявка", "No-show"), value: noShow, color: '#F59E0B' },
    ].filter(d => d.value > 0);
  }, [sessions, periodDates]);

  // Payment status
  const paymentStatusData = useMemo(() => {
    const paid = filteredSessions.filter(s => s.isPaid).length;
    const unpaid = filteredSessions.filter(s => !s.isPaid).length;
    const unpaidAmount = filteredSessions.filter(s => !s.isPaid).reduce((acc, s) => acc + s.amount, 0);
    
    return { paid, unpaid, unpaidAmount };
  }, [filteredSessions]);

  const acquisitionData = useMemo(() => {
    const relevantClients = clients.filter(client => {
      if (!client.createdAt) return false;
      const createdAt = new Date(client.createdAt);
      return isWithinInterval(createdAt, periodDates);
    });

    const channelMap: Record<string, number> = {};
    relevantClients.forEach(client => {
      const key = client.acquisitionChannel || TR("Не указан", "Not specified");
      channelMap[key] = (channelMap[key] || 0) + 1;
    });

    const labels: Record<string, string> = {
      aggregator: TR("Агрегатор", "Aggregator"),
      word_of_mouth: TR("Сарафанное радио", "Word of mouth"),
      colleague_referral: TR("Рекомендация коллеги", "Colleague referral"),
      social_media: TR("Соцсети", "Social media"),
      other: TR("Другое", "Other"),
      [TR("Не указан", "Not specified")]: TR("Не указан", "Not specified"),
    };

    return Object.entries(channelMap)
      .map(([key, value]) => ({
        key,
        name: labels[key] || key,
        value,
      }))
      .sort((a, b) => b.value - a.value);
  }, [clients, periodDates]);

  const COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#14B8A6'];

  const periodLabels: Record<Period, string> = {
    week: TR("Неделя", "Week"),
    month: TR("Месяц", "Month"),
    '3months': TR("3 месяца", "3 months"),
    year: TR("Год", "Year"),
    all: TR("Все время", "All the time")
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto animate-fadeIn">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">{TR("Отчёты", "Reports")}</h1>
            <p className="text-gray-500">{TR("Аналитика и статистика", "Analytics and statistics")}</p>
          </div>
          
          {/* Period Selector */}
          <div className="relative">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as Period)}
              className="input-field pr-10 appearance-none cursor-pointer"
            >
              {Object.entries(periodLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="card bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">{TR("Доход", "Income")}</p>
                <p className="text-2xl font-bold text-green-700 mt-1">
                  {metrics.totalRevenue.toLocaleString()} {user?.currency || '₽'}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
            {metrics.revenueChange !== 0 && (
              <div className={`flex items-center gap-1 mt-3 text-sm ${metrics.revenueChange > 0 ? 'text-green-600' : 'text-red-500'}`}>
                {metrics.revenueChange > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {Math.abs(metrics.revenueChange).toFixed(1)}{TR("% к пред. периоду\n              ", "% to previous period")}</div>
            )}
          </div>

          <div className="card bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">{TR("Сессий проведено", "Sessions held")}</p>
                <p className="text-2xl font-bold text-blue-700 mt-1">{metrics.totalSessions}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            {metrics.sessionsChange !== 0 && (
              <div className={`flex items-center gap-1 mt-3 text-sm ${metrics.sessionsChange > 0 ? 'text-green-600' : 'text-red-500'}`}>
                {metrics.sessionsChange > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                {Math.abs(metrics.sessionsChange).toFixed(1)}{TR("% к пред. периоду\n              ", "% to previous period")}</div>
            )}
          </div>

          <div className="card bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">{TR("Часов работы", "Opening hours")}</p>
                <p className="text-2xl font-bold text-purple-700 mt-1">{metrics.totalHours.toFixed(1)}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <p className="text-sm text-purple-600 mt-3">
              {TR("\n              Средняя стоимость: ", "Average cost:")}{metrics.avgSessionPrice.toLocaleString()} {user?.currency || '₽'}
            </p>
          </div>

          <div className="card bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-amber-600 font-medium">{TR("Активных клиентов", "Active clients")}</p>
                <p className="text-2xl font-bold text-amber-700 mt-1">{metrics.uniqueClients}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-amber-600" />
              </div>
            </div>
            <p className="text-sm text-amber-600 mt-3">
              {TR("\n              Среднее настроение: ", "Average mood:")}{metrics.avgMood.toFixed(1)}/10
            </p>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Revenue Chart */}
          <div className="card">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              <h3 className="font-semibold text-gray-900">{TR("Динамика дохода", "Income dynamics")}</h3>
            </div>
            {revenueChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenueChartData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366F1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                    formatter={(value) => [`${Number(value || 0).toLocaleString()} ${user?.currency || '₽'}`, TR("Доход", "Income")]}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#6366F1" strokeWidth={2} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                {TR("\n                Нет данных за выбранный период\n              ", "There is no data for the selected period")}</div>
            )}
          </div>

          {/* Sessions by Client */}
          <div className="card">
            <div className="flex items-center gap-2 mb-6">
              <Users className="w-5 h-5 text-indigo-600" />
              <h3 className="font-semibold text-gray-900">{TR("Сессии по клиентам", "Sessions by client")}</h3>
            </div>
            {clientSessionsData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={clientSessionsData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} stroke="#9CA3AF" width={100} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                    formatter={(value, name) => [Number(value || 0), name === 'sessions' ? TR("Сессий", "Sessions") : TR("Доход", "Income")]}
                  />
                  <Bar dataKey="sessions" fill="#6366F1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-500">
                {TR("\n                Нет данных за выбранный период\n              ", "There is no data for the selected period")}</div>
            )}
          </div>
        </div>

        {/* Charts Row 2 */}
        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          {/* Session Status Pie */}
          <div className="card">
            <div className="flex items-center gap-2 mb-6">
              <PieChartIcon className="w-5 h-5 text-indigo-600" />
              <h3 className="font-semibold text-gray-900">{TR("Статусы сессий", "Session statuses")}</h3>
            </div>
            {sessionStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={sessionStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {sessionStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-500">
                {TR("\n                Нет данных\n              ", "No data")}</div>
            )}
          </div>

          {/* Topics Distribution */}
          <div className="card">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              <h3 className="font-semibold text-gray-900">{TR("Популярные темы", "Popular Topics")}</h3>
            </div>
            {topicsData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={topicsData}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {topicsData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-500">
                {TR("\n                Нет данных\n              ", "No data")}</div>
            )}
          </div>

          {/* Payment Status */}
          <div className="card">
            <div className="flex items-center gap-2 mb-6">
              <DollarSign className="w-5 h-5 text-indigo-600" />
              <h3 className="font-semibold text-gray-900">{TR("Оплата", "Payment")}</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl">
                <div>
                  <p className="text-sm text-green-600">{TR("Оплачено", "Paid")}</p>
                  <p className="text-2xl font-bold text-green-700">{paymentStatusData.paid}</p>
                </div>
                <div className="text-green-600 text-3xl font-bold">
                  {filteredSessions.length > 0 ? Math.round((paymentStatusData.paid / filteredSessions.length) * 100) : 0}%
                </div>
              </div>
              
              {paymentStatusData.unpaid > 0 && (
                <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl">
                  <div>
                    <p className="text-sm text-red-600">{TR("Не оплачено", "Not paid")}</p>
                    <p className="text-2xl font-bold text-red-700">{paymentStatusData.unpaid}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-red-600">{TR("Задолженность", "Debt")}</p>
                    <p className="text-lg font-bold text-red-700">
                      {paymentStatusData.unpaidAmount.toLocaleString()} {user?.currency || '₽'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="card mb-6">
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-gray-900">{TR("Каналы привлечения", "Acquisition channels")}</h3>
          </div>
          {acquisitionData.length > 0 ? (
            <div className="grid lg:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)] gap-6 items-center">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={acquisitionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                    formatter={(value) => [Number(value || 0), TR("Клиентов", "Clients")]}
                  />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                    {acquisitionData.map((entry, index) => (
                      <Cell key={entry.key} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="space-y-3">
                {acquisitionData.map((channel, index) => (
                  <div key={channel.key} className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="text-sm font-medium text-gray-700">{channel.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{channel.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-500">
              {TR("Нет данных по каналам привлечения за выбранный период", "No acquisition channel data for the selected period")}
            </div>
          )}
        </div>

        {/* Mood Chart */}
        <div className="card mb-6">
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-gray-900">{TR("Динамика настроения клиентов", "Dynamics of customer sentiment")}</h3>
          </div>
          {moodChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={moodChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                <YAxis domain={[0, 10]} tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  formatter={(value) => [Number(value || 0).toFixed(1), TR("Настроение", "Mood")]}
                />
                <Line 
                  type="monotone" 
                  dataKey="mood" 
                  stroke="#8B5CF6" 
                  strokeWidth={3}
                  dot={{ fill: '#8B5CF6', strokeWidth: 2 }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              {TR("\n              Нет данных о настроении за выбранный период\n            ", "No sentiment data for the selected period")}</div>
          )}
        </div>

        {/* Sessions Count Chart */}
        <div className="card">
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <h3 className="font-semibold text-gray-900">{TR("Количество сессий", "Number of sessions")}</h3>
          </div>
          {revenueChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                <YAxis tick={{ fontSize: 12 }} stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  formatter={(value) => [Number(value || 0), TR("Сессий", "Sessions")]}
                />
                <Bar dataKey="sessions" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              {TR("\n              Нет данных за выбранный период\n            ", "There is no data for the selected period")}</div>
          )}
        </div>
      </div>
    </Layout>
  );
}
