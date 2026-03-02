import { useState } from 'react';
import Layout from '../components/Layout';
import { Bell, Moon, Sun, Clock, Volume2, VolumeX, Shield, Smartphone, Check } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { getNotificationSettings, saveNotificationSettings, NotificationSettings } from '../utils/notificationSettings';

const REMINDER_OPTIONS = [
  { value: 5, label: '5 минут' },
  { value: 10, label: '10 минут' },
  { value: 15, label: '15 минут' },
  { value: 30, label: '30 минут' },
  { value: 60, label: '1 час' },
];

export default function Settings() {
  const { toggleTheme, isDark } = useTheme();
  const [settings, setSettings] = useState<NotificationSettings>(getNotificationSettings);
  const [saved, setSaved] = useState(false);

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
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">Настройки</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Персонализация приложения</p>
        </div>

        {/* Appearance */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-3">
            {isDark ? <Moon className="w-5 h-5 text-indigo-400" /> : <Sun className="w-5 h-5 text-indigo-500" />}
            <h2 className="font-bold text-gray-900 dark:text-white">Внешний вид</h2>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <div>
              <p className="font-medium text-gray-900 dark:text-white text-sm">Тёмная тема</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Текущая тема: <span className="font-semibold">{isDark ? 'Тёмная' : 'Светлая'}</span>
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
              <span className={`text-sm font-medium ${!isDark ? 'text-indigo-700' : 'text-gray-500 dark:text-gray-400'}`}>Светлая</span>
              {!isDark && <Check className="w-4 h-4 text-indigo-600" />}
            </button>
            <button
              onClick={() => { if (!isDark) toggleTheme(); }}
              className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${isDark ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'}`}
            >
              <Moon className={`w-6 h-6 ${isDark ? 'text-indigo-400' : 'text-gray-400'}`} />
              <span className={`text-sm font-medium ${isDark ? 'text-indigo-400' : 'text-gray-500'}`}>Тёмная</span>
              {isDark && <Check className="w-4 h-4 text-indigo-400" />}
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-5 h-5 text-indigo-500" />
            <h2 className="font-bold text-gray-900 dark:text-white">Уведомления</h2>
          </div>

          {/* Reminder time */}
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-gray-500" />
              <p className="font-medium text-gray-900 dark:text-white text-sm">Напомнить до начала сессии</p>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {REMINDER_OPTIONS.map(opt => (
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
              <p className="font-medium text-gray-900 dark:text-white text-sm">Браузерные уведомления</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {notifPermission === 'granted'
                  ? '✅ Разрешены браузером'
                  : notifPermission === 'denied'
                  ? '❌ Заблокированы в браузере'
                  : '⚠️ Требуется разрешение'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {notifPermission === 'default' && (
                <button onClick={requestPermission} className="text-xs px-3 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-lg font-medium">
                  Разрешить
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
                <p className="font-medium text-gray-900 dark:text-white text-sm">Звук уведомлений</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Воспроизводить звук при уведомлении</p>
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
            <h2 className="font-bold text-gray-900 dark:text-white">Установка на устройство</h2>
          </div>
          <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800">
            <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-300 mb-2">📱 Добавить на iPhone / iPad</p>
            <ol className="text-xs text-indigo-700 dark:text-indigo-400 space-y-1 list-decimal ml-4">
              <li>Откройте сайт в браузере Safari</li>
              <li>Нажмите кнопку <strong>Поделиться</strong> (квадрат со стрелкой вверх)</li>
              <li>Выберите <strong>«На экран «Домой»»</strong></li>
              <li>Нажмите <strong>«Добавить»</strong></li>
            </ol>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-3">После установки приложение будет работать без адресной строки, как нативное.</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600 mt-3">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">🤖 Android / Desktop Chrome</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Нажмите на значок <strong>установки</strong> в адресной строке браузера или выберите <strong>«Установить приложение»</strong> в меню браузера.</p>
          </div>
        </div>

        {/* Security */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-indigo-500" />
            <h2 className="font-bold text-gray-900 dark:text-white">Безопасность</h2>
          </div>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              Данные изолированы по аккаунту (Row Level Security)
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              Пароли зашифрованы (bcrypt / PBKDF2)
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              Соединение защищено (HTTPS / TLS)
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              AI-запросы не сохраняются на сторонних серверах
            </div>
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
          {saved ? <><Check className="w-4 h-4" /> Настройки сохранены!</> : 'Сохранить настройки'}
        </button>
      </div>
    </Layout>
  );
}
