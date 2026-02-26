const MISTRAL_API_KEY = ""; //add your Mistral API key here
const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function sendToMistral(messages: ChatMessage[]): Promise<string> {
  const response = await fetch(MISTRAL_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${MISTRAL_API_KEY}`,
    },
    body: JSON.stringify({
      model: "mistral-small-latest",
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
  return data.choices[0]?.message?.content || "Нет ответа от AI";
}

export const SYSTEM_PROMPT_ANALYST = `Ты — AI-ассистент для психолога. Твоя задача:
1. Анализировать записи сессий с клиентами: выявлять паттерны, прогресс, проблемные области.
2. Давать профессиональные рекомендации по работе с клиентом (подходы, техники, упражнения).
3. Замечать динамику изменений настроения/состояния клиента.
4. Предлагать темы для следующих сессий.
5. Отвечать корректно, уважительно, в профессиональном контексте психотерапии.
Ты видишь только данные, предоставленные психологом. Не делай диагнозов. Давай рекомендации на основе описаний сессий.
Отвечай на русском языке.`;

export const SYSTEM_PROMPT_GENERAL = `Ты — AI-ассистент на тему психологии и психотерапии для специалиста-психолога.
Ты помогаешь:
- Отвечать на вопросы по психологическим подходам и техникам (КПТ, гештальт, психоанализ и др.)
- Объяснять концепции и теории
- Давать рекомендации по самопомощи и профессиональному развитию
- Обсуждать сложные случаи в общих чертах (без имён клиентов)
- Предлагать упражнения и техники для работы с клиентами
Отвечай на русском языке, профессионально и ёмко.`;
