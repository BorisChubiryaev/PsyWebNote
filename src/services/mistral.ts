/**
 * Клиент для Mistral AI
 * В production: запросы идут через /api/mistral (Vercel Function) — API ключ на сервере
 * В dev: если задан VITE_MISTRAL_API_KEY — напрямую (для локальной разработки)
 */
import { TR } from '../utils/tr';

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
    throw new Error(err.error || TR(`Ошибка прокси: ${response.status}`, `Proxy error: ${response.status}`));
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || TR("Нет ответа от AI", "No response from AI");
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
  return data.choices?.[0]?.message?.content || TR("Нет ответа от AI", "No response from AI");
}

// ── Dynamic system prompts with user context ────────────────

interface UserContext {
  name?: string;
  therapyType?: string;
  hourlyRate?: number;
  currency?: string;
  bio?: string;
}

function getCurrentLanguage(): 'ru' | 'en' {
  if (typeof window === 'undefined') return 'ru';
  const saved = localStorage.getItem('psywebnote_language');
  if (saved === 'ru' || saved === 'en') return saved;
  return navigator.language.slice(0, 2) === 'en' ? 'en' : 'ru';
}

export function getAnalystPrompt(ctx: UserContext): string {
  const isEn = getCurrentLanguage() === 'en';

  if (isEn) {
    const userInfo = [
      ctx.name && `Psychologist name: ${ctx.name}`,
      ctx.therapyType && `Primary method: ${ctx.therapyType}`,
      ctx.hourlyRate && ctx.currency && `Session fee: ${ctx.hourlyRate} ${ctx.currency}`,
      ctx.bio && `Specialist profile: ${ctx.bio}`,
    ].filter(Boolean).join('\n');

    return `You are an AI assistant for a psychologist. You help this specialist analyze work with their clients.

${userInfo ? `PSYCHOLOGIST CONTEXT:\n${userInfo}\n` : ''}
Your tasks:
1. Analyze session notes to identify patterns, progress, and risk areas.
2. Provide practical recommendations (approaches, techniques, exercises), aligned with the specialist's primary method.
3. Track mood/state dynamics over time.
4. Suggest focus topics for upcoming sessions.
5. Answer professionally, respectfully, and in a psychotherapy context.

Important: You only have the data provided by the psychologist. Do not diagnose. Base guidance strictly on session descriptions.
${ctx.therapyType ? `Consider that the specialist's primary approach is ${ctx.therapyType}. Recommend methods compatible with this approach, but do not limit yourself to it.` : ''}
Address the psychologist ${ctx.name ? `by first name (${ctx.name.split(' ')[0]})` : 'formally'}.
Reply in English.`;
  }

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
Обращайся к психологу ${ctx.name ? `по имени (${ctx.name.split(' ')[0]})` : TR("на «вы»", "to \"you\"")}.
Отвечай на русском языке.`;
}

export function getGeneralPrompt(ctx: UserContext): string {
  const isEn = getCurrentLanguage() === 'en';

  if (isEn) {
    const userInfo = [
      ctx.name && `Name: ${ctx.name}`,
      ctx.therapyType && `Specialization: ${ctx.therapyType}`,
    ].filter(Boolean).join(', ');

    return `You are an AI assistant in psychology and psychotherapy for a professional psychologist${userInfo ? ` (${userInfo})` : ''}.

You help with:
- Explaining therapeutic approaches and techniques (CBT, Gestalt, psychoanalysis, etc.)
- Clarifying concepts and theories
- Sharing recommendations for professional development
- Discussing difficult cases in general terms (without real client names)
- Suggesting practical exercises and interventions for client work
${ctx.therapyType ? `\nThe user's primary approach is ${ctx.therapyType}. Keep this in mind in your answers.` : ''}
Address the user ${ctx.name ? `by first name (${ctx.name.split(' ')[0]})` : 'formally'}.
Reply in English, professionally and concisely.`;
  }

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
Обращайся ${ctx.name ? `по имени (${ctx.name.split(' ')[0]})` : TR("на «вы»", "to \"you\"")}.
Отвечай на русском языке, профессионально и ёмко.`;
}

// Legacy exports (backward compatibility)
export const SYSTEM_PROMPT_ANALYST = getAnalystPrompt({});
export const SYSTEM_PROMPT_GENERAL = getGeneralPrompt({});
