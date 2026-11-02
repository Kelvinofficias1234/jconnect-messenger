// Clock skew correction: syncs client time with server time so relative
// timestamps (e.g., "2 min ago") are accurate even when the user's device
// clock is wrong (common on laptops with incorrect timezone/time settings).
//
// On app load, a HEAD request to the app's own origin returns the server's
// Date header. The offset (serverTime - clientTime) is cached in localStorage
// so subsequent loads have a good estimate before the next sync completes.

let clockOffset = 0; // serverTime - clientTime in ms
let synced = false;

export async function syncServerClock() {
  try {
    const res = await fetch(window.location.origin, { method: 'HEAD', cache: 'no-store' });
    const serverDateStr = res.headers.get('Date');
    if (!serverDateStr) return;
    const serverTime = new Date(serverDateStr).getTime();
    const clientTime = Date.now();
    clockOffset = serverTime - clientTime;
    synced = true;
    try { localStorage.setItem('jconnect_clock_offset', String(clockOffset)); } catch {}
  } catch {
    // Fallback: use cached offset from a previous sync
    try { clockOffset = Number(localStorage.getItem('jconnect_clock_offset') || '0'); } catch {}
  }
}

/** Returns the server-corrected current time in milliseconds. */
export function getServerNowMs() {
  return Date.now() + clockOffset;
}

/** Returns the server-corrected current time as a Date object. */
export function getServerNow() {
  return new Date(getServerNowMs());
}

export function isClockSynced() {
  return synced;
}