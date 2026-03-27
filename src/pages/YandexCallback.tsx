import { TR } from '../utils/tr';
/**
 * Yandex OAuth Callback
 *
 * Шаг 1: Получаем code из URL
 * Шаг 2: Отправляем на /api/yandex-token (серверная функция Vercel)
 * Шаг 3: Сервер обменивает code → access_token с client_secret
 * Шаг 4: Login или Register в PsyWebNote
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import LoadingScreen from '../components/LoadingScreen';

export default function YandexCallback() {
  const navigate            = useNavigate();
  const [params]            = useSearchParams();
  const { login, register } = useApp();
  const [error, setError]   = useState('');
  const [step, setStep]     = useState(TR("Проверяем данные...", "Checking the data..."));
  const called              = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;
    handleCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCallback = async () => {
    /* ── Проверяем ошибки ────────────────────────────────── */
    const errParam = params.get('error');
    const errDesc  = params.get('error_description');
    if (errParam) {
      setError(errDesc ? decodeURIComponent(errDesc) : TR("Вход через Яндекс отменён", "Login via Yandex canceled"));
      return;
    }

    const code = params.get('code');
    if (!code) {
      setError(TR("Код авторизации не получен от Яндекс", "Authorization code not received from Yandex"));
      return;
    }

    /* ── Проверяем state ────────────────────────────────── */
    const savedState = sessionStorage.getItem('yandex_state');
    const state      = params.get('state');
    if (savedState && state !== savedState) {
      setError(TR("Ошибка безопасности: неверный state", "Security Error: Invalid state"));
      return;
    }
    sessionStorage.removeItem('yandex_state');

    try {
      /* ── 1. Обмен кода через серверный прокси ──────────── */
      setStep(TR("Получаем токен Яндекс...", "We receive a Yandex token..."));

      const res = await fetch('/api/yandex-token', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ code }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(TR(`Сервер вернул ${res.status}: ${text}`, `Server returned ${res.status}: ${text}`));
      }

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error_description || data.error);
      }

      if (!data.access_token || !data.user) {
        throw new Error(TR("Не удалось получить данные от Яндекс", "Failed to receive data from Yandex"));
      }

      /* ── 2. Данные пользователя ────────────────────────── */
      setStep(TR("Получаем профиль...", "We get a profile..."));

      const { user: yaUser } = data;
      const email    = yaUser.email || `yandex_${yaUser.id}@ya.psywebnote.app`;
      const name     = yaUser.name || TR("Яндекс пользователь", "Yandex user");
      const password = `ya_oauth_${yaUser.id}_psywebnote`;

      /* ── 3. Вход или регистрация ───────────────────────── */
      setStep(TR("Входим в PsyWebNote...", "Login to PsyWebNote..."));

      const loginRes = await login(email, password);
      if (loginRes.success) { navigate('/dashboard'); return; }

      const regRes = await register(email, password, name);
      if (regRes.success) { navigate('/onboarding'); return; }

      throw new Error(regRes.error || TR("Не удалось создать аккаунт", "Failed to create account"));

    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : TR("Неизвестная ошибка Яндекс OAuth", "Unknown error Yandex OAuth");
      console.error('[YandexCallback]', msg);
      setError(msg);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
        <div className="bg-white rounded-3xl p-8 shadow-xl text-center max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{TR("Ошибка входа через Яндекс", "Login error via Yandex")}</h2>
          <p className="text-gray-600 text-sm mb-4 leading-relaxed break-words">{error}</p>

          <div className="bg-yellow-50 rounded-xl p-4 text-left mb-4">
            <p className="text-xs font-semibold text-yellow-800 mb-2">{TR("💡 Проверьте:", "💡 Check:")}</p>
            <ul className="text-xs text-yellow-700 space-y-1">
              <li>• <code className="bg-yellow-100 px-1 rounded">YANDEX_CLIENT_ID</code> {TR(" и ", "And")}<code className="bg-yellow-100 px-1 rounded">YANDEX_CLIENT_SECRET</code> {TR(" в Vercel", "in Vercel")}</li>
              <li>{TR("• Callback URL в Яндексе: ", "• Callback URL in Yandex:")}<code className="bg-yellow-100 px-1 rounded text-xs break-all">{window.location.origin}/auth/yandex/callback</code></li>
              <li>{TR("• Права: login:email, login:info, login:avatar", "• Rights: login:email, login:info, login:avatar")}</li>
            </ul>
          </div>

          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            {TR("\n            Вернуться к входу\n          ", "Back to login")}</button>
        </div>
      </div>
    );
  }

  return <LoadingScreen subtitle={step} />;
}
