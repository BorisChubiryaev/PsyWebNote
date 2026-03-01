import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Brain, Mail, Lock, Eye, EyeOff, User, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useApp();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!name || !email || !password || !confirmPassword) {
      setError('Заполните все поля');
      return;
    }

    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    if (password.length < 6) {
      setError('Пароль должен быть не менее 6 символов');
      return;
    }

    setLoading(true);
    try {
      const result = await register(email, password, name);
      if (result.success) {
        navigate('/onboarding');
      } else {
        setError(result.error || 'Ошибка регистрации');
      }
    } catch {
      setError('Произошла ошибка. Попробуйте снова.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-gray-50 to-indigo-50">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center">
            <Brain className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">PsyWebNote</h1>
        </div>

        <div className="card animate-fadeIn">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Создать аккаунт</h2>
            <p className="text-gray-500">Начните работу с PsyWebNote</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm animate-fadeIn">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ваше имя</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field pl-12"
                  placeholder="Анна Иванова"
                  disabled={loading}
                />
              </div>
            </div>

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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Подтвердите пароль</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field pl-12"
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>
            </div>

            <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2" disabled={loading}>
              {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Регистрация...</> : 'Зарегистрироваться'}
            </button>
          </form>

          <p className="text-center mt-6 text-gray-500">
            Уже есть аккаунт?{' '}
            <Link to="/login" className="text-indigo-600 hover:text-indigo-700 font-medium">
              Войти
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
