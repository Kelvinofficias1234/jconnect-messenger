// All timestamps are displayed in Africa/Kigali (UTC+2, CAT) timezone
// to ensure consistent time tracking regardless of the device's system timezone.
const TZ = 'Africa/Kigali';

import { getServerNowMs } from './serverClock';

/** Format a timestamp as "h:mm AM/PM" in Kigali time. */
export function formatTime(date) {
  if (!date) return '';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(date));
}

/**
 * Conversation-list time: "h:mm AM/PM" today, "Yesterday", weekday name
 * within the last week, or "M/D/YY" otherwise — all in Kigali time.
 */
export function formatConversationTime(date) {
  if (!date) return '';
  const now = new Date();
  const d = new Date(date);

  const dateOpts = { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' };
  const nowStr = new Intl.DateTimeFormat('en-US', dateOpts).format(now);
  const dStr = new Intl.DateTimeFormat('en-US', dateOpts).format(d);

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = new Intl.DateTimeFormat('en-US', dateOpts).format(yesterday);

  if (dStr === nowStr) return formatTime(date);
  if (dStr === yStr) return 'Yesterday';

  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays < 7) {
    return new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short' }).format(d);
  }
  return new Intl.DateTimeFormat('en-US', { timeZone: TZ, month: 'numeric', day: '2-digit', year: '2-digit' }).format(d);
}

/** Date divider: "Today", "Yesterday", or "MMMM D, YYYY" in Kigali time. */
export function formatDateDivider(date) {
  if (!date) return '';
  const now = new Date();
  const d = new Date(date);

  const dateOpts = { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' };
  const nowStr = new Intl.DateTimeFormat('en-US', dateOpts).format(now);
  const dStr = new Intl.DateTimeFormat('en-US', dateOpts).format(d);

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = new Intl.DateTimeFormat('en-US', dateOpts).format(yesterday);

  if (dStr === nowStr) return 'Today';
  if (dStr === yStr) return 'Yesterday';
  return new Intl.DateTimeFormat('en-US', { timeZone: TZ, month: 'long', day: 'numeric', year: 'numeric' }).format(d);
}

/** Returns the date key (YYYY-MM-DD) in Kigali time, for grouping messages by day. */
export function getDateKey(date) {
  if (!date) return '';
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(date));
}

// WhatsApp-style status relative time: POSTED NOW → X min ago → X hours ago (max 23h).
// Stories past 24h are auto-deleted by StatusTab, so this only needs < 24h.
// Relative differences are timezone-independent (both points are absolute), so
// this is correct regardless of the viewer's device timezone.
export function formatStoryTime(date) {
  if (!date) return '';
  const then = new Date(date);
  // Use the client's local clock directly — both then and now are UTC-based
  // (Date.now() returns epoch ms in UTC, new Date(date).getTime() parses the
  // UTC ISO string to epoch ms). Their difference is timezone-independent,
  // so no hardcoded offset or server-clock sync is needed.
  const now = Date.now();
  const diffMs = now - then.getTime();
  if (diffMs < 0) return 'Just now'; // clock skew safety
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  if (diffSeconds < 60) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return '23h ago';
}

// WhatsApp-style relative time that only shows "a day ago" after a full 24h.
export function formatRelativeTime(date) {
  if (!date) return '';
  const then = new Date(date);
  const now = new Date();

  const diffMs = now.getTime() - then.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffSeconds < 60) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 2) return 'a day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  return new Intl.DateTimeFormat('en-US', { timeZone: TZ, month: 'short', day: 'numeric' }).format(then);
}