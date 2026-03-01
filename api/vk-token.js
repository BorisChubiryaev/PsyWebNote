/**
 * Vercel Serverless Function: VK OAuth token exchange
 * POST /api/vk-token
 *
 * VK ID API 2.1 требует обмен кода на токен на серверной стороне,
 * потому что браузерные запросы к id.vk.com/oauth2/auth блокируются CORS.
 *
 * Переменные окружения (Vercel → Settings → Environment Variables):
 *   VK_APP_ID     — ID вашего VK приложения (= VITE_VK_APP_ID)
 *   VK_APP_SECRET — Секретный ключ VK приложения (только на сервере!)
 */

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { code, redirect_uri, code_verifier, device_id, state } = req.body || {};

  if (!code || !redirect_uri || !code_verifier || !device_id) {
    return res.status(400).json({ error: 'Missing required fields: code, redirect_uri, code_verifier, device_id' });
  }

  const VK_APP_ID     = process.env.VK_APP_ID     || process.env.VITE_VK_APP_ID;
  const VK_APP_SECRET = process.env.VK_APP_SECRET;

  if (!VK_APP_ID) {
    return res.status(500).json({ error: 'VK_APP_ID not configured on server' });
  }

  try {
    const body = new URLSearchParams({
      grant_type:    'authorization_code',
      client_id:     VK_APP_ID,
      redirect_uri,
      code,
      code_verifier,
      device_id,
      state:         state || '',
    });

    // Если есть client_secret — добавляем (для "confidential" приложений)
    if (VK_APP_SECRET) {
      body.append('client_secret', VK_APP_SECRET);
    }

    const tokenRes = await fetch('https://id.vk.com/oauth2/auth', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    const tokenData = await tokenRes.json();

    if (tokenData.error) {
      console.error('[VK token exchange error]', tokenData);
      return res.status(400).json({
        error:             tokenData.error,
        error_description: tokenData.error_description || tokenData.error,
      });
    }

    // Получаем user_info
    if (tokenData.access_token) {
      const userRes = await fetch('https://id.vk.com/oauth2/user_info', {
        method:  'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    new URLSearchParams({
          access_token: tokenData.access_token,
          client_id:    VK_APP_ID,
        }),
      });
      const userInfo = await userRes.json();
      return res.status(200).json({ ...tokenData, user_info: userInfo.user || null });
    }

    return res.status(200).json(tokenData);

  } catch (err) {
    console.error('[VK token exchange exception]', err);
    return res.status(500).json({ error: 'Server error during VK token exchange', details: err.message });
  }
}
