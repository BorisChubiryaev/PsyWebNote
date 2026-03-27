export function TR(ru: string, en: string) {
  const lang = typeof window !== 'undefined' ? localStorage.getItem('psywebnote_language') || navigator.language.slice(0, 2) : 'ru';
  return lang === 'en' ? en : ru;
}
