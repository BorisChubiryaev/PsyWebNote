import { TR } from '../utils/tr';
import { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Loader2, Bot, User as UserIcon, ChevronDown, Maximize2, Minimize2 } from 'lucide-react';
import { sendToMistral, ChatMessage, getGeneralPrompt } from '../services/mistral';
import { useApp } from '../context/AppContext';
import { useLanguage } from '../context/LanguageContext';
import MarkdownMessage from './MarkdownMessage';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  ts: Date;
}

const QUICK_QUESTIONS = [
  TR("Что такое КПТ и как её применять?", "What is CBT and how to use it?"),
  TR("Техники работы с тревогой", "Techniques for dealing with anxiety"),
  TR("Как выстроить терапевтический альянс?", "How to build a therapeutic alliance?"),
  TR("Признаки эмоционального выгорания психолога", "Signs of emotional burnout in a psychologist"),
];

export default function AIFloatingChat() {
  const { user } = useApp();
  const { language } = useLanguage();
  const [isOpen, setIsOpen]   = useState(false);
  const [isMin, setIsMin]     = useState(false);
  const [isMax, setIsMax]     = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const endRef   = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  const timeLocale = language === 'ru' ? 'ru-RU' : 'en-US';

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  const systemPrompt = getGeneralPrompt({
    name: user?.name,
    therapyType: user?.therapyType,
    hourlyRate: user?.hourlyRate,
    currency: user?.currency,
    bio: user?.bio,
  });

  useEffect(() => {
    if (isOpen && !isMin) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen, isMin]);

  useEffect(() => {
    if (isOpen && !isMin) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen, isMin]);

  const send = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: msg, ts: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const history: ChatMessage[] = [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user', content: msg },
      ];
      const reply = await sendToMistral(history);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: 'assistant', content: reply, ts: new Date(),
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: 'assistant',
        content: TR("⚠️ Ошибка соединения. Попробуйте снова.", "⚠️ Connection error. Try again."), ts: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const handleClose = () => { setIsOpen(false); setIsMin(false); setIsMax(false); };

  // Size logic
  const getMobileChatStyle = (): React.CSSProperties => ({
    position: 'fixed',
    bottom: 0, left: 0, right: 0,
    top: isMax ? 0 : 'auto',
    height: isMax ? '100dvh' : '70dvh',
    zIndex: 50,
    borderRadius: isMax ? 0 : '20px 20px 0 0',
  });

  const getDesktopChatStyle = (): React.CSSProperties => ({
    position: 'fixed',
    bottom: isMax ? 0 : 24,
    right: isMax ? 0 : 24,
    left: isMax ? 0 : 'auto',
    top: isMax ? 0 : 'auto',
    width: isMax ? '100vw' : 380,
    height: isMax ? '100vh' : 520,
    zIndex: 50,
    borderRadius: isMax ? 0 : 20,
  });

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-40 w-14 h-14 bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-full shadow-2xl shadow-violet-500/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
          title={TR("AI-ассистент по психологии", "AI assistant in psychology")}
        >
          <Sparkles className="w-6 h-6" />
          <span className="absolute top-0.5 right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse" />
        </button>
      )}

      {/* Chat window */}
      {isOpen && (
        <div
          className="bg-white shadow-2xl border border-gray-100 flex flex-col overflow-hidden"
          style={isMobile ? getMobileChatStyle() : getDesktopChatStyle()}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-violet-600 to-indigo-700 px-4 py-3 flex items-center gap-3 flex-shrink-0">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-white text-sm">{TR("AI-ассистент", "AI assistant")}</h3>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <span className="text-violet-200 text-xs">{TR("по психологии · онлайн", "in psychology online")}</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* Minimize */}
              <button
                onClick={() => setIsMin(!isMin)}
                className="p-1.5 hover:bg-white/20 rounded-lg text-white transition-colors"
                title={isMin ? TR("Развернуть", "Expand") : TR("Свернуть", "Collapse")}
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${isMin ? 'rotate-180' : ''}`} />
              </button>
              {/* Maximize (desktop only) */}
              {!isMobile && (
                <button
                  onClick={() => setIsMax(!isMax)}
                  className="p-1.5 hover:bg-white/20 rounded-lg text-white transition-colors"
                  title={isMax ? TR("Обычный размер", "Regular size") : TR("На весь экран", "Full screen")}
                >
                  {isMax ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              )}
              {/* Close */}
              <button onClick={handleClose} className="p-1.5 hover:bg-white/20 rounded-lg text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMin && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-4 bg-gray-50">
                {messages.length === 0 && (
                  <div className="space-y-3">
                    {/* Welcome message */}
                    <div className="flex gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2.5 shadow-sm border border-gray-100 max-w-[85%]">
                        <MarkdownMessage
                          content={user?.name
                            ? (language === 'ru'
                              ? `Привет, **${user.name.split(' ')[0]}**! 👋\n\nЯ ваш AI-ассистент по психологии. Могу помочь с:\n- Терапевтическими техниками\n- Анализом подходов\n- Профессиональными вопросами\n\nЧем могу помочь?`
                              : `Hi, **${user.name.split(' ')[0]}**! 👋\n\nI am your psychology AI assistant. I can help with:\n- Therapeutic techniques\n- Approach analysis\n- Professional questions\n\nHow can I help you today?`)
                            : TR("Привет! 👋\n\nЯ AI-ассистент для психологов. Готов помочь с вопросами по терапевтическим техникам, методам работы и психологии в целом.", "Hello! 👋\n\nI am an AI assistant for psychologists. Ready to help with questions on therapeutic techniques, working methods and psychology in general.")
                          }
                        />
                        <div className="text-[10px] text-gray-400 mt-1">
                          {new Date().toLocaleTimeString(timeLocale, { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                    {/* Quick questions */}
                    <div className="ml-9">
                      <p className="text-xs text-gray-400 mb-2">{TR("Быстрые вопросы:", "Quick questions:")}</p>
                      <div className="space-y-1.5">
                        {QUICK_QUESTIONS.map((q, i) => (
                          <button key={i} onClick={() => send(q)}
                            className="block w-full text-left text-xs px-3 py-2 bg-white text-violet-700 rounded-xl border border-violet-100 hover:bg-violet-50 transition-colors">
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {messages.map(msg => (
                  <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white mt-0.5 ${
                      msg.role === 'user'
                        ? 'bg-indigo-500'
                        : 'bg-gradient-to-br from-violet-500 to-indigo-600'
                    }`}>
                      {msg.role === 'user' ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                    </div>
                    <div className={`max-w-[85%] rounded-2xl px-3 py-2.5 ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-tr-sm'
                        : 'bg-white text-gray-800 shadow-sm rounded-tl-sm border border-gray-100'
                    }`}>
                      <MarkdownMessage content={msg.content} isUser={msg.role === 'user'} />
                      <div className={`text-[10px] mt-1.5 ${msg.role === 'user' ? 'text-indigo-200 text-right' : 'text-gray-400'}`}>
                        {msg.ts.toLocaleTimeString(timeLocale, { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-gray-100 flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </div>

              {/* Input */}
              <div className="p-3 bg-white border-t border-gray-100 flex-shrink-0">
                <div className="flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder={TR("Спросите о психологии...", "Ask about psychology...")}
                    rows={1}
                    className="flex-1 resize-none px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    style={{ minHeight: '42px', maxHeight: '100px' }}
                    onInput={e => {
                      const t = e.target as HTMLTextAreaElement;
                      t.style.height = 'auto';
                      t.style.height = Math.min(t.scrollHeight, 100) + 'px';
                    }}
                  />
                  <button
                    onClick={() => send()}
                    disabled={!input.trim() || loading}
                    className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center disabled:opacity-40 hover:shadow-lg transition-all flex-shrink-0"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-gray-400 mt-1.5 text-center">
                  {TR("\n                  Enter — отправить · Shift+Enter — новая строка\n                ", "Enter - send Shift+Enter - new line")}</p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
