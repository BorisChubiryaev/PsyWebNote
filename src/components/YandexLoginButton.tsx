import { TR } from '../utils/tr';
/**
 * Яндекс OAuth 2.0 login button
 *
 * Flow:
 * 1. Redirect to https://oauth.yandex.ru/authorize
 * 2. Yandex redirects to /auth/yandex/callback?code=...
 * 3. YandexCallback exchanges code → token → user info
 * 4. Login or register
 *
 * Setup: https://oauth.yandex.ru/ → Create app
 *   - Permissions: login:email, login:info, login:avatar
 *   - Callback URL: https://your-domain.vercel.app/auth/yandex/callback
 */

import { Loader2 } from 'lucide-react';
import { useState } from 'react';

const YANDEX_CLIENT_ID = import.meta.env.VITE_YANDEX_CLIENT_ID || '';
const REDIRECT_URI     = `${window.location.origin}/auth/yandex/callback`;

function makeState(): string {
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
}

interface Props {
  disabled?: boolean;
  label?: string;
}

export default function YandexLoginButton({
  disabled,
  label = TR("Войти через Яндекс", "Login via Yandex"),
}: Props) {
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    if (!YANDEX_CLIENT_ID) {
      alert(TR("Yandex Client ID не настроен. Добавьте VITE_YANDEX_CLIENT_ID в .env", "Yandex Client ID is not configured. Add VITE_YANDEX_CLIENT_ID to .env"));
      return;
    }

    setLoading(true);

    const state = makeState();
    sessionStorage.setItem('yandex_state', state);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id:     YANDEX_CLIENT_ID,
      redirect_uri:  REDIRECT_URI,
      scope:         'login:email login:info login:avatar',
      state,
      force_confirm: 'no',
    });

    window.location.href = `https://oauth.yandex.ru/authorize?${params}`;
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || loading || !YANDEX_CLIENT_ID}
      className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-[#FFCC00]/40 bg-[#FFCC00]/10 hover:bg-[#FFCC00]/20 rounded-2xl transition-all disabled:opacity-50 font-medium text-[#D4A500]"
      title={!YANDEX_CLIENT_ID ? TR("Добавьте VITE_YANDEX_CLIENT_ID в .env", "Add VITE_YANDEX_CLIENT_ID to .env") : undefined}
    >
      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <YandexIcon />}
      {loading ? TR("Переходим в Яндекс...", "Let's go to Yandex...") : label}
    </button>
  );
}

function YandexIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="12" fill="#FC3F1D"/>
      <path
        d="M13.33 5.5H11.9C9.97 5.5 8.83 6.5 8.83 8.1c0 1.8.77 2.7 2.35 3.77l1.3.87-3.77 5.76H6.5l3.48-5.3C8.1 12.2 7.1 11 7.1 8.3 7.1 5.5 9.03 4 11.83 4H15v16h-1.67V5.5z"
        fill="white"
      />
    </svg>
  );
}
