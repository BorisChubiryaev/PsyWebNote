import { TR } from '../utils/tr';
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Brain, ArrowRight, ArrowLeft, Camera, Check, Sparkles,
  Clock, Calendar, DollarSign, User, Briefcase, Package
} from 'lucide-react';
import { useApp } from '../context/AppContext';

const THERAPY_TYPES = [
  { id: 'cbt', name: TR("Когнитивно-поведенческая терапия (КПТ)", "Cognitive Behavioral Therapy (CBT)"), emoji: '🧠' },
  { id: 'gestalt', name: TR("Гештальт-терапия", "Gestalt therapy"), emoji: '🌀' },
  { id: 'psychoanalysis', name: TR("Психоанализ", "Psychoanalysis"), emoji: '💭' },
  { id: 'existential', name: TR("Экзистенциальная терапия", "Existential therapy"), emoji: '🌟' },
  { id: 'humanistic', name: TR("Гуманистическая терапия", "Humanistic therapy"), emoji: '❤️' },
  { id: 'systemic', name: TR("Системная семейная терапия", "Systemic family therapy"), emoji: '👨‍👩‍👧‍👦' },
  { id: 'art', name: TR("Арт-терапия", "Art therapy"), emoji: '🎨' },
  { id: 'body', name: TR("Телесно-ориентированная терапия", "Body-oriented therapy"), emoji: '🧘' },
  { id: 'schema', name: TR("Схема-терапия", "Schema therapy"), emoji: '📐' },
  { id: 'integrative', name: TR("Интегративный подход", "Integrative approach"), emoji: '🔗' },
  { id: 'dbt', name: TR("Диалектическая поведенческая терапия (ДПТ)", "Dialectical Behavior Therapy (DBT)"), emoji: '⚖️' },
  { id: 'other', name: TR("Другое", "Other"), emoji: '📋' },
];

const DAYS = [
  { id: 1, short: TR("Пн", "Mon"), name: TR("Понедельник", "Monday") },
  { id: 2, short: TR("Вт", "W"), name: TR("Вторник", "Tuesday") },
  { id: 3, short: TR("Ср", "Wed"), name: TR("Среда", "Wednesday") },
  { id: 4, short: TR("Чт", "Thu"), name: TR("Четверг", "Thursday") },
  { id: 5, short: TR("Пт", "Fri"), name: TR("Пятница", "Friday") },
  { id: 6, short: TR("Сб", "Sat"), name: TR("Суббота", "Saturday") },
  { id: 0, short: TR("Вс", "Sun"), name: TR("Воскресенье", "Sunday") },
];

const CURRENCIES = ['₽', '$', '€', '£', '₴', '₸'];

export default function Onboarding() {
  const { user, updateUser } = useApp();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0);
  const [name, setName] = useState(user?.name || '');
  const [therapyType, setTherapyType] = useState(user?.therapyType || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [hourlyRate, setHourlyRate] = useState(user?.hourlyRate || 5000);
  const [currency, setCurrency] = useState(user?.currency || '₽');
  const [workingDays, setWorkingDays] = useState<number[]>(user?.workingDays || [1, 2, 3, 4, 5]);
  const [workStart, setWorkStart] = useState(user?.workingHours?.start || '09:00');
  const [workEnd, setWorkEnd] = useState(user?.workingHours?.end || '18:00');
  const [packages, setPackages] = useState(user?.packages || [
    { id: '1', name: TR("Базовый", "Base"), sessions: 4, price: 20000, discount: 10 },
    { id: '2', name: TR("Стандарт", "Standard"), sessions: 8, price: 36000, discount: 15 },
    { id: '3', name: TR("Премиум", "Premium"), sessions: 12, price: 48000, discount: 20 },
  ]);

  const totalSteps = 5;

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert(TR("Файл слишком большой. Максимум 2 МБ.", "The file is too large. Maximum 2 MB."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAvatar(reader.result as string);
    reader.readAsDataURL(file);
  };

  const toggleDay = (dayId: number) => {
    setWorkingDays(prev =>
      prev.includes(dayId)
        ? prev.filter(d => d !== dayId)
        : [...prev, dayId].sort()
    );
  };

  const updatePackage = (index: number, field: string, value: string | number) => {
    setPackages(prev => prev.map((p, i) => i === index ? { ...p, [field]: value } : p));
  };

  const handleComplete = () => {
    updateUser({
      name, therapyType, avatar, bio, phone,
      hourlyRate, currency, workingDays,
      workingHours: { start: workStart, end: workEnd },
      packages,
      onboardingComplete: true,
    });
    navigate('/dashboard');
  };

  const canProceed = () => {
    switch (step) {
      case 0: return name.trim().length >= 2;
      case 1: return !!therapyType;
      case 2: return hourlyRate > 0;
      case 3: return true;
      case 4: return workingDays.length > 0;
      default: return true;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center">
              <div className="w-20 h-20 rounded-2xl gradient-bg flex items-center justify-center mx-auto mb-6">
                <Brain className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                {TR("\n                Добро пожаловать в PsyWebNote! 👋\n              ", "Welcome to PsyWebNote! 👋")}</h2>
              <p className="text-gray-500 text-lg">
                {TR("\n                Давайте настроим ваш рабочий кабинет за пару минут\n              ", "Let's set up your office in a couple of minutes")}</p>
            </div>

            <div className="max-w-sm mx-auto space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  {TR("\n                  Как к вам обращаться?\n                ", "How should I contact you?")}</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="input-field text-center text-lg"
                  placeholder={TR("Анна Иванова", "Anna Ivanova")}
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-center gap-4 pt-4">
                <div
                  className="relative cursor-pointer group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className={`w-24 h-24 rounded-full flex items-center justify-center border-2 border-dashed transition-all ${avatar ? 'border-transparent' : 'border-gray-300 group-hover:border-indigo-400'}`}>
                    {avatar ? (
                      <img src={avatar} alt="Avatar" className="w-24 h-24 rounded-full object-cover" />
                    ) : (
                      <Camera className="w-8 h-8 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center shadow-lg">
                    <Camera className="w-4 h-4 text-white" />
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-700">{TR("Фото профиля", "Profile photo")}</p>
                  <p className="text-xs text-gray-400">{TR("До 2 МБ, необязательно", "Up to 2 MB, optional")}</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center mx-auto mb-4">
                <Briefcase className="w-8 h-8 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{TR("Ваше направление", "Your direction")}</h2>
              <p className="text-gray-500">{TR("Выберите основной метод работы", "Select your main method of operation")}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto max-h-[50vh] overflow-y-auto pr-1">
              {THERAPY_TYPES.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTherapyType(t.name)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    therapyType === t.name
                      ? 'border-indigo-500 bg-indigo-50 shadow-md'
                      : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-xl mr-2">{t.emoji}</span>
                  <span className="text-sm font-medium text-gray-800">{t.name}</span>
                </button>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{TR("Стоимость услуг", "Cost of services")}</h2>
              <p className="text-gray-500">{TR("Укажите стоимость часа и пакеты", "Specify the cost per hour and packages")}</p>
            </div>

            <div className="max-w-lg mx-auto space-y-6">
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">{TR("Стоимость сессии (60 мин)", "Session cost (60 min)")}</label>
                  <input
                    type="number"
                    value={hourlyRate}
                    onChange={e => setHourlyRate(Number(e.target.value))}
                    className="input-field text-lg font-semibold"
                    min={0}
                  />
                </div>
                <div className="w-24">
                  <label className="block text-sm font-medium text-gray-700 mb-2">{TR("Валюта", "Currency")}</label>
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    className="input-field text-center text-lg"
                  >
                    {CURRENCIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Package className="w-5 h-5 text-indigo-500" />
                  <h3 className="font-semibold text-gray-800">{TR("Пакеты (необязательно)", "Packages (optional)")}</h3>
                </div>
                <div className="space-y-3">
                  {packages.map((pkg, i) => (
                    <div key={pkg.id} className="p-4 bg-gray-50 rounded-xl space-y-3">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={pkg.name}
                          onChange={e => updatePackage(i, 'name', e.target.value)}
                          className="input-field flex-1 text-sm"
                          placeholder={TR("Название", "Name")}
                        />
                        <button
                          onClick={() => setPackages(prev => prev.filter((_, j) => j !== i))}
                          className="text-red-400 hover:text-red-600 px-2"
                        >✕</button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-xs text-gray-500">{TR("Сессий", "Sessions")}</label>
                          <input
                            type="number"
                            value={pkg.sessions}
                            onChange={e => updatePackage(i, 'sessions', Number(e.target.value))}
                            className="input-field text-sm"
                            min={1}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">{TR("Цена (", "Price (")}{currency})</label>
                          <input
                            type="number"
                            value={pkg.price}
                            onChange={e => updatePackage(i, 'price', Number(e.target.value))}
                            className="input-field text-sm"
                            min={0}
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">{TR("Скидка %", "Discount %")}</label>
                          <input
                            type="number"
                            value={pkg.discount}
                            onChange={e => updatePackage(i, 'discount', Number(e.target.value))}
                            className="input-field text-sm"
                            min={0} max={100}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => setPackages(prev => [...prev, {
                      id: crypto.randomUUID(), name: '', sessions: 4, price: 0, discount: 0
                    }])}
                    className="w-full p-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-indigo-400 hover:text-indigo-500 transition-colors text-sm"
                  >
                    {TR("\n                    + Добавить пакет\n                  ", "+ Add package")}</button>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-amber-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{TR("О вас", "About you")}</h2>
              <p className="text-gray-500">{TR("Расскажите немного о себе (необязательно)", "Tell us a little about yourself (optional)")}</p>
            </div>

            <div className="max-w-lg mx-auto space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{TR("О себе / описание", "About me / description")}</label>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  className="input-field min-h-[120px] resize-none"
                  placeholder={TR("Практикующий психолог с опытом работы более 5 лет. Специализация — работа с тревожными расстройствами, депрессией, самооценкой...", "Practicing psychologist with more than 5 years of experience. Specialization - working with anxiety disorders, depression, self-esteem...")}
                  rows={4}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">{TR("Телефон", "Telephone")}</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="input-field"
                  placeholder="+7 (999) 123-45-67"
                />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6 animate-fadeIn">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{TR("Рабочее расписание", "Work schedule")}</h2>
              <p className="text-gray-500">{TR("Когда вы принимаете клиентов?", "When do you accept clients?")}</p>
            </div>

            <div className="max-w-lg mx-auto space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">{TR("Рабочие дни", "Working days")}</label>
                <div className="flex flex-wrap gap-2 justify-center">
                  {DAYS.map(day => (
                    <button
                      key={day.id}
                      onClick={() => toggleDay(day.id)}
                      className={`w-14 h-14 rounded-xl font-semibold transition-all ${
                        workingDays.includes(day.id)
                          ? 'gradient-bg text-white shadow-lg scale-105'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {day.short}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4 items-center justify-center">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="w-4 h-4 inline mr-1" />{TR("Начало\n                  ", "Start")}</label>
                  <input
                    type="time"
                    value={workStart}
                    onChange={e => setWorkStart(e.target.value)}
                    className="input-field text-center text-lg"
                  />
                </div>
                <span className="text-gray-400 mt-6 text-xl">→</span>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="w-4 h-4 inline mr-1" />{TR("Конец\n                  ", "End")}</label>
                  <input
                    type="time"
                    value={workEnd}
                    onChange={e => setWorkEnd(e.target.value)}
                    className="input-field text-center text-lg"
                  />
                </div>
              </div>

              <div className="bg-indigo-50 rounded-xl p-4 text-center">
                <p className="text-sm text-indigo-700">
                  <Sparkles className="w-4 h-4 inline mr-1" />
                  {TR("\n                  Вы сможете изменить все настройки позже в профиле\n                ", "You can change all settings later in your profile")}</p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex flex-col">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gray-200">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
          style={{ width: `${((step + 1) / (totalSteps)) * 100}%` }}
        />
      </div>

      {/* Step indicators */}
      <div className="flex justify-center pt-8 pb-4 px-4">
        <div className="flex items-center gap-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                i < step ? 'bg-green-500 text-white' :
                i === step ? 'gradient-bg text-white shadow-lg scale-110' :
                'bg-gray-200 text-gray-500'
              }`}>
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              {i < totalSteps - 1 && (
                <div className={`w-8 h-0.5 ${i < step ? 'bg-green-400' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-2xl">
          {renderStep()}
        </div>
      </div>

      {/* Navigation */}
      <div className="sticky bottom-0 bg-white/80 backdrop-blur-lg border-t border-gray-200 p-4 sm:p-6">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={() => step > 0 ? setStep(step - 1) : navigate('/dashboard')}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors px-4 py-2"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">{step > 0 ? TR("Назад", "Back") : TR("Пропустить", "Skip")}</span>
          </button>

          <span className="text-sm text-gray-400">{step + 1} {TR(" из ", "from")}{totalSteps}</span>

          {step < totalSteps - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {TR("\n              Далее\n              ", "Next")}<ArrowRight className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={!canProceed()}
              className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-5 h-5" />
              {TR("\n              Начать работу!\n            ", "Get started!")}</button>
          )}
        </div>
      </div>
    </div>
  );
}
