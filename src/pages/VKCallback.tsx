/**
 * VK OAuth 2.1 Callback
 * Обмен кода на токен происходит через /api/vk-token (серверная функция)
 * чтобы обойти CORS-ограничения id.vk.com
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import LoadingScreen from '../components/LoadingScreen';

const VK_APP_ID    = import.meta.env.VITE_VK_APP_ID || '';
const REDIRECT_URI = `${window.location.origin}/auth/vk/callback`;

export default function VKCallback() {
  const navigate              = useNavigate();
  const [params]              = useSearchParams();
  const { login, register }   = useApp();
  const [error, setError]     = useState('');
  const [step, setStep]       = useState('Проверяем данные...');
  const called                = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;
    handleCallback();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCallback = async () => {
    const code      = params.get('code');
    const state     = params.get('state');
    const errParam  = params.get('error');
    const errDesc   = params.get('error_description');

    if (errParam) {
      setError(errDesc ? decodeURIComponent(errDesc) : 'Вход через ВКонтакте отменён');
      setTimeout(() => navigate('/login'), 3000);
      return;
    }

    if (!code) {
      setError('Код авторизации не получен от VK');
      setTimeout(() => navigate('/login'), 3000);
      return;
    }

    const savedState = sessionStorage.getItem('vk_state');
    const verifier   = sessionStorage.getItem('vk_code_verifier');

    // device_id берём из localStorage (постоянный) — тот же что был при авторизации
    const deviceId   =
      localStorage.getItem('vk_device_id_persistent') ||
      sessionStorage.getItem('vk_device_id_session') ||
      '';

    if (state !== savedState) {
      setError('Ошибка безопасности: неверный state. Попробуйте снова.');
      setTimeout(() => navigate('/login'), 3000);
      return;
    }

    if (!verifier || !deviceId) {
      setError('Данные сессии потеряны. Попробуйте нажать кнопку VK ещё раз.');
      setTimeout(() => navigate('/login'), 3000);
      return;
    }

    // Очищаем sessionStorage
    sessionStorage.removeItem('vk_code_verifier');
    sessionStorage.removeItem('vk_state');
    sessionStorage.removeItem('vk_device_id_session');

    try {
      // ── 1. Обмен кода через наш серверный прокси ──────────────
      setStep('Получаем токен VK...');

      const tokenRes = await fetch('/api/vk-token', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          code,
          redirect_uri:  REDIRECT_URI,
          code_verifier: verifier,
          device_id:     deviceId,
          state:         state ?? '',
        }),
      });

      const tokenData = await tokenRes.json();

      if (tokenData.error) {
        // Формируем читаемое сообщение об ошибке
        const desc = tokenData.error_description || tokenData.error;
        throw new Error(`VK: ${decodeURIComponent(desc)}`);
      }

      if (!tokenData.access_token) {
        throw new Error('Токен не получен от VK. Попробуйте ещё раз.');
      }

      // ── 2. Получаем данные пользователя (из ответа прокси) ────
      setStep('Получаем профиль...');

      const vkUser = tokenData.user_info;
      if (!vkUser?.user_id) throw new Error('Не удалось получить профиль VK');

      // ── 3. Формируем учётные данные ───────────────────────────
      const email = tokenData.email
        ?? vkUser.email
        ?? `vk_${vkUser.user_id}@vk.psywebnote.app`;

      const name = [vkUser.first_name, vkUser.last_name]
        .filter(Boolean).join(' ')
        || `VK User ${vkUser.user_id}`;

      // Детерминированный пароль из VK identity (не меняется между входами)
      const password = `vk_${vkUser.user_id}_${VK_APP_ID}_psyw`;

      // ── 4. Вход или регистрация ───────────────────────────────
      setStep('Входим в PsyWebNote...');

      const loginRes = await login(email, password);
      if (loginRes.success) { navigate('/dashboard'); return; }

      const regRes = await register(email, password, name);
      if (regRes.success) { navigate('/onboarding'); return; }

      throw new Error(regRes.error || 'Не удалось создать аккаунт через VK');

    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Неизвестная ошибка VK OAuth';
      console.error('[VKCallback]', msg);
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
          <h2 className="text-xl font-bold text-gray-900 mb-2">Ошибка входа через VK</h2>
          <p className="text-gray-600 text-sm mb-4 leading-relaxed break-words">{error}</p>

          <div className="bg-blue-50 rounded-xl p-4 text-left mb-4">
            <p className="text-xs font-semibold text-blue-800 mb-2">💡 Что делать:</p>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• Убедитесь что VITE_VK_APP_ID добавлен в Vercel</li>
              <li>• Убедитесь что VK_APP_SECRET добавлен в Vercel (если приложение конфиденциальное)</li>
              <li>• Проверьте Redirect URL в настройках VK: <br/><code className="bg-blue-100 px-1 rounded text-xs">{REDIRECT_URI}</code></li>
              <li>• Попробуйте войти заново</li>
            </ul>
          </div>

          <p className="text-xs text-gray-400 mb-4">Перенаправляем на страницу входа через 5 сек...</p>
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
