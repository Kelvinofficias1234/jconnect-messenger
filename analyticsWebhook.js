// ── Fillout Analytics Webhook ──────────────────────────────────────────────
// Fires non-blocking HTTP POST events to the Fillout workflow webhook.
// All calls are fire-and-forget (never await, never block app startup or UX).
// mode:'no-cors' + text/plain avoids CORS preflight so the request always
// reaches the server regardless of Fillout's CORS headers.

const WEBHOOK_URL =
  'https://workflows.fillout.com/public/siq4ncasbd/webhooks/appWebhook/e_hotb7ZJs4jipL3s2b5m0E8mnPxz6OC';

const APP_VERSION = '1.0.0';

/** Detect iOS / Android from the user agent (falls back to 'Web' for desktop browsers). */
function getPlatform() {
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document)) return 'iOS';
  if (/Android/.test(ua)) return 'Android';
  return 'Web';
}

/** Stable per-device identifier persisted in localStorage. */
function getDeviceId() {
  try {
    let id = localStorage.getItem('jconnect_device_id');
    if (!id) {
      id = 'dev_' + (crypto.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2));
      localStorage.setItem('jconnect_device_id', id);
    }
    return id;
  } catch {
    return 'dev_unknown';
  }
}

/**
 * Core tracker — sends an event to the Fillout webhook.
 * Always non-blocking: uses keepalive + no-cors, swallows all errors.
 */
export function trackEvent(event_type, extra = {}) {
  const payload = {
    event_type,
    platform: getPlatform(),
    timestamp: new Date().toISOString(),
    user_id: extra.user_id || getDeviceId(),
    app_version: APP_VERSION,
    ...extra,
  };
  try {
    fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload),
      keepalive: true,
      mode: 'no-cors',
    }).catch(() => {});
  } catch {}
}

/** Fire once on the very first app visit (download/install equivalent). */
export function trackAppDownload(userId) {
  try {
    if (localStorage.getItem('jconnect_download_tracked')) return;
    localStorage.setItem('jconnect_download_tracked', '1');
    trackEvent('app_download', userId ? { user_id: userId } : {});
  } catch {
    trackEvent('app_download', userId ? { user_id: userId } : {});
  }
}

/** Fire on every app open / session start. */
export function trackFirstOpen(userId) {
  trackEvent('first_open', userId ? { user_id: userId } : {});
}

/** Fire on meaningful user interactions (navigation, registration, etc.). */
export function trackInteraction(action, userId) {
  trackEvent('app_interaction', { action, ...(userId ? { user_id: userId } : {}) });
}