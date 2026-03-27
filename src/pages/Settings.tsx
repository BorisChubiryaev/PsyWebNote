import { TR } from '../utils/tr';
import { useState } from 'react';
import Layout from '../components/Layout';
import { Bell, Moon, Sun, Clock, Volume2, VolumeX, Shield, Smartphone, Check, Globe } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { getNotificationSettings, saveNotificationSettings, NotificationSettings } from '../utils/notificationSettings';

export default function Settings() {
  const { toggleTheme, isDark } = useTheme();
  const { t, language, setLanguage } = useLanguage();
  const [settings, setSettings] = useState<NotificationSettings>(getNotificationSettings);
  const [saved, setSaved] = useState(false);

  const reminderOptions = [
    { value: 5,  label: `5 ${t('minutes')}` },
    { value: 10, label: `10 ${t('minutes')}` },
    { value: 15, label: `15 ${t('minutes')}` },
    { value: 30, label: `30 ${t('minutes')}` },
    { value: 60, label: `1 ${t('hours')}` },
  ];

  const update = (patch: Partial<NotificationSettings>) => {
    setSettings(prev => ({ ...prev, ...patch }));
  };

  const handleSave = () => {
    saveNotificationSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const requestPermission = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        update({ browserEnabled: true });
      }
    }
  };

  const notifPermission = 'Notification' in window ? Notification.permission : 'denied';

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">{t('settings_title')}</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{t('settings_subtitle')}</p>
        </div>

        {/* Language */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-5 h-5 text-indigo-500" />
            <h2 className="font-bold text-gray-900 dark:text-white">{t('language')}</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setLanguage('ru')}
              className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${language === 'ru' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'}`}
            >
              <span className="text-2xl">🇷🇺</span>
              <span className={`text-sm font-medium ${language === 'ru' ? 'text-indigo-700 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}>{TR("Русский", "Russian")}</span>
              {language === 'ru' && <Check className="w-4 h-4 text-indigo-600" />}
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${language === 'en' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'}`}
            >
              <span className="text-2xl">🇬🇧</span>
              <span className={`text-sm font-medium ${language === 'en' ? 'text-indigo-700 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}>English</span>
              {language === 'en' && <Check className="w-4 h-4 text-indigo-600" />}
            </button>
          </div>
        </div>

        {/* Appearance */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-3">
            {isDark ? <Moon className="w-5 h-5 text-indigo-400" /> : <Sun className="w-5 h-5 text-indigo-500" />}
            <h2 className="font-bold text-gray-900 dark:text-white">{t('appearance')}</h2>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <div>
              <p className="font-medium text-gray-900 dark:text-white text-sm">{t('dark_theme')}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {t('current_theme')}: <span className="font-semibold">{isDark ? t('theme_dark') : t('theme_light')}</span>
              </p>
            </div>
            <button
              onClick={toggleTheme}
              className={`relative w-12 h-6 rounded-full transition-colors ${isDark ? 'bg-indigo-500' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isDark ? 'translate-x-6' : ''}`} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => { if (isDark) toggleTheme(); }}
              className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${!isDark ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'}`}
            >
              <Sun className={`w-6 h-6 ${!isDark ? 'text-indigo-600' : 'text-gray-400'}`} />
              <span className={`text-sm font-medium ${!isDark ? 'text-indigo-700' : 'text-gray-500 dark:text-gray-400'}`}>{t('theme_light')}</span>
              {!isDark && <Check className="w-4 h-4 text-indigo-600" />}
            </button>
            <button
              onClick={() => { if (!isDark) toggleTheme(); }}
              className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${isDark ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'}`}
            >
              <Moon className={`w-6 h-6 ${isDark ? 'text-indigo-400' : 'text-gray-400'}`} />
              <span className={`text-sm font-medium ${isDark ? 'text-indigo-400' : 'text-gray-500'}`}>{t('theme_dark')}</span>
              {isDark && <Check className="w-4 h-4 text-indigo-400" />}
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-5 h-5 text-indigo-500" />
            <h2 className="font-bold text-gray-900 dark:text-white">{t('notifications')}</h2>
          </div>

          {/* Reminder time */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-gray-500" />
              <p className="font-medium text-gray-900 dark:text-white text-sm">{t('reminder_time')}</p>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {reminderOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => update({ reminderMinutes: opt.value })}
                  className={`py-2 px-1 rounded-lg text-xs font-semibold transition-all ${
                    settings.reminderMinutes === opt.value
                      ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30'
                      : 'bg-white dark:bg-gray-600 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-500 hover:border-indigo-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Browser notifications */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <div>
              <p className="font-medium text-gray-900 dark:text-white text-sm">{t('browser_notifications')}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {notifPermission === 'granted'
                  ? `✅ ${t('permission_granted')}`
                  : notifPermission === 'denied'
                  ? `❌ ${t('permission_denied')}`
                  : `⚠️ ${t('request_permission')}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {notifPermission === 'default' && (
                <button onClick={requestPermission} className="text-xs px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-lg font-medium">
                  {t('enable_notifications')}
                </button>
              )}
              <button
                onClick={() => update({ browserEnabled: !settings.browserEnabled })}
                disabled={notifPermission !== 'granted'}
                className={`relative w-12 h-6 rounded-full transition-colors disabled:opacity-40 ${settings.browserEnabled && notifPermission === 'granted' ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'}`}
              >
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.browserEnabled && notifPermission === 'granted' ? 'translate-x-6' : ''}`} />
              </button>
            </div>
          </div>

          {/* Sound */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <div className="flex items-center gap-2">
              {settings.soundEnabled ? <Volume2 className="w-4 h-4 text-gray-500" /> : <VolumeX className="w-4 h-4 text-gray-400" />}
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">{t('sound')}</p>
              </div>
            </div>
            <button
              onClick={() => update({ soundEnabled: !settings.soundEnabled })}
              className={`relative w-12 h-6 rounded-full transition-colors ${settings.soundEnabled ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${settings.soundEnabled ? 'translate-x-6' : ''}`} />
            </button>
          </div>
        </div>

        {/* PWA */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Smartphone className="w-5 h-5 text-indigo-500" />
            <h2 className="font-bold text-gray-900 dark:text-white">{t('pwa_title')}</h2>
          </div>
          <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
            <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-300 mb-2">📱 iPhone / iPad</p>
            {language === 'ru' ? (
              <ol className="text-xs text-indigo-700 dark:text-indigo-400 space-y-1 list-decimal ml-4">
                <li>{TR("Откройте сайт в браузере Safari", "Open the site in Safari browser")}</li>
                <li>{TR("Нажмите кнопку ", "Click the button")}<strong>{TR("Поделиться", "Share")}</strong> {TR(" (квадрат со стрелкой вверх)", "(square with up arrow)")}</li>
                <li>{TR("Выберите ", "Select")}<strong>{TR("«На экран «Домой»»", "\"To Home Screen\"")}</strong></li>
                <li>{TR("Нажмите ", "Click")}<strong>{TR("«Добавить»", "\"Add\"")}</strong></li>
              </ol>
            ) : (
              <ol className="text-xs text-indigo-700 dark:text-indigo-400 space-y-1 list-decimal ml-4">
                <li>Open the site in Safari browser</li>
                <li>Tap the <strong>Share</strong> button (square with arrow up)</li>
                <li>Select <strong>"Add to Home Screen"</strong></li>
                <li>Tap <strong>"Add"</strong></li>
              </ol>
            )}
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600 mt-3">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">🤖 Android / Desktop Chrome</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {language === 'ru'
                ? TR("Нажмите на значок установки в адресной строке браузера или выберите «Установить приложение» в меню браузера.", "Click the install icon in your browser's address bar or select \"Install App\" from your browser menu.")
                : 'Click the install icon in the browser address bar or select "Install app" from the browser menu.'}
            </p>
          </div>
        </div>

        {/* Security */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-indigo-500" />
            <h2 className="font-bold text-gray-900 dark:text-white">{language === 'ru' ? TR("Безопасность", "Safety") : 'Security'}</h2>
          </div>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            {(language === 'ru' ? [
              TR("Данные изолированы по аккаунту (Row Level Security)", "Data isolated by account (Row Level Security)"),
              TR("Пароли зашифрованы (bcrypt / PBKDF2)", "Passwords are encrypted (bcrypt/PBKDF2)"),
              TR("Соединение защищено (HTTPS / TLS)", "Connection is secure (HTTPS/TLS)"),
              TR("AI-запросы не сохраняются на сторонних серверах", "AI requests are not saved on third-party servers"),
            ] : [
              'Data is isolated per account (Row Level Security)',
              'Passwords are encrypted (bcrypt / PBKDF2)',
              'Connection is secured (HTTPS / TLS)',
              'AI requests are not stored on third-party servers',
            ]).map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400" />
                {item}
              </div>
            ))}
          </div>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          className={`w-full py-3 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
            saved
              ? 'bg-green-500 text-white'
              : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg hover:shadow-indigo-500/30'
          }`}
        >
          {saved ? <><Check className="w-4 h-4" /> {t('settings_saved')}</> : t('save_settings')}
        </button>
      </div>
    </Layout>
  );
}
