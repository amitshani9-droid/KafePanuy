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

/**
 * Shows a system notification when allowed. Prefers the service worker (required on
 * Android, and tapping it opens `url`); falls back to a page notification.
 * Returns false if nothing could be shown.
 */
export async function showSystemNotification(title: string, body: string, url = '/'): Promise<boolean> {
  if (!('Notification' in window) || Notification.permission !== 'granted') return false
  const options: NotificationOptions = { body, icon: '/icon-192.png', badge: '/icon-192.png', lang: 'he', dir: 'rtl', data: { url } }
  try {
    const registration = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined
    if (registration) {
      await registration.showNotification(title, options)
      return true
    }
    new Notification(title, options)
    return true
  } catch {
    return false
  }
}
