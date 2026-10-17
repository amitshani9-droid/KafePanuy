/** Asks for system-notification permission (must run from a click). */
export async function ensureNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!('Notification' in window)) return 'unsupported'
  if (Notification.permission !== 'default') return Notification.permission
  try {
    return await Notification.requestPermission()
  } catch {
    return 'denied'
  }
}

/** Shows a system notification when allowed; returns false if it couldn't. */
export function showSystemNotification(title: string, body: string): boolean {
  if (!('Notification' in window) || Notification.permission !== 'granted') return false
  try {
    new Notification(title, { body, icon: '/icon-192.png', lang: 'he', dir: 'rtl' })
    return true
  } catch {
    // e.g. Android Chrome only allows notifications from a service worker
    return false
  }
}
