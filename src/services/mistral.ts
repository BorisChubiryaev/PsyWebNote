/**
 * Клиент для Mistral AI
 * В production: запросы идут через /api/mistral (Vercel Function) — API ключ на сервере
 * В dev: если задан VITE_MISTRAL_API_KEY — напрямую (для локальной разработки)
 */

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// В production всегда используем прокси
// В dev можно использовать прямой запрос если VITE_MISTRAL_API_KEY задан
const IS_DEV = import.meta.env.DEV;
const VITE_KEY = import.meta.env.VITE_MISTRAL_API_KEY || '';

export async function sendToMistral(messages: ChatMessage[]): Promise<string> {
  // Dev режим с прямым ключом — запрос напрямую (CORS разрешён для localhost)
  if (IS_DEV && VITE_KEY) {
    return sendDirect(messages, VITE_KEY);
  }

  // Production и dev без ключа — через прокси
  return sendViaProxy(messages);
}

async function sendViaProxy(messages: ChatMessage[]): Promise<string> {
  const response = await fetch('/api/mistral', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'mistral-small-latest',
      messages,
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(err.error || `Ошибка прокси: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'Нет ответа от AI';
}

async function sendDirect(messages: ChatMessage[], apiKey: string): Promise<string> {
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'mistral-small-latest',
      messages,
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Mistral API error: ${response.status} — ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'Нет ответа от AI';
}

// ── Dynamic system prompts with user context ────────────────

interface UserContext {
  name?: string;
  therapyType?: string;
  hourlyRate?: number;
  currency?: string;
  bio?: string;
}

export function getAnalystPrompt(ctx: UserContext): string {
  const userInfo = [
    ctx.name && `Имя психолога: ${ctx.name}`,
    ctx.therapyType && `Основной метод: ${ctx.therapyType}`,
    ctx.hourlyRate && ctx.currency && `Стоимость сессии: ${ctx.hourlyRate} ${ctx.currency}`,
    ctx.bio && `О специалисте: ${ctx.bio}`,
  ].filter(Boolean).join('\n');

  return `Ты — AI-ассистент для психолога. Ты помогаешь конкретному специалисту анализировать работу с его клиентами.

${userInfo ? `ИНФОРМАЦИЯ О ПСИХОЛОГЕ:\n${userInfo}\n` : ''}
Твои задачи:
1. Анализировать записи сессий с клиентами: выявлять паттерны, прогресс, проблемные области.
2. Давать профессиональные рекомендации по работе с клиентом (подходы, техники, упражнения), учитывая основной метод работы специалиста.
3. Замечать динамику изменений настроения/состояния клиента.
4. Предлагать темы для следующих сессий.
5. Отвечать корректно, уважительно, в профессиональном контексте психотерапии.

Важно: ты видишь только данные, предоставленные психологом. Не ставь диагнозов. Давай рекомендации на основе описаний сессий.
${ctx.therapyType ? `Учитывай, что основной подход специалиста — ${ctx.therapyType}. Рекомендуй техники, совместимые с этим подходом, но не ограничивайся им.` : ''}
Обращайся к психологу ${ctx.name ? `по имени (${ctx.name.split(' ')[0]})` : 'на «вы»'}.
Отвечай на русском языке.`;
}

export function getGeneralPrompt(ctx: UserContext): string {
  const userInfo = [
    ctx.name && `Имя: ${ctx.name}`,
    ctx.therapyType && `Специализация: ${ctx.therapyType}`,
  ].filter(Boolean).join(', ');

  return `Ты — AI-ассистент на тему психологии и психотерапии для специалиста-психолога${userInfo ? ` (${userInfo})` : ''}.

Ты помогаешь:
- Отвечать на вопросы по психологическим подходам и техникам (КПТ, гештальт, психоанализ и др.)
- Объяснять концепции и теории
- Давать рекомендации по профессиональному развитию
- Обсуждать сложные случаи в общих чертах (без реальных имён клиентов)
- Предлагать упражнения и техники для работы с клиентами
${ctx.therapyType ? `\nОсновной подход пользователя — ${ctx.therapyType}. Учитывай это в ответах.` : ''}
Обращайся ${ctx.name ? `по имени (${ctx.name.split(' ')[0]})` : 'на «вы»'}.
Отвечай на русском языке, профессионально и ёмко.`;
}

// Legacy exports (backward compatibility)
export const SYSTEM_PROMPT_ANALYST = getAnalystPrompt({});
export const SYSTEM_PROMPT_GENERAL = getGeneralPrompt({});
