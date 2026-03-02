export interface NotificationSettings {
  enabled: boolean;
  browserEnabled: boolean;
  reminderMinutes: number; // minutes before session
  soundEnabled: boolean;
}

const KEY = 'psywebnote_notification_settings';

export function getNotificationSettings(): NotificationSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...defaultSettings(), ...JSON.parse(raw) };
  } catch {}
  return defaultSettings();
}

export function saveNotificationSettings(s: NotificationSettings) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

function defaultSettings(): NotificationSettings {
  return {
    enabled: true,
    browserEnabled: true,
    reminderMinutes: 15,
    soundEnabled: false,
  };
}
