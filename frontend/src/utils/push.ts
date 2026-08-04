export async function initPushNotifications(authToken: string | null) {
  if (!authToken) {
    console.log('[Push] User not authenticated. Skipping registration.');
    return;
  }

  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      console.log('[Push] Web Notifications already granted.');
    } else if (Notification.permission !== 'denied') {
      const perm = await Notification.requestPermission();
      console.log('[Push] Web Notification permission request result:', perm);
    }
  } else {
    console.log('[Push] Web notifications not supported on this browser.');
  }
}
