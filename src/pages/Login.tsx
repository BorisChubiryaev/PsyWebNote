import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Brain, Mail, Lock, Eye, EyeOff, Sparkles, Loader2, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const { login, clearAllData } = useApp();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Заполните все поля');
      return;
    }

    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error || 'Неверный email или пароль');
      }
    } catch {
      setError('Произошла ошибка. Попробуйте снова.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearData = () => {
    clearAllData();
    setShowClearConfirm(false);
    setError('');
    setEmail('');
    setPassword('');
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 gradient-bg relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative z-10 flex flex-col justify-center px-16 text-white">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-lg flex items-center justify-center">
              <Brain className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl font-bold">PsyWebNote</h1>
              <p className="text-white/80">Для профессиональных психологов</p>
            </div>
          </div>
          
          <div className="space-y-6 max-w-md">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Управляйте клиентами</h3>
                <p className="text-white/70 text-sm">Храните всю информацию о клиентах в одном месте</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Ведите журнал сессий</h3>
                <p className="text-white/70 text-sm">Записывайте результаты и отслеживайте прогресс</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">AI-ассистент</h3>
                <p className="text-white/70 text-sm">Анализ сессий и рекомендации на базе ИИ</p>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-white/10" />
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-white/10" />
      </div>

      {/* Right Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center">
              <Brain className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">PsyWebNote</h1>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Добро пожаловать!</h2>
            <p className="text-gray-500">Войдите в свой аккаунт</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm animate-fadeIn">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-12"
                  placeholder="email@example.com"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Пароль</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-12 pr-12"
                  placeholder="••••••••"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2" disabled={loading}>
              {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Вход...</> : 'Войти'}
            </button>
          </form>

          <p className="text-center mt-8 text-gray-500">
            Нет аккаунта?{' '}
            <Link to="/register" className="text-indigo-600 hover:text-indigo-700 font-medium">
              Зарегистрироваться
            </Link>
          </p>

          {/* Clear data option */}
          <div className="mt-6 text-center">
            {!showClearConfirm ? (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="text-xs text-gray-400 hover:text-red-400 transition-colors inline-flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Проблемы со входом? Очистить данные
              </button>
            ) : (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl animate-fadeIn">
                <p className="text-sm text-red-700 mb-3">
                  Это удалит ВСЕ локальные данные (аккаунты, клиентов, сессии). Вы уверены?
                </p>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={handleClearData}
                    className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
                  >
                    Да, очистить
                  </button>
                  <button
                    onClick={() => setShowClearConfirm(false)}
                    className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
