/**
 * VK OAuth callback handler
 * VK redirects here after user authorizes the app
 */
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import LoadingScreen from '../components/LoadingScreen';

const VK_APP_ID = import.meta.env.VITE_VK_APP_ID || '';

export default function VKCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, register } = useApp();
  const [error, setError] = useState('');

  useEffect(() => {
    handleCallback();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCallback = async () => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const errorParam = searchParams.get('error');

    if (errorParam) {
      setError('Вход через ВКонтакте отменён');
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    if (!code) {
      setError('Код авторизации не получен');
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    // Verify state
    const savedState = sessionStorage.getItem('vk_state');
    if (state !== savedState) {
      setError('Ошибка безопасности: неверный state');
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    const codeVerifier = sessionStorage.getItem('vk_code_verifier');
    const deviceId = sessionStorage.getItem('vk_device_id');

    if (!codeVerifier || !deviceId) {
      setError('Данные сессии потеряны. Попробуйте снова.');
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    try {
      // Exchange code for token via VK ID API
      const tokenRes = await fetch('https://id.vk.com/oauth2/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: VK_APP_ID,
          code,
          code_verifier: codeVerifier,
          redirect_uri: `${window.location.origin}/auth/vk/callback`,
          device_id: deviceId,
          state: state ?? '',
        }),
      });

      const tokenData = await tokenRes.json();

      if (tokenData.error || !tokenData.access_token) {
        throw new Error(tokenData.error_description || 'Не удалось получить токен VK');
      }

      // Get user info
      const userRes = await fetch('https://id.vk.com/oauth2/user_info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ access_token: tokenData.access_token, client_id: VK_APP_ID }),
      });

      const userData = await userRes.json();
      const vkUser = userData.user;

      if (!vkUser) throw new Error('Не удалось получить данные пользователя VK');

      // Use VK email if available, otherwise create synthetic email from VK ID
      const email = tokenData.email || vkUser.email || `vk_${vkUser.user_id}@vk.psywebnote.app`;
      const name = [vkUser.first_name, vkUser.last_name].filter(Boolean).join(' ') || `VK User ${vkUser.user_id}`;
      const password = `vk_oauth_${vkUser.user_id}_${VK_APP_ID}`;

      // Clear session storage
      sessionStorage.removeItem('vk_code_verifier');
      sessionStorage.removeItem('vk_state');
      sessionStorage.removeItem('vk_device_id');

      // Try login first
      const loginResult = await login(email, password);
      if (loginResult.success) {
        navigate('/dashboard');
        return;
      }

      // Register new user
      const regResult = await register(email, password, name);
      if (regResult.success) {
        navigate('/onboarding');
        return;
      }

      throw new Error(regResult.error || 'Ошибка входа через VK');

    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Ошибка входа через ВКонтакте';
      setError(msg);
      setTimeout(() => navigate('/login'), 3000);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
        <div className="bg-white rounded-3xl p-8 shadow-xl text-center max-w-sm w-full">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Ошибка входа</h2>
          <p className="text-gray-500 text-sm mb-4">{error}</p>
          <p className="text-xs text-gray-400">Перенаправляем на страницу входа...</p>
        </div>
      </div>
    );
  }

  return <LoadingScreen subtitle="Входим через ВКонтакте..." />;
}
