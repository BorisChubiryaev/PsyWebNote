/**
 * Яндекс OAuth callback
 *
 * Yandex OAuth использует server-side code exchange (требует client_secret).
 * Поскольку мы SPA без бэкенда, используем implicit flow через Яндекс JS SDK
 * ИЛИ Supabase OAuth (который сам делает code exchange на сервере).
 *
 * Для SPA-only подхода используем Яндекс Passport API через token,
 * полученный в query params (implicit grant).
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import LoadingScreen from '../components/LoadingScreen';

const YANDEX_CLIENT_ID     = import.meta.env.VITE_YANDEX_CLIENT_ID || '';
const YANDEX_CLIENT_SECRET = import.meta.env.VITE_YANDEX_CLIENT_SECRET || '';
const REDIRECT_URI         = `${window.location.origin}/auth/yandex/callback`;

export default function YandexCallback() {
  const navigate              = useNavigate();
  const [searchParams]        = useSearchParams();
  const { login, register }   = useApp();
  const [error, setError]     = useState('');
  const called                = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;
    handleCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCallback = async () => {
    const code    = searchParams.get('code');
    const state   = searchParams.get('state');
    const errParam = searchParams.get('error');

    if (errParam) {
      setError('Вход через Яндекс отменён');
      setTimeout(() => navigate('/login'), 3000);
      return;
    }

    if (!code) {
      setError('Код авторизации не получен от Яндекса');
      setTimeout(() => navigate('/login'), 3000);
      return;
    }

    const savedState = sessionStorage.getItem('yandex_state');
    if (state !== savedState) {
      setError('Ошибка безопасности: неверный state. Попробуйте снова.');
      setTimeout(() => navigate('/login'), 3000);
      return;
    }
    sessionStorage.removeItem('yandex_state');

    try {
      // ── 1. Exchange code → access_token ──────────────────────
      // Яндекс требует Basic Auth: base64(client_id:client_secret)
      const credentials = btoa(`${YANDEX_CLIENT_ID}:${YANDEX_CLIENT_SECRET}`);

      const tokenRes = await fetch('https://oauth.yandex.ru/token', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`,
        },
        body: new URLSearchParams({
          grant_type:   'authorization_code',
          code,
          redirect_uri: REDIRECT_URI,
          client_id:    YANDEX_CLIENT_ID,
        }),
      });

      const tokenData = await tokenRes.json();

      if (tokenData.error) {
        throw new Error(tokenData.error_description || `Yandex token error: ${tokenData.error}`);
      }

      if (!tokenData.access_token) {
        throw new Error('Токен не получен от Яндекса');
      }

      // ── 2. Get user info from Яндекс Passport API ────────────
      const userRes = await fetch(
        'https://login.yandex.ru/info?format=json',
        { headers: { Authorization: `OAuth ${tokenData.access_token}` } },
      );

      const yUser = await userRes.json();

      if (!yUser.id) throw new Error('Не удалось получить профиль Яндекс');

      const email = yUser.default_email
        ?? `yandex_${yUser.id}@yandex.psywebnote.app`;

      const name = yUser.real_name
        ?? yUser.display_name
        ?? yUser.login
        ?? `Яндекс ${yUser.id}`;

      // deterministic password from Yandex identity
      const password = `yandex_${yUser.id}_${YANDEX_CLIENT_ID}_psyw`;

      // ── 3. Login or register ──────────────────────────────────
      const loginRes = await login(email, password);
      if (loginRes.success) { navigate('/dashboard'); return; }

      const regRes = await register(email, password, name);
      if (regRes.success) { navigate('/onboarding'); return; }

      throw new Error(regRes.error || 'Не удалось создать аккаунт через Яндекс');

    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Неизвестная ошибка Яндекс OAuth';
      console.error('[YandexCallback]', msg);
      setError(msg);
      setTimeout(() => navigate('/login'), 4000);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
        <div className="bg-white rounded-3xl p-8 shadow-xl text-center max-w-sm w-full">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Ошибка входа через Яндекс</h2>
          <p className="text-gray-600 text-sm mb-4 leading-relaxed">{error}</p>
          <p className="text-xs text-gray-400 mb-4">Перенаправляем на страницу входа...</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Вернуться
          </button>
        </div>
      </div>
    );
  }

  return <LoadingScreen subtitle="Входим через Яндекс..." />;
}
