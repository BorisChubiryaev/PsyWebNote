/**
 * Vercel Serverless Function: Yandex OAuth token exchange
 * POST /api/yandex-token
 *
 * Яндекс OAuth требует client_secret при обмене кода на токен.
 * Client Secret НЕЛЬЗЯ хранить в браузере — только на сервере.
 *
 * Переменные окружения (Vercel → Settings → Environment Variables):
 *   YANDEX_CLIENT_ID     — ID приложения (= VITE_YANDEX_CLIENT_ID)
 *   YANDEX_CLIENT_SECRET — Секретный пароль приложения (только сервер!)
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { code, redirect_uri } = req.body || {};

  if (!code || !redirect_uri) {
    return res.status(400).json({ error: 'Missing required fields: code, redirect_uri' });
  }

  const CLIENT_ID     = process.env.YANDEX_CLIENT_ID     || process.env.VITE_YANDEX_CLIENT_ID;
  const CLIENT_SECRET = process.env.YANDEX_CLIENT_SECRET || process.env.VITE_YANDEX_CLIENT_SECRET;

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return res.status(500).json({ error: 'YANDEX_CLIENT_ID or YANDEX_CLIENT_SECRET not configured' });
  }

  try {
    // 1. Обмен кода на токен
    const tokenRes = await fetch('https://oauth.yandex.ru/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({
        grant_type:    'authorization_code',
        code,
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri,
      }),
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error('[Yandex token error]', tokenData);
      return res.status(400).json({
        error:             tokenData.error,
        error_description: tokenData.error_description || tokenData.error,
      });
    }

    if (!tokenData.access_token) {
      return res.status(400).json({ error: 'No access_token in response' });
    }

    // 2. Получаем профиль пользователя
    const profileRes = await fetch('https://login.yandex.ru/info?format=json', {
      headers: { Authorization: `OAuth ${tokenData.access_token}` },
    });
    const profile = await profileRes.json();

    return res.status(200).json({
      access_token: tokenData.access_token,
      user: {
        id:         profile.id,
        name:       profile.real_name || profile.display_name || profile.login,
        email:      profile.default_email || `${profile.login}@yandex.ru`,
        avatar:     profile.is_avatar_empty ? null
                      : `https://avatars.yandex.net/get-yapic/${profile.default_avatar_id}/islands-200`,
        first_name: profile.first_name,
        last_name:  profile.last_name,
      },
    });

  } catch (err) {
    console.error('[Yandex token exception]', err);
    return res.status(500).json({ error: 'Server error during Yandex token exchange', details: err.message });
  }
}
