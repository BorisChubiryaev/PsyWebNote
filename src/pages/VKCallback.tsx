/**
 * VK OAuth 2.1 callback — handles code exchange with correct device_id
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import LoadingScreen from '../components/LoadingScreen';

const VK_APP_ID    = import.meta.env.VITE_VK_APP_ID || '';
const REDIRECT_URI = `${window.location.origin}/auth/vk/callback`;

export default function VKCallback() {
  const navigate       = useNavigate();
  const [params]       = useSearchParams();
  const { login, register } = useApp();
  const [error, setError]   = useState('');
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;
    handleCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCallback = async () => {
    const code       = params.get('code');
    const state      = params.get('state');
    const errParam   = params.get('error');
    const errDesc    = params.get('error_description');

    if (errParam) {
      setError(errDesc ? decodeURIComponent(errDesc) : 'Вход через ВКонтакте отменён');
      setTimeout(() => navigate('/login'), 3000);
      return;
    }

    if (!code) {
      setError('Код авторизации не получен');
      setTimeout(() => navigate('/login'), 3000);
      return;
    }

    const savedState  = sessionStorage.getItem('vk_state');
    const verifier    = sessionStorage.getItem('vk_code_verifier');
    const deviceId    = sessionStorage.getItem('vk_device_id');

    if (state !== savedState) {
      setError('Ошибка безопасности: неверный state. Попробуйте снова.');
      setTimeout(() => navigate('/login'), 3000);
      return;
    }

    if (!verifier || !deviceId) {
      setError('Данные сессии потеряны. Попробуйте снова.');
      setTimeout(() => navigate('/login'), 3000);
      return;
    }

    // Clear session storage early
    sessionStorage.removeItem('vk_code_verifier');
    sessionStorage.removeItem('vk_state');
    sessionStorage.removeItem('vk_device_id');

    try {
      // ── 1. Exchange code → access_token ──────────────────────
      const tokenRes = await fetch('https://id.vk.com/oauth2/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type:    'authorization_code',
          client_id:     VK_APP_ID,
          redirect_uri:  REDIRECT_URI,
          code,
          code_verifier: verifier,
          device_id:     deviceId,   // ← same 32-hex-char string sent during auth
          state:         state ?? '',
        }),
      });

      const tokenData = await tokenRes.json();

      if (tokenData.error) {
        throw new Error(
          tokenData.error_description
            ? decodeURIComponent(tokenData.error_description)
            : `VK error: ${tokenData.error}`,
        );
      }

      if (!tokenData.access_token) {
        throw new Error('Токен не получен от VK. Попробуйте ещё раз.');
      }

      // ── 2. Fetch user info ────────────────────────────────────
      const userRes = await fetch('https://id.vk.com/oauth2/user_info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          access_token: tokenData.access_token,
          client_id:    VK_APP_ID,
        }),
      });

      const userData = await userRes.json();
      const vkUser   = userData.user;

      if (!vkUser?.user_id) throw new Error('Не удалось получить профиль VK');

      // ── 3. Build synthetic credentials ───────────────────────
      const email    = tokenData.email
        ?? vkUser.email
        ?? `vk_${vkUser.user_id}@vk.psywebnote.app`;

      const name     = [vkUser.first_name, vkUser.last_name]
        .filter(Boolean).join(' ')
        || `VK User ${vkUser.user_id}`;

      // deterministic password from VK identity
      const password = `vk_${vkUser.user_id}_${VK_APP_ID}_psyw`;

      // ── 4. Try login → fallback register ─────────────────────
      const loginRes = await login(email, password);
      if (loginRes.success) { navigate('/dashboard'); return; }

      const regRes = await register(email, password, name);
      if (regRes.success) { navigate('/onboarding'); return; }

      throw new Error(regRes.error || 'Не удалось создать аккаунт через VK');

    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Неизвестная ошибка VK OAuth';
      console.error('[VKCallback]', msg);
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
          <h2 className="text-xl font-bold text-gray-900 mb-2">Ошибка входа через VK</h2>
          <p className="text-gray-600 text-sm mb-4 leading-relaxed">{error}</p>
          <p className="text-xs text-gray-400">Перенаправляем на страницу входа...</p>
          <button
            onClick={() => navigate('/login')}
            className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Вернуться
          </button>
        </div>
      </div>
    );
  }

  return <LoadingScreen subtitle="Входим через ВКонтакте..." />;
}
