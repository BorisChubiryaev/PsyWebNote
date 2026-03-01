/**
 * VKontakte OAuth 2.1 (PKCE) — fixed device_id format
 *
 * VK requires device_id to be exactly 16 random bytes encoded as hex (32 chars),
 * NOT a UUID with dashes.
 */

import { Loader2 } from 'lucide-react';
import { useState } from 'react';

const VK_APP_ID    = import.meta.env.VITE_VK_APP_ID || '';
const REDIRECT_URI = `${window.location.origin}/auth/vk/callback`;

// ── Helpers ────────────────────────────────────────────────────────────

function toBase64URL(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/** 32 random bytes → base64url (code verifier) */
async function makeCodeVerifier(): Promise<string> {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  return toBase64URL(buf.buffer);
}

/** SHA-256(verifier) → base64url (code challenge) */
async function makeCodeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return toBase64URL(digest);
}

/** 16 random bytes → CSRFS state (base64url) */
function makeState(): string {
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  return toBase64URL(buf.buffer);
}

/**
 * VK device_id: exactly 16 random bytes encoded as a 32-char lowercase hex string.
 * Must NOT contain dashes or other characters.
 */
function makeDeviceId(): string {
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ──────────────────────────────────────────────────────────────────────

interface Props {
  disabled?: boolean;
  label?: string;
}

export default function VKLoginButton({ disabled, label = 'Войти через ВКонтакте' }: Props) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (!VK_APP_ID) {
      alert('VK App ID не настроен. Добавьте VITE_VK_APP_ID в .env');
      return;
    }

    setLoading(true);
    try {
      const verifier   = await makeCodeVerifier();
      const challenge  = await makeCodeChallenge(verifier);
      const state      = makeState();
      const deviceId   = makeDeviceId();   // ← правильный формат: 32 hex chars

      sessionStorage.setItem('vk_code_verifier', verifier);
      sessionStorage.setItem('vk_state',         state);
      sessionStorage.setItem('vk_device_id',     deviceId);

      const params = new URLSearchParams({
        response_type:         'code',
        client_id:             VK_APP_ID,
        redirect_uri:          REDIRECT_URI,
        scope:                 'email',
        state,
        code_challenge:        challenge,
        code_challenge_method: 'S256',
        device_id:             deviceId,   // ← передаём на этапе авторизации
      });

      window.location.href = `https://id.vk.com/authorize?${params}`;
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
      title={!VK_APP_ID ? 'Добавьте VITE_VK_APP_ID в .env' : undefined}
    >
      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <VKIcon />}
      {loading ? 'Переходим в VK...' : label}
    </button>
  );
}

function VKIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M15.684 0H8.316C1.592 0 0 1.592 0 8.316v7.368C0 22.408 1.592 24 8.316 24h7.368C22.408 24 24 22.408 24 15.684V8.316C24 1.592 22.408 0 15.684 0zm3.692 17.123h-1.744c-.66 0-.864-.525-2.05-1.727-1.033-1-1.49-1.135-1.744-1.135-.356 0-.458.102-.458.593v1.575c0 .424-.135.677-1.253.677-1.846 0-3.896-1.118-5.335-3.202C5.029 10.445 4.47 8.368 4.47 7.937c0-.254.102-.491.593-.491h1.744c.44 0 .61.203.78.677.863 2.49 2.303 4.675 2.896 4.675.22 0 .322-.102.322-.66V9.95c-.068-1.186-.695-1.287-.695-1.71 0-.204.17-.407.44-.407h2.744c.373 0 .508.203.508.643v3.473c0 .372.17.508.271.508.22 0 .407-.136.813-.542 1.254-1.406 2.151-3.574 2.151-3.574.119-.254.322-.491.763-.491h1.744c.525 0 .644.27.525.643-.22 1.017-2.354 4.031-2.354 4.031-.186.305-.254.44 0 .78.186.254.796.779 1.203 1.253.745.847 1.32 1.558 1.473 2.05.17.491-.085.745-.576.745z"/>
    </svg>
  );
}
