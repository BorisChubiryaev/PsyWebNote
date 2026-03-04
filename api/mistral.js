/**
 * Vercel Serverless Function — прокси для Mistral AI API
 * Запросы идут: Browser → /api/mistral → api.mistral.ai
 * API ключ хранится только на сервере, в браузер не попадает
 */

export default async function handler(req, res) {
  // CORS заголовки — разрешаем только с нашего домена
  const origin = req.headers.origin || '';
  const allowedOrigins = [
    'https://psy-web-note.vercel.app',
    'http://localhost:5173',
    'http://localhost:4173',
  ];

  const isAllowed = allowedOrigins.some(o => origin.startsWith(o)) || origin === '';
  res.setHeader('Access-Control-Allow-Origin', isAllowed ? origin : allowedOrigins[0]);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Max-Age', '86400');

  // Preflight OPTIONS запрос
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'MISTRAL_API_KEY не настроен на сервере. Добавьте переменную в Vercel Dashboard → Settings → Environment Variables'
    });
  }

  const { messages, model, temperature, max_tokens } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Поле messages обязательно' });
  }

  try {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || 'mistral-small-latest',
        messages,
        temperature: temperature ?? 0.7,
        max_tokens: max_tokens ?? 1024,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Mistral API error:', response.status, errorText);
      return res.status(response.status).json({
        error: `Ошибка Mistral API: ${response.status}`,
        details: errorText,
      });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: 'Ошибка прокси-сервера', details: err.message });
  }
}
