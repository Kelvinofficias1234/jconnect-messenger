// src/lib/notificationManager.js
// Browser Notification API manager — shows native OS notifications when the
// app is backgrounded or closed, so incoming calls and chat messages alert the
// user instantly even if they aren't looking at the tab.
//
// Append-only: does not modify any existing notification/sound logic.
// Works alongside playNotificationSound (which handles in-tab audio alerts).

let permissionRequested = false;

/** Request browser notification permission (call once on app load). */
export async function initNotifications() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default' && !permissionRequested) {
    permissionRequested = true;
    try {
      await Notification.requestPermission();
    } catch {}
  }
}

/** True if the app tab is NOT visible to the user right now. */
export function isAppBackgrounded() {
  return typeof document !== 'undefined' && document.visibilityState !== 'visible';
}

/**
 * Show a native OS notification if the app is backgrounded and permission granted.
 * Returns true if a notification was actually shown.
 */
export function showBackgroundNotification(title, body, options = {}) {
  try {
    if (!('Notification' in window)) return false;
    if (Notification.permission !== 'granted') return false;
    if (!isAppBackgrounded()) return false; // Don't spam when user is in the app

    const n = new Notification(title, {
      body: body || '',
      icon: options.icon || '/favicon.ico',
      badge: options.badge || '/favicon.ico',
      tag: options.tag || 'j-connect-message',
      renotify: options.renotify || false,
      silent: options.silent || false,
      data: options.data || {}
    });

    n.onclick = () => {
      try { window.focus(); } catch {}
      n.close();
    };

    // Auto-close after 6 seconds so stale notifications don't pile up
    setTimeout(() => { try { n.close(); } catch {} }, 6000);
    return true;
  } catch {
    return false;
  }
}

/** Convenience: fire a chat message notification (title + preview). */
export function notifyChatMessage(senderName, preview) {
  return showBackgroundNotification(
    `J-Connect · ${senderName || 'New message'}`,
    preview || 'You have a new message',
    { tag: 'j-connect-message', renotify: true }
  );
}

/** Convenience: fire an incoming call notification. */
export function notifyIncomingCall(callerName, callType) {
  return showBackgroundNotification(
    `Incoming ${callType || 'voice'} call`,
    `${callerName || 'Someone'} is calling you on J-Connect`,
    { tag: 'j-connect-call', renotify: true }
  );
}