// Web Notifications boundary for task reminders.
//
// Deliberately uses ONLY the in-tab Notifications API (no Service Worker / Push):
// those need https + SW registration, which the single-file `file://` build can't
// do. So reminders fire while the app tab is open — which works identically in the
// served build AND the single-file build. The "notifications enabled" preference
// lives in its OWN localStorage key (like the theme / vim prefs), never in the
// persisted Zustand blob.

import { storage } from '@/lib/storage';

const ENABLED_KEY = 'todokan:notifications-enabled';

export type PermissionState = NotificationPermission | 'unsupported';

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function notificationPermission(): PermissionState {
  return notificationsSupported() ? Notification.permission : 'unsupported';
}

/** User toggle — defaults ON (the browser permission is the real gate). */
export function notificationsEnabled(): boolean {
  return storage.getItem(ENABLED_KEY) !== '0';
}

export function setNotificationsEnabled(value: boolean): void {
  storage.setItem(ENABLED_KEY, value ? '1' : '0');
}

export async function requestNotificationPermission(): Promise<PermissionState> {
  if (!notificationsSupported()) return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    // Some old engines only support the callback form; fall back to the current state.
    return Notification.permission;
  }
}

/** All gates that must pass before a reminder can actually be shown. */
export function canFireNotifications(): boolean {
  return (
    notificationsSupported() &&
    Notification.permission === 'granted' &&
    notificationsEnabled()
  );
}

export interface FireOptions extends NotificationOptions {
  onClick?: () => void;
}

/** Fire a system notification (no-op + null when not permitted). */
export function fireNotification(
  title: string,
  options: FireOptions = {},
): Notification | null {
  if (!canFireNotifications()) return null;
  try {
    const { onClick, ...rest } = options;
    const n = new Notification(title, rest);
    if (onClick) {
      n.onclick = () => {
        window.focus();
        onClick();
        n.close();
      };
    }
    return n;
  } catch {
    return null;
  }
}
