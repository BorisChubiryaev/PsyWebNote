import { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Link } from 'react-router-dom';
import {
  BookOpen, Search, Clock, ChevronDown, ChevronUp, FileText,
  Tag, Target, CheckSquare, MessageSquare, Smile, Edit,
  Bot, Send, Loader2, Sparkles, User as UserIcon,
  Brain, TrendingUp, AlertCircle, ChevronRight, Plus
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import Layout from '../components/Layout';
import { sendToMistral, ChatMessage, SYSTEM_PROMPT_ANALYST } from '../services/mistral';
import { Session, Client } from '../types';

const moodEmojis: Record<number, string> = {
  1:'😢',2:'😞',3:'😔',4:'😐',5:'😶',6:'🙂',7:'😊',8:'😄',9:'😁',10:'🤩',
};

function buildClientContext(client: Client, sessions: Session[]): string {
  const completed = sessions.filter(s => s.status === 'completed');
  const sorted = [...completed].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const sessionsText = sorted.map((s,i) => {
    const parts = [`Сессия ${i+1} (${s.date}, ${s.time})`];
    if (s.mood) parts.push(`Состояние: ${s.mood}/10`);
    if (s.topics?.length) parts.push(`Темы: ${s.topics.join(', ')}`);
    if (s.notes) parts.push(`Заметки: ${s.notes}`);
    if (s.homework) parts.push(`ДЗ: ${s.homework}`);
    if (s.nextSessionGoals) parts.push(`Цели: ${s.nextSessionGoals}`);
    return parts.join('\n  ');
  }).join('\n\n');
  return `КЛИЕНТ: ${client.name}\nВсего завершённых сессий: ${completed.length}\n${client.notes ? `Заметки: ${client.notes}` : ''}\n\nИСТОРИЯ:\n${sessionsText || 'Нет завершённых сессий'}`;
}

interface AiMsg { id: string; role: 'user'|'assistant'; content: string; ts: Date; }

const QUICK_PROMPTS = [
  { icon: TrendingUp,   label: 'Динамика',       text: 'Проанализируй динамику состояния клиента и прогресс.' },
  { icon: Brain,        label: 'Рекомендации',   text: 'Дай рекомендации по работе: техники, направление терапии.' },
  { icon: Target,       label: 'Следующая сессия',text: 'Предложи темы и вопросы для следующей сессии.' },
  { icon: AlertCircle, label: 'Риски',           text: 'Есть ли тревожные паттерны или риски?' },
];

const getStatusStyle = (status: string) => {
  const map: Record<string,string> = {
    completed: 'bg-green-100 text-green-700',
    cancelled:  'bg-orange-100 text-orange-700',
    'no-show':  'bg-red-100 text-red-700',
  };
  return map[status] || 'bg-gray-100 text-gray-600';
};
const getStatusLabel = (status: string) => {
  const map: Record<string,string> = {
    completed: 'Проведена', cancelled: 'Отменена', 'no-show': 'Не явился',
  };
  return map[status] || status;
};

interface ClientGroupProps {
  client: Client;
  sessions: Session[];
  currency?: string;
  searchTerm: string;
}

function ClientGroup({ client, sessions, currency, searchTerm }: ClientGroupProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // Only completed / cancelled / no-show (exclude scheduled)
  const relevantSessions = sessions
    .filter(s => s.status !== 'scheduled')
    .filter(s => {
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      return (
        s.notes?.toLowerCase().includes(q) ||
        s.topics?.some(t => t.toLowerCase().includes(q)) ||
        s.homework?.toLowerCase().includes(q) ||
        s.nextSessionGoals?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (relevantSessions.length === 0) return null;

  const toggleSession = (id: string) => {
    const s = new Set(expanded);
    s.has(id) ? s.delete(id) : s.add(id);
    setExpanded(s);
  };

  const totalHours = relevantSessions.filter(s=>s.status==='completed').reduce((sum,s) => sum + (s.duration||60)/60, 0);
  const totalEarned = relevantSessions.filter(s=>s.status==='completed').reduce((sum,s) => sum + (s.amount||0), 0);
  const moods = relevantSessions.filter(s=>s.mood);
  const avgMood = moods.length ? Math.round(moods.reduce((sum,s) => sum+(s.mood||0),0)/moods.length*10)/10 : null;

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Client header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {client.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 text-sm sm:text-base">{client.name}</span>
            <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full">
              {relevantSessions.length} {relevantSessions.length===1?'запись':'записей'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5 flex-wrap">
            {totalHours > 0 && <span>{Math.round(totalHours*10)/10} ч</span>}
            {totalEarned > 0 && <span>{totalEarned.toLocaleString()} {currency}</span>}
            {avgMood && <span>{moodEmojis[Math.round(avgMood)]} {avgMood}/10 ср.</span>}
          </div>
        </div>
        <Link
          to={`/clients/${client.id}`}
          onClick={e => e.stopPropagation()}
          className="p-2 hover:bg-indigo-50 rounded-lg text-indigo-600 flex-shrink-0 hidden sm:block"
        >
          <ChevronRight className="w-4 h-4" />
        </Link>
        {collapsed ? <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" /> : <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />}
      </button>

      {/* Sessions list */}
      {!collapsed && (
        <div className="border-t border-gray-100 divide-y divide-gray-50">
          {relevantSessions.map(session => {
            const isExp = expanded.has(session.id);
            return (
              <div key={session.id}>
                <button
                  onClick={() => toggleSession(session.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                >
                  {/* Date badge */}
                  <div className="w-12 text-center flex-shrink-0">
                    <div className="text-base font-bold text-indigo-600">{format(parseISO(session.date),'d')}</div>
                    <div className="text-[10px] text-indigo-400 uppercase">{format(parseISO(session.date),'MMM',{locale:ru})}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusStyle(session.status)}`}>
                        {getStatusLabel(session.status)}
                      </span>
                      {session.mood && <span className="text-base">{moodEmojis[session.mood]}</span>}
                      {session.isPaid && session.amount && (
                        <span className="text-xs text-green-600 font-medium">{session.amount.toLocaleString()} {currency}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5 flex-wrap">
                      <Clock className="w-3 h-3" />
                      <span>{session.time}</span>
                      <span>· {session.duration||60} мин</span>
                      {session.topics?.slice(0,2).map((t,i) => (
                        <span key={i} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px]">{t}</span>
                      ))}
                    </div>
                  </div>
                  {isExp ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                </button>

                {isExp && (
                  <div className="px-4 pb-4 bg-gray-50">
                    <div className="grid sm:grid-cols-2 gap-3 pt-3">
                      {session.notes && (
                        <div className="sm:col-span-2 bg-white rounded-xl p-3 border border-gray-100">
                          <h4 className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                            <FileText className="w-3.5 h-3.5" /> Заметки
                          </h4>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{session.notes}</p>
                        </div>
                      )}
                      {session.topics?.length > 0 && (
                        <div className="bg-indigo-50 rounded-xl p-3">
                          <h4 className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 mb-2">
                            <Tag className="w-3.5 h-3.5" /> Темы
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {session.topics.map((t,i) => (
                              <span key={i} className="px-2 py-0.5 bg-white text-indigo-700 rounded-full text-xs">{t}</span>
                            ))}
                          </div>
                        </div>
                      )}
                      {session.mood && (
                        <div className="bg-amber-50 rounded-xl p-3">
                          <h4 className="flex items-center gap-1.5 text-xs font-medium text-amber-600 mb-1.5">
                            <Smile className="w-3.5 h-3.5" /> Состояние
                          </h4>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{moodEmojis[session.mood]}</span>
                            <span className="font-bold text-amber-700">{session.mood}/10</span>
                          </div>
                        </div>
                      )}
                      {session.homework && (
                        <div className="bg-green-50 rounded-xl p-3">
                          <h4 className="flex items-center gap-1.5 text-xs font-medium text-green-600 mb-1.5">
                            <CheckSquare className="w-3.5 h-3.5" /> Домашнее задание
                          </h4>
                          <p className="text-sm text-green-800">{session.homework}</p>
                        </div>
                      )}
                      {session.nextSessionGoals && (
                        <div className="bg-purple-50 rounded-xl p-3">
                          <h4 className="flex items-center gap-1.5 text-xs font-medium text-purple-600 mb-1.5">
                            <Target className="w-3.5 h-3.5" /> Цели на следующую
                          </h4>
                          <p className="text-sm text-purple-800">{session.nextSessionGoals}</p>
                        </div>
                      )}
                      <div className="bg-gray-100 rounded-xl p-3">
                        <h4 className="flex items-center gap-1.5 text-xs font-medium text-gray-600 mb-1.5">
                          <MessageSquare className="w-3.5 h-3.5" /> Детали
                        </h4>
                        <div className="space-y-1 text-xs text-gray-600">
                          <p>{format(parseISO(session.date),'d MMMM yyyy, EEEE',{locale:ru})}</p>
                          <p>{session.time} · {session.duration||60} мин</p>
                          <p className={session.isPaid ? 'text-green-600' : 'text-red-600'}>
                            {session.isPaid ? `Оплачено: ${session.amount?.toLocaleString()} ${currency}` : 'Не оплачено'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-3">
                      <Link
                        to={`/clients/${client.id}/sessions/${session.id}`}
                        className="text-xs px-3 py-1.5 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
                      >
                        Подробнее
                      </Link>
                      <Link
                        to={`/clients/${client.id}/sessions/${session.id}/edit`}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Edit className="w-3.5 h-3.5" /> Редактировать
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── AI Chat Panel ────────────────────────────────────────────────────────────
interface AiPanelProps {
  client: Client;
  sessions: Session[];
  onClose: () => void;
  isMobile: boolean;
}

function AiPanel({ client, sessions, onClose, isMobile }: AiPanelProps) {
  const [messages, setMessages] = useState<AiMsg[]>([{
    id:'0', role:'assistant',
    content:`Привет! Загрузил историю работы с **${client.name}** (${sessions.filter(s=>s.status==='completed').length} сессий). Что хотите проанализировать?`,
    ts: new Date(),
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    const userMsg: AiMsg = { id: Date.now().toString(), role:'user', content: msg, ts: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const ctx = buildClientContext(client, sessions);
      const history: ChatMessage[] = [
        { role:'system', content:`${SYSTEM_PROMPT_ANALYST}\n\nКОНТЕКСТ:\n${ctx}` },
        ...messages.filter(m=>m.id!=='0').map(m=>({ role:m.role as 'user'|'assistant', content:m.content })),
        { role:'user', content: msg },
      ];
      const reply = await sendToMistral(history);
      setMessages(prev => [...prev, { id:(Date.now()+1).toString(), role:'assistant', content:reply, ts:new Date() }]);
    } catch {
      setMessages(prev => [...prev, { id:(Date.now()+1).toString(), role:'assistant', content:'⚠️ Ошибка соединения. Попробуйте снова.', ts:new Date() }]);
    } finally { setLoading(false); }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const wrapClass = isMobile
    ? 'fixed inset-0 z-50 flex flex-col bg-white'
    : 'flex flex-col bg-white rounded-2xl shadow-lg border border-gray-100 h-full';

  return (
    <div className={wrapClass}>
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-700 p-4 flex items-center gap-3 flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white text-sm">AI-аналитик</h3>
          <p className="text-violet-200 text-xs truncate">{client.name}</p>
        </div>
        <span className="flex items-center gap-1 text-white/70 text-xs">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" /> онлайн
        </span>
        <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg text-white ml-1">
          <ChevronDown className="w-5 h-5" />
        </button>
      </div>

      {/* Quick prompts */}
      <div className="px-3 py-2 border-b border-gray-100 bg-violet-50 flex-shrink-0">
        <div className="grid grid-cols-2 gap-1.5">
          {QUICK_PROMPTS.map((qp, i) => (
            <button key={i} onClick={() => send(qp.text)} disabled={loading}
              className="flex items-center gap-1.5 text-xs px-2.5 py-2 bg-white text-violet-700 rounded-lg hover:bg-violet-100 border border-violet-200 text-left disabled:opacity-50 transition-colors">
              <qp.icon className="w-3.5 h-3.5 flex-shrink-0" /> {qp.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-2 ${msg.role==='user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white ${msg.role==='user' ? 'bg-indigo-500' : 'bg-gradient-to-br from-violet-500 to-indigo-600'}`}>
              {msg.role==='user' ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
              msg.role==='user' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white text-gray-800 shadow-sm rounded-tl-sm border border-gray-100'
            }`}>
              <div className="whitespace-pre-wrap">{msg.content}</div>
              <div className={`text-xs mt-1 ${msg.role==='user' ? 'text-indigo-200' : 'text-gray-400'}`}>
                {msg.ts.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}
              </div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2 shadow-sm border border-gray-100 flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-violet-500 animate-spin" />
              <span className="text-gray-400 text-sm">Анализирую...</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="p-3 bg-white border-t border-gray-100 flex-shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Задайте вопрос об этом клиенте..."
            rows={1}
            className="flex-1 resize-none px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            style={{ minHeight:'40px', maxHeight:'80px' }}
            onInput={e => {
              const t = e.target as HTMLTextAreaElement;
              t.style.height = 'auto';
              t.style.height = Math.min(t.scrollHeight, 80) + 'px';
            }}
          />
          <button onClick={() => send()} disabled={!input.trim() || loading}
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center disabled:opacity-40 hover:shadow-lg transition-all flex-shrink-0">
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-1 text-center">Enter — отправить · Shift+Enter — новая строка</p>
      </div>
    </div>
  );
}

// ── Main Journal Page ────────────────────────────────────────────────────────
export default function Journal() {
  const { clients, sessions, user } = useApp();
  const [search, setSearch] = useState('');
  const [aiClientId, setAiClientId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  // Clients that have non-scheduled sessions
  const clientsWithHistory = useMemo(() => {
    return clients
      .filter(c => sessions.some(s => s.clientId === c.id && s.status !== 'scheduled'))
      .sort((a, b) => {
        const lastA = sessions.filter(s=>s.clientId===a.id&&s.status!=='scheduled').sort((x,y)=>new Date(y.date).getTime()-new Date(x.date).getTime())[0];
        const lastB = sessions.filter(s=>s.clientId===b.id&&s.status!=='scheduled').sort((x,y)=>new Date(y.date).getTime()-new Date(x.date).getTime())[0];
        if (!lastA) return 1;
        if (!lastB) return -1;
        return new Date(lastB.date).getTime() - new Date(lastA.date).getTime();
      });
  }, [clients, sessions]);

  const aiClient = aiClientId ? clients.find(c => c.id === aiClientId) : null;
  const aiSessions = aiClientId ? sessions.filter(s => s.clientId === aiClientId) : [];

  const totalCompleted = sessions.filter(s=>s.status==='completed').length;
  const totalHours = Math.round(sessions.filter(s=>s.status==='completed').reduce((sum,s)=>sum+(s.duration||60)/60,0)*10)/10;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto animate-fadeIn">

        {/* ── Header ── */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white rounded-2xl p-4 sm:p-6 mb-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-white/20 rounded-xl flex-shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold">Журнал сессий</h1>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white/15 rounded-xl p-3 text-center">
              <div className="text-xl font-bold">{totalCompleted}</div>
              <div className="text-xs text-indigo-200">Всего сессий</div>
            </div>
            <div className="bg-white/15 rounded-xl p-3 text-center">
              <div className="text-xl font-bold">{totalHours}ч</div>
              <div className="text-xs text-indigo-200">Часов работы</div>
            </div>
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
            <input
              type="text"
              placeholder="Поиск по заметкам, темам..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white/15 backdrop-blur border border-white/20 rounded-xl text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/40 text-sm"
            />
          </div>
        </div>

        {/* ── Main layout ── */}
        <div className={`${aiClient && !isMobile ? 'grid grid-cols-2 gap-5' : ''}`}>

          {/* ── Left: grouped clients ── */}
          <div className="space-y-4">
            {clientsWithHistory.length === 0 ? (
              <div className="card text-center py-12">
                <BookOpen className="w-14 h-14 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Нет записей</h3>
                <p className="text-gray-500 text-sm mb-4">Заметки появятся после проведённых сессий</p>
                <Link to="/calendar" className="btn-primary inline-flex items-center gap-2 text-sm">
                  <Plus className="w-4 h-4" /> Добавить сессию
                </Link>
              </div>
            ) : (
              clientsWithHistory.map(client => (
                <div key={client.id}>
                  <ClientGroup
                    client={client}
                    sessions={sessions.filter(s=>s.clientId===client.id)}
                    currency={user?.currency}
                    searchTerm={search}
                  />
                  {/* AI button per client */}
                  <button
                    onClick={() => setAiClientId(aiClientId === client.id ? null : client.id)}
                    className={`mt-2 w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium transition-all border ${
                      aiClientId === client.id
                        ? 'bg-violet-600 text-white border-violet-600'
                        : 'text-violet-600 border-violet-200 hover:bg-violet-50'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {aiClientId === client.id ? 'Скрыть AI-анализ' : `AI-анализ: ${client.name}`}
                  </button>

                  {/* Mobile: inline AI panel */}
                  {isMobile && aiClientId === client.id && aiClient && (
                    <AiPanel
                      client={aiClient}
                      sessions={aiSessions}
                      onClose={() => setAiClientId(null)}
                      isMobile={true}
                    />
                  )}
                </div>
              ))
            )}
          </div>

          {/* ── Right: AI panel (desktop) ── */}
          {!isMobile && aiClient && (
            <div className="hidden lg:flex flex-col sticky top-8" style={{ height: 'calc(100vh - 120px)' }}>
              <AiPanel
                client={aiClient}
                sessions={aiSessions}
                onClose={() => setAiClientId(null)}
                isMobile={false}
              />
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
