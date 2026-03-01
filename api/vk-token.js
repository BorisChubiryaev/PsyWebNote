/**
 * Vercel Serverless Function: VK OAuth 2.1 token exchange
 * POST /api/vk-token
 *
 * Документация VK ID:
 * https://id.vk.com/about/business/go/docs/ru/vkid/latest/vk-id/connection/start-integration/how-auth-works/auth-flow-web
 *
 * Env vars (Vercel → Settings → Environment Variables):
 *   VK_APP_ID     — ID приложения VK (= VITE_VK_APP_ID)
 *   VK_APP_SECRET — Защищённый ключ (сервисный ключ доступа)
 */

export default async function handler(req, res) {
  // CORS
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { code, redirect_uri, code_verifier, device_id, state } = req.body || {};

  if (!code || !redirect_uri || !code_verifier || !device_id) {
    return res.status(400).json({
      error: 'missing_params',
      error_description: `Missing: ${[
        !code && 'code',
        !redirect_uri && 'redirect_uri',
        !code_verifier && 'code_verifier',
        !device_id && 'device_id',
      ].filter(Boolean).join(', ')}`,
    });
  }

  const APP_ID     = process.env.VK_APP_ID || process.env.VITE_VK_APP_ID;
  const APP_SECRET = process.env.VK_APP_SECRET;

  if (!APP_ID) {
    return res.status(500).json({
      error: 'server_config',
      error_description: 'VK_APP_ID not configured on server',
    });
  }

  try {
    // ── 1. Обмен кода на токен ──────────────────────────────
    const tokenParams = new URLSearchParams({
      grant_type:    'authorization_code',
      client_id:     APP_ID,
      code,
      code_verifier,
      device_id,
      redirect_uri,
    });

    // state передаём, только если он есть
    if (state) tokenParams.append('state', state);

    // client_secret — если приложение "конфиденциальное"
    if (APP_SECRET) tokenParams.append('client_secret', APP_SECRET);

    console.log('[VK] Token exchange params:', {
      grant_type: 'authorization_code',
      client_id: APP_ID,
      code: code.substring(0, 10) + '...',
      device_id,
      redirect_uri,
    });

    const tokenRes = await fetch('https://id.vk.com/oauth2/auth', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    tokenParams,
    });

    const tokenText = await tokenRes.text();
    console.log('[VK] Token response status:', tokenRes.status);

    let tokenData;
    try {
      tokenData = JSON.parse(tokenText);
    } catch {
      console.error('[VK] Non-JSON response:', tokenText.substring(0, 200));
      return res.status(502).json({
        error: 'vk_bad_response',
        error_description: 'VK вернул некорректный ответ',
      });
    }

    if (tokenData.error) {
      console.error('[VK] Token error:', tokenData);
      return res.status(400).json({
        error:             tokenData.error,
        error_description: tokenData.error_description || tokenData.error,
      });
    }

    if (!tokenData.access_token) {
      console.error('[VK] No access_token:', tokenData);
      return res.status(400).json({
        error: 'no_token',
        error_description: 'VK не вернул access_token',
      });
    }

    // ── 2. Получаем профиль пользователя ────────────────────
    const userRes = await fetch('https://id.vk.com/oauth2/user_info', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({
        access_token: tokenData.access_token,
        client_id:    APP_ID,
      }),
    });

    const userData = await userRes.json();

    console.log('[VK] User info response:', {
      has_user: !!userData.user,
      user_id: userData.user?.user_id,
    });

    return res.status(200).json({
      access_token: tokenData.access_token,
      email:        tokenData.email || userData.user?.email || null,
      user_info:    userData.user || null,
    });

  } catch (err) {
    console.error('[VK] Exception:', err);
    return res.status(500).json({
      error: 'server_error',
      error_description: 'Ошибка сервера при обмене VK токена: ' + err.message,
    });
  }
}
