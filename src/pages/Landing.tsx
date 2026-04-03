import { TR } from '../utils/tr';
import { useNavigate } from 'react-router-dom';
import {
  Brain, Calendar, Users, FileText, BarChart2, Shield,
  Star, ArrowRight, CheckCircle, Smartphone, Clock,
  MessageSquare, Zap, Lock, Globe, ChevronDown
} from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

const features = [
  {
    icon: Users,
    title: TR("Управление клиентами", "Client management"),
    desc: TR("Полная база клиентов с историей, контактами, ссылками на соцсети и пакетами сессий.", "A complete client database with history, contacts, links to social networks and session packages."),
    color: 'from-blue-500 to-indigo-600',
    bg: 'bg-blue-50',
  },
  {
    icon: Calendar,
    title: TR("Умный календарь", "Smart calendar"),
    desc: TR("День, неделя, месяц. Автоматическое расписание по дням недели. Проверка пересечений.", "Day, week, month. Automatic schedule by days of the week. Checking intersections."),
    color: 'from-purple-500 to-purple-700',
    bg: 'bg-purple-50',
  },
  {
    icon: FileText,
    title: TR("Журнал сессий", "Session log"),
    desc: TR("Заметки, темы, состояние клиента, домашние задания и цели для каждой встречи.", "Notes, topics, client status, homework and goals for each meeting."),
    color: 'from-emerald-500 to-teal-600',
    bg: 'bg-emerald-50',
  },
  {
    icon: Brain,
    title: TR("AI-ассистент", "AI assistant"),
    desc: TR("Анализ динамики клиента, рекомендации по техникам, выявление рисков с помощью Mistral AI.", "Analysis of client dynamics, recommendations on techniques, identification of risks using Mistral AI."),
    color: 'from-pink-500 to-rose-600',
    bg: 'bg-pink-50',
  },
  {
    icon: BarChart2,
    title: TR("Отчёты и аналитика", "Reports and analytics"),
    desc: TR("Финансовые показатели, загрузка по дням, динамика клиентов и прогноз доходов.", "Financial indicators, daily load, customer dynamics and income forecast."),
    color: 'from-orange-500 to-amber-600',
    bg: 'bg-orange-50',
  },
  {
    icon: Zap,
    title: TR("Уведомления", "Notifications"),
    desc: TR("Напоминания о предстоящих сессиях и уведомления о необходимости обновить статус встречи.", "Reminders for upcoming sessions and notifications to update meeting status."),
    color: 'from-yellow-500 to-orange-500',
    bg: 'bg-yellow-50',
  },
];

const benefits = [
  TR("Ведите записи сессий прямо во время встречи", "Record sessions during the meeting"),
  TR("Автоматическое расписание по дням недели", "Automatic schedule by days of the week"),
  TR("Пакеты сессий с автоматическим списанием", "Session packages with automatic debiting"),
  TR("AI-анализ прогресса каждого клиента", "AI analysis of each client's progress"),
  TR("Финансовая аналитика и отчёты", "Financial analytics and reports"),
  TR("Работает на любом устройстве", "Works on any device"),
  TR("Уведомления о пропущенных статусах", "Notifications about missed statuses"),
  TR("Синхронизация данных в облаке", "Data synchronization in the cloud"),
];

const testimonials = [
  {
    name: TR("Анна Петрова", "Anna Petrova"),
    role: TR("Когнитивно-поведенческий терапевт", "Cognitive Behavioral Therapist"),
    text: TR("PsyWebNote полностью изменил мой рабочий процесс. Теперь я трачу меньше времени на администрирование и больше — на клиентов.", "PsyWebNote has completely changed my workflow. Now I spend less time on administration and more time on clients."),
    avatar: TR("АП", "AP"),
    stars: 5,
  },
  {
    name: TR("Михаил Соколов", "Mikhail Sokolov"),
    role: TR("Гештальт-терапевт", "Gestalt therapist"),
    text: TR("AI-ассистент помогает замечать паттерны в работе с клиентами, которые я мог пропустить. Незаменимый инструмент.", "The AI ​​assistant helps me notice patterns in my work with clients that I might have missed. An indispensable tool."),
    avatar: TR("МС", "MS"),
    stars: 5,
  },
  {
    name: TR("Елена Новикова", "Elena Novikova"),
    role: TR("Психоаналитик", "Psychoanalyst"),
    text: TR("Наконец-то удобное приложение на русском языке специально для психологов. Журнал сессий просто отличный.", "Finally, a convenient application in Russian specifically for psychologists. The session log is great."),
    avatar: TR("ЕН", "EH"),
    stars: 5,
  },
];

const faqs = [
  {
    q: TR("Безопасны ли мои данные?", "Is my data safe?"),
    a: TR("Да. Все данные хранятся в защищённой облачной базе Supabase с шифрованием. Row Level Security гарантирует, что данные каждого психолога доступны только ему.", "Yes. All data is stored in a secure cloud database Supabase with encryption. Row Level Security ensures that each psychologist's data is accessible only to that psychologist."),
  },
  {
    q: TR("Есть ли мобильное приложение?", "Is there a mobile application?"),
    a: TR("PsyWebNote — прогрессивное веб-приложение (PWA). Оно отлично работает в браузере на любом устройстве и может быть добавлено на экран телефона как приложение.", "PsyWebNote is a progressive web application (PWA). It works perfectly in the browser on any device and can be added to your phone screen as an application."),
  },
  {
    q: TR("Как работает AI-ассистент?", "How does the AI ​​assistant work?"),
    a: TR("AI-ассистент работает на базе Mistral AI. Он анализирует историю сессий клиента и помогает выявить динамику, риски и предложить техники работы.", "The AI ​​assistant is powered by Mistral AI. It analyzes the client’s session history and helps identify dynamics, risks and suggest work techniques."),
  },
  {
    q: TR("Можно ли использовать без интернета?", "Can it be used without the Internet?"),
    a: TR("Базовый функционал работает и без интернета — данные кешируются. Синхронизация происходит при восстановлении соединения.", "The basic functionality works without the Internet - the data is cached. Synchronization occurs when the connection is restored."),
  },
  {
    q: TR("Сколько стоит?", "What is the price?"),
    a: TR("Сейчас PsyWebNote в открытом бета-доступе и полностью бесплатен. В будущем появятся платные тарифы с расширенными возможностями.", "PsyWebNote is currently in open beta and completely free. In the future, paid plans with advanced features will appear."),
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const { language, setLanguage } = useLanguage();

  const toggleLanguage = () => {
    const nextLanguage = language === 'ru' ? 'en' : 'ru';
    setLanguage(nextLanguage);
    // Landing has static translated arrays, so we reload once to update all content.
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 overflow-x-hidden">

      {/* ── Navigation ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-gray-100 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl flex items-center justify-center shadow-md shadow-indigo-500/25">
              <span className="text-white font-black text-lg">Ψ</span>
            </div>
            <span className="font-black text-xl bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              PsyWebNote
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors">{TR("Возможности", "Possibilities")}</a>
            <a href="#benefits" className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors">{TR("Преимущества", "Advantages")}</a>
            <a href="#testimonials" className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors">{TR("Отзывы", "Reviews")}</a>
            <a href="#faq" className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors">FAQ</a>
            <a href="#contacts" className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors">{TR("Контакты", "Contacts")}</a>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleLanguage}
              className="text-sm font-semibold text-gray-700 dark:text-gray-200 hover:text-indigo-600 transition-colors px-3 py-2 border border-gray-200 dark:border-slate-600 rounded-lg"
            >
              {language === 'ru' ? 'EN' : 'RU'}
            </button>
            <button
              onClick={() => navigate('/login')}
              className="text-sm font-semibold text-gray-700 dark:text-gray-200 hover:text-indigo-600 transition-colors px-3 py-2"
            >
              {TR("\n              Войти\n            ", "Login")}</button>
            <button
              onClick={() => navigate('/register')}
              className="text-sm font-bold px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:shadow-indigo-500/30 transition-all ring-1 ring-indigo-300/40"
            >
              {TR("\n              Начать бесплатно\n            ", "Start for free")}</button>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-indigo-100/60 via-purple-50/40 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-20 right-0 w-72 h-72 bg-pink-100/40 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-72 h-72 bg-blue-100/40 rounded-full blur-3xl" />
          {/* Grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#f0f0f0_1px,transparent_1px),linear-gradient(to_bottom,#f0f0f0_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30" />
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-full text-indigo-700 text-sm font-semibold mb-8">
            <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
            {TR("\n            Бесплатный бета-доступ\n          ", "Free beta access")}</div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-gray-900 dark:text-white mb-6 leading-tight">
            {TR("\n            Рабочее пространство\n            ", "Workspace")}<br />
            <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              {TR("\n              современного психолога\n            ", "modern psychologist")}</span>
          </h1>

          <p className="text-xl text-gray-500 dark:text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            {TR("\n            Управляйте клиентами, ведите журнал сессий, отслеживайте финансы\n            и получайте AI-аналитику — всё в одном месте.\n          ", "Manage clients, keep session logs, track finances\n            and get AI analytics - all in one place.")}</p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <button
              onClick={() => navigate('/register')}
              className="group flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-2xl hover:shadow-xl hover:shadow-indigo-500/30 transition-all text-lg"
            >
              {TR("\n              Начать бесплатно\n              ", "Start for free")}<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 px-8 py-4 bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-600 text-gray-700 dark:text-gray-100 font-bold rounded-2xl hover:border-indigo-300 hover:text-indigo-600 transition-all text-lg"
            >
              {TR("\n              Войти в аккаунт\n            ", "Login to account")}</button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 max-w-xl mx-auto">
            {[
              { value: '100%', label: TR("Безопасно", "Safely") },
              { value: 'AI', label: TR("Аналитика", "Analytics") },
              { value: '∞', label: TR("Клиентов", "Clients") },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* App Preview */}
        <div className="max-w-5xl mx-auto mt-16 relative z-10">
          <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-indigo-500/10 border border-gray-200 bg-gradient-to-br from-indigo-50 to-purple-50">
            {/* Mock browser bar */}
            <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
              <div className="flex-1 mx-4 bg-gray-100 rounded-lg px-3 py-1 text-xs text-gray-400 text-center">
                psywebnote.app/dashboard
              </div>
            </div>
            {/* Mock dashboard */}
            <div className="p-6 min-h-64">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                {[
                  { label: TR("Клиентов", "Clients"), value: '12', color: 'bg-indigo-500' },
                  { label: TR("Заработано", "Earned"), value: '84 000 ₽', color: 'bg-purple-500' },
                  { label: TR("Часов", "Hours"), value: '18', color: 'bg-pink-500' },
                  { label: TR("Сессий", "Sessions"), value: '21', color: 'bg-emerald-500' },
                ].map((card) => (
                  <div key={card.label} className="bg-white rounded-2xl p-4 shadow-sm">
                    <div className={`w-8 h-8 ${card.color} rounded-xl mb-2 opacity-90`} />
                    <div className="text-lg font-black text-gray-800">{card.value}</div>
                    <div className="text-xs text-gray-500">{card.label}</div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="text-sm font-semibold text-gray-700 mb-3">{TR("Сегодня", "Today")}</div>
                  {[
                    { time: '10:00', name: TR("Анна М.", "Anna M."), type: TR("онлайн", "online"), color: 'bg-blue-100 text-blue-700' },
                    { time: '12:00', name: TR("Сергей К.", "Sergey K."), type: TR("очно", "in person"), color: 'bg-green-100 text-green-700' },
                    { time: '15:00', name: TR("Мария Л.", "Maria L."), type: TR("онлайн", "online"), color: 'bg-purple-100 text-purple-700' },
                  ].map((s) => (
                    <div key={s.name} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                      <span className="text-xs font-mono text-gray-500 w-10">{s.time}</span>
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                        {s.name[0]}
                      </div>
                      <span className="text-sm font-medium text-gray-700 flex-1">{s.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}>{s.type}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="text-sm font-semibold text-gray-700 mb-3">{TR("AI-аналитика", "AI analytics")}</div>
                  <div className="space-y-2">
                    {[
                      { label: TR("Тревожность снижается", "Anxiety decreases"), pct: 75, color: 'bg-green-400' },
                      { label: TR("Работа с самооценкой", "Working with self-esteem"), pct: 55, color: 'bg-indigo-400' },
                      { label: TR("Прогресс целей", "Progress goals"), pct: 40, color: 'bg-purple-400' },
                    ].map((item) => (
                      <div key={item.label}>
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>{item.label}</span>
                          <span>{item.pct}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 border border-purple-200 rounded-full text-purple-700 text-sm font-semibold mb-4">
              <Zap className="w-4 h-4" />
              {TR("\n              Возможности\n            ", "Possibilities")}</div>
            <h2 className="text-4xl lg:text-5xl font-black text-gray-900 mb-4">
              {TR("\n              Всё что нужно психологу\n            ", "Everything a psychologist needs")}</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              {TR("\n              Инструменты, разработанные специально для практикующих психологов и психотерапевтов\n            ", "Tools designed specifically for practicing psychologists and psychotherapists")}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-white rounded-3xl p-6 border border-gray-100 hover:shadow-xl hover:shadow-gray-200/60 transition-all group"
              >
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                  <f.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Benefits ── */}
      <section id="benefits" className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-700 text-sm font-semibold mb-6">
                <CheckCircle className="w-4 h-4" />
                {TR("\n                Преимущества\n              ", "Advantages")}</div>
              <h2 className="text-4xl font-black text-gray-900 mb-6">
                {TR("\n                Экономьте время на", "Save time on")}{' '}
                <span className="bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">
                  {TR("\n                  администрировании\n                ", "administration")}</span>
              </h2>
              <p className="text-gray-500 mb-8 text-lg leading-relaxed">
                {TR("\n                Меньше бумажной работы — больше времени для клиентов. PsyWebNote автоматизирует рутинные задачи.\n              ", "Less paperwork means more time for clients. PsyWebNote automates routine tasks.")}</p>
              <div className="space-y-3">
                {benefits.map((b) => (
                  <div key={b} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <span className="text-gray-700">{b}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => navigate('/register')}
                className="mt-10 group flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-2xl hover:shadow-xl hover:shadow-indigo-500/30 transition-all"
              >
                {TR("\n                Попробовать бесплатно\n                ", "Try for free")}<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Devices mockup */}
            <div className="relative flex justify-center">
              <div className="relative">
                {/* Desktop */}
                <div className="w-80 h-56 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl shadow-2xl shadow-indigo-500/30 flex flex-col overflow-hidden">
                  <div className="bg-white/10 px-4 py-2 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-white/60" />
                    <div className="w-2 h-2 rounded-full bg-white/60" />
                    <div className="w-2 h-2 rounded-full bg-white/60" />
                  </div>
                  <div className="flex-1 p-4 flex flex-col justify-center items-center">
                    <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-3">
                      <span className="text-white font-black text-2xl">Ψ</span>
                    </div>
                    <span className="text-white font-black text-xl">PsyWebNote</span>
                    <div className="mt-4 grid grid-cols-2 gap-2 w-full">
                      {[TR("Клиенты", "Clients"), TR("Сессии", "Sessions"), TR("Календарь", "Calendar"), TR("Отчёты", "Reports")].map(item => (
                        <div key={item} className="bg-white/10 rounded-lg px-2 py-1.5 text-white/80 text-xs text-center">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Mobile */}
                <div className="absolute -bottom-8 -right-8 w-24 h-40 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                  <div className="h-3 bg-gray-100 flex items-center justify-center">
                    <div className="w-8 h-1 bg-gray-300 rounded-full" />
                  </div>
                  <div className="p-2">
                    <div className="w-full h-16 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg mb-2" />
                    <div className="space-y-1.5">
                      <div className="w-full h-2 bg-gray-100 rounded" />
                      <div className="w-3/4 h-2 bg-gray-100 rounded" />
                      <div className="w-full h-2 bg-gray-100 rounded" />
                    </div>
                  </div>
                </div>

                {/* Icons floating */}
                <div className="absolute -top-4 -right-4 w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="absolute -bottom-4 left-1/4 w-10 h-10 bg-white rounded-xl shadow-lg flex items-center justify-center">
                  <Globe className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-24 px-4 bg-gradient-to-br from-indigo-600 to-purple-700 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-white mb-4">{TR("Как это работает", "How does this work")}</h2>
            <p className="text-indigo-200 text-lg">{TR("Начните за 5 минут", "Get started in 5 minutes")}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: TR("Зарегистрируйтесь", "Register"),
                desc: TR("Создайте аккаунт через email или Google. Заполните профиль — тип терапии, стоимость, расписание.", "Create an account via email or Google. Fill out your profile - type of therapy, cost, schedule."),
                icon: Users,
              },
              {
                step: '2',
                title: TR("Добавьте клиентов", "Add clients"),
                desc: TR("Внесите данные клиентов, установите расписание встреч. Система автоматически создаст календарь.", "Enter client data and set a meeting schedule. The system will automatically create a calendar."),
                icon: Calendar,
              },
              {
                step: '3',
                title: TR("Ведите записи", "Keep records"),
                desc: TR("После каждой сессии фиксируйте заметки, отслеживайте прогресс и получайте AI-аналитику.", "After each session, capture notes, track progress, and receive AI analytics."),
                icon: Brain,
              },
            ].map((step, i) => (
              <div key={i} className="text-center">
                <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20">
                  <step.icon className="w-7 h-7 text-white" />
                </div>
                <div className="text-5xl font-black text-white/10 mb-2">{step.step}</div>
                <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                <p className="text-indigo-200 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <button
              onClick={() => navigate('/register')}
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-indigo-600 font-bold rounded-2xl hover:shadow-xl transition-all text-lg"
            >
              {TR("\n              Начать бесплатно\n              ", "Start for free")}<ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section id="testimonials" className="py-24 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-full text-yellow-700 text-sm font-semibold mb-4">
              <Star className="w-4 h-4" />
              {TR("\n              Отзывы\n            ", "Reviews")}</div>
            <h2 className="text-4xl font-black text-gray-900 mb-4">
              {TR("\n              Что говорят психологи\n            ", "What psychologists say")}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm hover:shadow-lg transition-all">
                <div className="flex mb-4">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-600 mb-6 leading-relaxed italic">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="font-bold text-gray-900 text-sm">{t.name}</div>
                    <div className="text-xs text-gray-500">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Security ── */}
      <section className="py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-200 rounded-full text-indigo-700 text-sm font-semibold mb-4">
              <Lock className="w-4 h-4" />
              {TR("\n              Безопасность\n            ", "Safety")}</div>
            <h2 className="text-4xl font-black text-gray-900 mb-4">
              {TR("\n              Данные под надёжной защитой\n            ", "Data under reliable protection")}</h2>
            <p className="text-gray-500 text-lg max-w-2xl mx-auto">
              {TR("\n              Мы понимаем важность конфиденциальности в терапевтических отношениях.\n            ", "We understand the importance of confidentiality in the therapeutic relationship.")}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              {
                icon: Shield,
                title: 'Row Level Security',
                desc: TR("Данные каждого психолога изолированы. Никто кроме вас не имеет доступа к вашим записям.", "The data of each psychologist is isolated. No one except you has access to your records."),
                color: 'text-indigo-600 bg-indigo-50',
              },
              {
                icon: Lock,
                title: TR("Шифрование", "Encryption"),
                desc: TR("Все данные передаются по HTTPS. Пароли хранятся в зашифрованном виде (bcrypt).", "All data is transmitted over HTTPS. Passwords are stored in encrypted form (bcrypt)."),
                color: 'text-emerald-600 bg-emerald-50',
              },
              {
                icon: Clock,
                title: 'JWT + Auto-refresh',
                desc: TR("Токены авторизации автоматически обновляются. Безопасный выход на всех устройствах.", "Authorization tokens are automatically renewed. Secure logout on all devices."),
                color: 'text-purple-600 bg-purple-50',
              },
              {
                icon: MessageSquare,
                title: TR("AI без хранения", "AI without storage"),
                desc: TR("Запросы к AI-ассистенту не сохраняются на серверах Mistral. Ваши заметки только у вас.", "Requests to the AI ​​assistant are not saved on Mistral servers. Your notes are yours alone."),
                color: 'text-pink-600 bg-pink-50',
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-4 p-6 bg-gray-50 rounded-2xl border border-gray-100">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${item.color}`}>
                  <item.icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">{item.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-24 px-4 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-gray-900 mb-4">{TR("Частые вопросы", "Frequently asked questions")}</h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-6 py-5 text-left"
                >
                  <span className="font-semibold text-gray-900">{faq.q}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ml-4 ${openFaq === i ? 'rotate-180' : ''}`}
                  />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5 text-gray-600 text-sm leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-500/25">
            <span className="text-white font-black text-3xl">Ψ</span>
          </div>
          <h2 className="text-4xl lg:text-5xl font-black text-gray-900 mb-6">
            {TR("\n            Начните работать умнее\n            ", "Start working smarter")}<br />
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              {TR("\n              уже сегодня\n            ", "today")}</span>
          </h2>
          <p className="text-gray-500 text-lg mb-10">
            {TR("\n            Присоединяйтесь к психологам, которые уже используют PsyWebNote.\n            Бесплатно. Без кредитной карты.\n          ", "Join psychologists who are already using PsyWebNote.\n            For free. No credit card.")}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/register')}
              className="group flex items-center justify-center gap-2 px-10 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-2xl hover:shadow-xl hover:shadow-indigo-500/30 transition-all text-lg"
            >
              {TR("\n              Зарегистрироваться бесплатно\n              ", "Register for free")}<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="flex items-center justify-center gap-2 px-10 py-4 bg-white border-2 border-gray-200 text-gray-700 font-bold rounded-2xl hover:border-indigo-300 hover:text-indigo-600 transition-all text-lg"
            >
              {TR("\n              Уже есть аккаунт\n            ", "Already have an account")}</button>
          </div>
        </div>
      </section>

      {/* ── Contacts ── */}
      <section id="contacts" className="py-24 px-4 bg-gradient-to-br from-slate-900 to-indigo-950 relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-full text-white/80 text-sm font-semibold mb-6">
            <MessageSquare className="w-4 h-4" />
            {TR("\n            Связаться с разработчиком\n          ", "Contact the developer")}</div>
          <h2 className="text-4xl font-black text-white mb-4">
            {TR("\n            Есть вопросы или идеи?\n          ", "Have questions or ideas?")}</h2>
          <p className="text-indigo-300 text-lg mb-10">
            {TR("\n            Пишите напрямую — отвечу на вопросы о приложении,", "Write directly - I will answer questions about the application,")}<br className="hidden sm:block" />
            {TR("\n            приму предложения по улучшению\n          ", "I will accept suggestions for improvement")}</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Telegram */}
            <a
              href="https://t.me/oldnewborispro"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center gap-3 p-6 bg-white/10 hover:bg-[#2AABEE]/20 border border-white/10 hover:border-[#2AABEE]/40 rounded-2xl transition-all"
            >
              <div className="w-14 h-14 rounded-2xl bg-[#2AABEE] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              </div>
              <div>
                <p className="font-bold text-white">Telegram</p>
                <p className="text-indigo-300 text-sm">@oldnewborispro</p>
              </div>
            </a>

            {/* Instagram */}
            <a
              href="https://instagram.com/oldnewborispro"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center gap-3 p-6 bg-white/10 hover:bg-pink-500/20 border border-white/10 hover:border-pink-500/40 rounded-2xl transition-all"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </div>
              <div>
                <p className="font-bold text-white">Instagram</p>
                <p className="text-indigo-300 text-sm">@oldnewborispro</p>
              </div>
            </a>

            {/* VK */}
            <a
              href="https://vk.com/oldnewborispro"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col items-center gap-3 p-6 bg-white/10 hover:bg-[#0077FF]/20 border border-white/10 hover:border-[#0077FF]/40 rounded-2xl transition-all"
            >
              <div className="w-14 h-14 rounded-2xl bg-[#0077FF] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.391 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.862-.523-2.049-1.713-1.033-1.01-1.49-.967-1.49-.967s-.312-.033-.312.338v1.564c0 .37-.12.583-1.096.583-1.637 0-3.466-.989-4.754-2.838C6.027 11.952 5.3 9.685 5.3 9.685s-.065-.315.338-.315h1.744c.446 0 .613.218.784.674 0 0 .816 2.595 2.076 3.958.24.253.42.402.537.402s.338-.217.338-.457v-2.1c-.033-1.19.097-1.742-.76-1.742h-.432c-.375 0-.567-.315-.567-.624 0-.427.307-.643.783-.643h2.791c.327 0 .598.109.598.598v3.083c0 .218.12.24.218.24.24 0 .477-.294.674-.49.752-.884 1.382-2.355 1.382-2.355.11-.271.327-.523.784-.523h1.744c.43 0 .675.22.555.654-.218.917-2.05 2.74-2.05 2.74-.262.327-.317.457 0 .752.24.24 1.064.97 1.613 1.567.903.997 1.548 1.721 1.722 2.278.185.523-.12.783-.554.783z"/>
                </svg>
              </div>
              <div>
                <p className="font-bold text-white">{TR("ВКонтакте", "VKontakte")}</p>
                <p className="text-indigo-300 text-sm">@oldnewborispro</p>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-100 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl flex items-center justify-center">
                <span className="text-white font-black">Ψ</span>
              </div>
              <span className="font-black text-lg bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                PsyWebNote
              </span>
            </div>

            <div className="flex items-center gap-6 text-sm text-gray-500">
              <button onClick={() => navigate('/login')} className="hover:text-indigo-600 transition-colors">{TR("Войти", "Login")}</button>
              <button onClick={() => navigate('/register')} className="hover:text-indigo-600 transition-colors">{TR("Регистрация", "Registration")}</button>
              <a href="#features" className="hover:text-indigo-600 transition-colors">{TR("Возможности", "Possibilities")}</a>
              <a href="#faq" className="hover:text-indigo-600 transition-colors">FAQ</a>
              <a href="#contacts" className="hover:text-indigo-600 transition-colors">{TR("Контакты", "Contacts")}</a>
            </div>

            <div className="flex items-center gap-4">
              <a href="https://t.me/oldnewborispro" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#2AABEE] transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
              </a>
              <a href="https://instagram.com/oldnewborispro" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-pink-500 transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a href="https://vk.com/oldnewborispro" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#0077FF] transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.391 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.862-.523-2.049-1.713-1.033-1.01-1.49-.967-1.49-.967s-.312-.033-.312.338v1.564c0 .37-.12.583-1.096.583-1.637 0-3.466-.989-4.754-2.838C6.027 11.952 5.3 9.685 5.3 9.685s-.065-.315.338-.315h1.744c.446 0 .613.218.784.674 0 0 .816 2.595 2.076 3.958.24.253.42.402.537.402s.338-.217.338-.457v-2.1c-.033-1.19.097-1.742-.76-1.742h-.432c-.375 0-.567-.315-.567-.624 0-.427.307-.643.783-.643h2.791c.327 0 .598.109.598.598v3.083c0 .218.12.24.218.24.24 0 .477-.294.674-.49.752-.884 1.382-2.355 1.382-2.355.11-.271.327-.523.784-.523h1.744c.43 0 .675.22.555.654-.218.917-2.05 2.74-2.05 2.74-.262.327-.317.457 0 .752.24.24 1.064.97 1.613 1.567.903.997 1.548 1.721 1.722 2.278.185.523-.12.783-.554.783z"/>
                </svg>
              </a>
              <span className="text-gray-300 mx-2">|</span>
              <span className="text-sm text-gray-400">© 2026 PsyWebNote</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
