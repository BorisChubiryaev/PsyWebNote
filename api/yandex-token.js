/**
 * Vercel Serverless Function: Yandex OAuth token exchange
 * POST /api/yandex-token
 *
 * Документация: https://yandex.ru/dev/id/doc/ru/how-to
 *
 * Почему серверная функция?
 * Яндекс OAuth требует client_secret при обмене кода на токен.
 * client_secret НЕЛЬЗЯ хранить в браузере — только на сервере.
 *
 * Env vars (Vercel → Settings → Environment Variables):
 *   YANDEX_CLIENT_ID     — ID приложения
 *   YANDEX_CLIENT_SECRET — Пароль приложения
 */

export default async function handler(req, res) {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { code } = req.body || {};

  if (!code) {
    return res.status(400).json({
      error: 'missing_code',
      error_description: 'Код авторизации (code) обязателен',
    });
  }

  const CLIENT_ID     = process.env.YANDEX_CLIENT_ID || process.env.VITE_YANDEX_CLIENT_ID;
  const CLIENT_SECRET = process.env.YANDEX_CLIENT_SECRET;

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return res.status(500).json({
      error: 'server_config',
      error_description: 'YANDEX_CLIENT_ID или YANDEX_CLIENT_SECRET не настроены на сервере',
    });
  }

  try {
    // ── 1. Обмен кода на токен ──────────────────────────────
    // POST https://oauth.yandex.ru/token
    // Content-Type: application/x-www-form-urlencoded
    // Authorization: Basic base64(client_id:client_secret)

    const basicAuth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

    const tokenRes = await fetch('https://oauth.yandex.ru/token', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
      }),
    });

    const tokenText = await tokenRes.text();
    console.log('[Yandex] Token response status:', tokenRes.status);

    let tokenData;
    try {
      tokenData = JSON.parse(tokenText);
    } catch {
      console.error('[Yandex] Non-JSON response:', tokenText.substring(0, 200));
      return res.status(502).json({
        error: 'yandex_bad_response',
        error_description: 'Яндекс вернул некорректный ответ',
      });
    }

    if (tokenData.error) {
      console.error('[Yandex] Token error:', tokenData);
      return res.status(400).json({
        error:             tokenData.error,
        error_description: tokenData.error_description || tokenData.error,
      });
    }

    if (!tokenData.access_token) {
      return res.status(400).json({
        error: 'no_token',
        error_description: 'Яндекс не вернул access_token',
      });
    }

    // ── 2. Получаем профиль пользователя ────────────────────
    // GET https://login.yandex.ru/info?format=json
    // Authorization: OAuth <access_token>

    const profileRes = await fetch('https://login.yandex.ru/info?format=json', {
      headers: { Authorization: `OAuth ${tokenData.access_token}` },
    });

    const profile = await profileRes.json();
    console.log('[Yandex] Profile:', {
      id:    profile.id,
      login: profile.login,
      email: profile.default_email,
    });

    return res.status(200).json({
      access_token: tokenData.access_token,
      user: {
        id:         profile.id,
        name:       profile.real_name || profile.display_name || profile.login || '',
        email:      profile.default_email || `${profile.login}@yandex.ru`,
        avatar:     profile.is_avatar_empty
                      ? null
                      : `https://avatars.yandex.net/get-yapic/${profile.default_avatar_id}/islands-200`,
        first_name: profile.first_name || '',
        last_name:  profile.last_name || '',
      },
    });

  } catch (err) {
    console.error('[Yandex] Exception:', err);
    return res.status(500).json({
      error: 'server_error',
      error_description: 'Ошибка сервера при обмене Яндекс токена: ' + err.message,
    });
  }
}
