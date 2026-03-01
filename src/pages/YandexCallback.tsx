/**
 * Yandex OAuth Callback
 * Обмен кода на токен через /api/yandex-token (серверная функция)
 * т.к. client_secret нельзя хранить в браузере
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import LoadingScreen from '../components/LoadingScreen';

const REDIRECT_URI = `${window.location.origin}/auth/yandex/callback`;

export default function YandexCallback() {
  const navigate            = useNavigate();
  const [params]            = useSearchParams();
  const { login, register } = useApp();
  const [error, setError]   = useState('');
  const [step, setStep]     = useState('Проверяем данные...');
  const called              = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;
    handleCallback();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCallback = async () => {
    const code     = params.get('code');
    const errParam = params.get('error');
    const errDesc  = params.get('error_description');

    if (errParam) {
      setError(errDesc ? decodeURIComponent(errDesc) : 'Вход через Яндекс отменён');
      setTimeout(() => navigate('/login'), 3000);
      return;
    }

    if (!code) {
      setError('Код авторизации не получен от Яндекс');
      setTimeout(() => navigate('/login'), 3000);
      return;
    }

    try {
      // ── 1. Обмен кода через серверный прокси ──────────────────
      setStep('Получаем токен Яндекс...');

      const tokenRes = await fetch('/api/yandex-token', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ code, redirect_uri: REDIRECT_URI }),
      });

      const tokenData = await tokenRes.json();

      if (tokenData.error) {
        const desc = tokenData.error_description || tokenData.error;
        throw new Error(`Яндекс: ${desc}`);
      }

      if (!tokenData.access_token || !tokenData.user) {
        throw new Error('Не удалось получить данные от Яндекс. Попробуйте ещё раз.');
      }

      // ── 2. Формируем учётные данные ───────────────────────────
      setStep('Получаем профиль...');

      const { user: yaUser } = tokenData;

      const email    = yaUser.email || `yandex_${yaUser.id}@ya.psywebnote.app`;
      const name     = yaUser.name  || `Яндекс User ${yaUser.id}`;
      const password = `ya_${yaUser.id}_psyw`;

      // ── 3. Вход или регистрация ───────────────────────────────
      setStep('Входим в PsyWebNote...');

      const loginRes = await login(email, password);
      if (loginRes.success) { navigate('/dashboard'); return; }

      const regRes = await register(email, password, name);
      if (regRes.success) { navigate('/onboarding'); return; }

      throw new Error(regRes.error || 'Не удалось создать аккаунт через Яндекс');

    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Неизвестная ошибка Яндекс OAuth';
      console.error('[YandexCallback]', msg);
      setError(msg);
      setTimeout(() => navigate('/login'), 5000);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
        <div className="bg-white rounded-3xl p-8 shadow-xl text-center max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Ошибка входа через Яндекс</h2>
          <p className="text-gray-600 text-sm mb-4 leading-relaxed break-words">{error}</p>

          <div className="bg-yellow-50 rounded-xl p-4 text-left mb-4">
            <p className="text-xs font-semibold text-yellow-800 mb-2">💡 Что делать:</p>
            <ul className="text-xs text-yellow-700 space-y-1">
              <li>• Убедитесь что YANDEX_CLIENT_ID добавлен в Vercel</li>
              <li>• Убедитесь что YANDEX_CLIENT_SECRET добавлен в Vercel</li>
              <li>• Проверьте Callback URL в Яндекс OAuth: <br/>
                <code className="bg-yellow-100 px-1 rounded text-xs break-all">{REDIRECT_URI}</code>
              </li>
              <li>• Права: <code className="bg-yellow-100 px-1 rounded">login:email</code>, <code className="bg-yellow-100 px-1 rounded">login:info</code></li>
            </ul>
          </div>

          <p className="text-xs text-gray-400 mb-4">Перенаправляем на страницу входа через 5 сек...</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors"
          >
            Вернуться к входу
          </button>
        </div>
      </div>
    );
  }

  return <LoadingScreen subtitle={step} />;
}
