/**
 * VK OAuth 2.1 Callback
 *
 * Шаг 1: Получаем `code` из URL
 * Шаг 2: Отправляем на /api/vk-token (серверная Vercel Function)
 * Шаг 3: Сервер обменивает code → access_token + user_info
 * Шаг 4: Login или Register в PsyWebNote
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import LoadingScreen from '../components/LoadingScreen';

const VK_APP_ID    = import.meta.env.VITE_VK_APP_ID || '';
const REDIRECT_URI = `${window.location.origin}/auth/vk/callback`;

export default function VKCallback() {
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
    /* ── Проверяем ошибки от VK ─────────────────────────── */
    const errParam = params.get('error');
    const errDesc  = params.get('error_description');
    if (errParam) {
      setError(errDesc ? decodeURIComponent(errDesc) : 'Вход через ВКонтакте отменён');
      return;
    }

    const code = params.get('code');
    if (!code) {
      setError('Код авторизации не получен от VK');
      return;
    }

    /* ── Проверяем state ────────────────────────────────── */
    const savedState = sessionStorage.getItem('vk_state');
    const state      = params.get('state');
    if (state !== savedState) {
      setError('Ошибка безопасности: неверный state. Попробуйте снова.');
      return;
    }

    /* ── Получаем сохранённые данные ────────────────────── */
    const codeVerifier = sessionStorage.getItem('vk_code_verifier');
    const deviceId     = sessionStorage.getItem('vk_device_id')
                      || localStorage.getItem('psywebnote_vk_device_id')
                      || '';

    if (!codeVerifier) {
      setError('Данные сессии потеряны (code_verifier). Попробуйте нажать кнопку VK ещё раз.');
      return;
    }
    if (!deviceId) {
      setError('Данные сессии потеряны (device_id). Попробуйте нажать кнопку VK ещё раз.');
      return;
    }

    // Очищаем
    sessionStorage.removeItem('vk_code_verifier');
    sessionStorage.removeItem('vk_state');
    sessionStorage.removeItem('vk_device_id');

    try {
      /* ── 1. Обмен кода через серверный прокси ──────────── */
      setStep('Получаем токен VK...');

      const res = await fetch('/api/vk-token', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          code,
          redirect_uri:  REDIRECT_URI,
          code_verifier: codeVerifier,
          device_id:     deviceId,
          state:         state ?? '',
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Сервер вернул ${res.status}: ${text}`);
      }

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error_description || data.error);
      }

      if (!data.access_token) {
        throw new Error('Токен не получен от VK');
      }

      /* ── 2. Данные пользователя ────────────────────────── */
      setStep('Получаем профиль...');

      const vkUser = data.user_info;
      if (!vkUser?.user_id && !vkUser?.id) {
        throw new Error('Не удалось получить профиль VK');
      }

      const vkId = vkUser.user_id || vkUser.id;
      const email = data.email
        ?? vkUser.email
        ?? `vk_${vkId}@vk.psywebnote.app`;

      const name = [vkUser.first_name, vkUser.last_name]
        .filter(Boolean).join(' ')
        || `VK User ${vkId}`;

      const password = `vk_oauth_${vkId}_${VK_APP_ID}_psywebnote`;

      /* ── 3. Вход или регистрация ───────────────────────── */
      setStep('Входим в PsyWebNote...');

      const loginRes = await login(email, password);
      if (loginRes.success) { navigate('/dashboard'); return; }

      const regRes = await register(email, password, name);
      if (regRes.success) { navigate('/onboarding'); return; }

      throw new Error(regRes.error || 'Не удалось создать аккаунт');

    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Неизвестная ошибка VK OAuth';
      console.error('[VKCallback]', msg);
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
          <h2 className="text-xl font-bold text-gray-900 mb-2">Ошибка входа через VK</h2>
          <p className="text-gray-600 text-sm mb-4 leading-relaxed break-words">{error}</p>

          <div className="bg-blue-50 rounded-xl p-4 text-left mb-4">
            <p className="text-xs font-semibold text-blue-800 mb-2">💡 Проверьте:</p>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• Переменные <code className="bg-blue-100 px-1 rounded">VITE_VK_APP_ID</code>, <code className="bg-blue-100 px-1 rounded">VK_APP_ID</code>, <code className="bg-blue-100 px-1 rounded">VK_APP_SECRET</code> в Vercel</li>
              <li>• Redirect URL в VK: <code className="bg-blue-100 px-1 rounded text-xs break-all">{REDIRECT_URI}</code></li>
              <li>• Базовый домен в VK: <code className="bg-blue-100 px-1 rounded">{window.location.hostname}</code></li>
            </ul>
          </div>

          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Вернуться к входу
          </button>
        </div>
      </div>
    );
  }

  return <LoadingScreen subtitle={step} />;
}
