import { TR } from '../utils/tr';
/**
 * VKontakte OAuth 2.1 (PKCE)
 *
 * Документация: https://id.vk.com/about/business/go/docs/ru/vkid/latest/vk-id/connection/start-integration/how-auth-works/auth-flow-web
 *
 * Ключевые моменты:
 * 1. device_id — UUID v4 С ДЕФИСАМИ, постоянный для устройства
 * 2. code_challenge / code_verifier — PKCE S256
 * 3. Обмен кода → токен через серверный прокси /api/vk-token
 */

import { Loader2 } from 'lucide-react';
import { useState } from 'react';

const VK_APP_ID    = import.meta.env.VITE_VK_APP_ID || '';
const REDIRECT_URI = `${window.location.origin}/auth/vk/callback`;

/* ── Helpers ─────────────────────────────────────────────── */

function toBase64URL(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

async function makeCodeVerifier(): Promise<string> {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  return toBase64URL(buf.buffer);
}

async function makeCodeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(verifier),
  );
  return toBase64URL(digest);
}

function makeState(): string {
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  return toBase64URL(buf.buffer);
}

/**
 * device_id — UUID v4 С ДЕФИСАМИ (именно так генерирует VK ID SDK!)
 *
 * Формат: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 * Пример: 550e8400-e29b-41d4-a716-446655440000
 *
 * Хранится в localStorage — один раз создаётся и используется всегда.
 */
function getOrCreateDeviceId(): string {
  const KEY = 'psywebnote_vk_device_id';
  let stored = localStorage.getItem(KEY);

  // Проверяем, что это именно UUID v4 с дефисами
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (stored && uuidRegex.test(stored)) return stored;

  // Генерируем UUID v4 (точно как VK ID SDK)
  stored = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
    /[xy]/g,
    (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    },
  );

  localStorage.setItem(KEY, stored);
  return stored;
}

/* ── Component ───────────────────────────────────────────── */

interface Props {
  disabled?: boolean;
  label?: string;
}

export default function VKLoginButton({
  disabled,
  label = TR("Войти через ВКонтакте", "Login via VKontakte"),
}: Props) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!VK_APP_ID) {
      alert(
        TR("VK App ID не настроен.\nДобавьте VITE_VK_APP_ID в .env и в Vercel → Settings → Environment Variables.", "VK App ID is not configured.\nAdd VITE_VK_APP_ID to .env and to Vercel → Settings → Environment Variables."),
      );
      return;
    }

    setLoading(true);
    try {
      const codeVerifier  = await makeCodeVerifier();
      const codeChallenge = await makeCodeChallenge(codeVerifier);
      const state         = makeState();
      const deviceId      = getOrCreateDeviceId();

      // Сохраняем для VKCallback
      sessionStorage.setItem('vk_code_verifier', codeVerifier);
      sessionStorage.setItem('vk_state', state);
      sessionStorage.setItem('vk_device_id', deviceId);

      const params = new URLSearchParams({
        response_type:         'code',
        client_id:             VK_APP_ID,
        redirect_uri:          REDIRECT_URI,
        state,
        code_challenge:        codeChallenge,
        code_challenge_method: 'S256',
        device_id:             deviceId,
      });

      // Редирект в VK
      window.location.href = `https://id.vk.com/authorize?${params.toString()}`;
    } catch (e) {
      console.error('[VK] OAuth start error:', e);
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || loading || !VK_APP_ID}
      className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-[#0077FF]/30 bg-[#0077FF]/5 hover:bg-[#0077FF]/10 rounded-2xl transition-all disabled:opacity-50 font-medium text-[#0077FF]"
      title={!VK_APP_ID ? TR("Добавьте VITE_VK_APP_ID в настройки", "Add VITE_VK_APP_ID to settings") : undefined}
    >
      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <VKIcon />}
      {loading ? TR("Переходим в VK...", "Let's go to VK...") : label}
    </button>
  );
}

function VKIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.864-.525-2.05-1.727-1.033-1-1.49-1.135-1.744-1.135-.356 0-.458.102-.458.593v1.575c0 .424-.135.677-1.253.677-1.846 0-3.896-1.118-5.335-3.202C5.029 10.445 4.47 8.368 4.47 7.937c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.677.863 2.49 2.303 4.675 2.896 4.675.22 0 .322-.102.322-.66V9.95c-.068-1.186-.695-1.287-.695-1.71 0-.204.17-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.813-.542 1.254-1.406 2.151-3.574 2.151-3.574.119-.254.322-.491.763-.491h1.744c.525 0 .644.27.525.643-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.796.779 1.203 1.253.745.847 1.32 1.558 1.473 2.05.17.491-.085.745-.576.745z" />
    </svg>
  );
}
