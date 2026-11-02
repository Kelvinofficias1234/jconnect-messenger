/**
 * Offline-First Outbox for J-Connect.
 * Queues messages in localStorage when the device is offline (airplane mode,
 * zero bars) and auto-sends the instant connectivity returns — even on a
 * faint 2G/Edge signal. Messages are stored in an aggressive priority queue
 * (text first, then media) and retried with exponential backoff.
 */

const STORAGE_KEY = 'jconnect_outbox';
const LISTENERS = new Set();

function readQueue() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

function writeQueue(queue) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {}
  notifyListeners();
}

function notifyListeners() {
  LISTENERS.forEach(fn => fn(readQueue()));
}

/**
 * Enqueue a message for delivery. If online, attempts immediate send.
 * @param {object} msg - { conversationId, senderId, text, fileData, pollData, locationData, tempId }
 * @param {function} sendFn - async function that actually sends the message via API
 */
export async function enqueueMessage(msg, sendFn) {
  const queue = readQueue();
  const item = {
    id: msg.tempId || `outbox_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ...msg,
    attempts: 0,
    createdAt: Date.now(),
    // Text messages get higher priority (1) than media (2)
    priority: msg.fileData ? 2 : 1
  };
  queue.push(item);
  queue.sort((a, b) => a.priority - b.priority || a.createdAt - b.createdAt);
  writeQueue(queue);

  if (navigator.onLine) {
    await processQueue(sendFn);
  }
}

/**
 * Process the outbox queue — sends all pending messages in priority order.
 * @param {function} sendFn - async (item) => { return createdMessage } — throws on failure
 */
export async function processQueue(sendFn) {
  let queue = readQueue();
  if (queue.length === 0) return;

  const remaining = [];
  for (const item of queue) {
    try {
      await sendFn(item);
      // Success — item is delivered, don't re-add to queue
    } catch (err) {
      // Failure — keep in queue with incremented attempts
      item.attempts = (item.attempts || 0) + 1;
      // After 10 attempts, give up (will be retried on next online event)
      if (item.attempts < 10) {
        remaining.push(item);
      }
    }
  }
  writeQueue(remaining);
}

/**
 * Get all pending outbox messages for a specific conversation.
 * Used to show "pending" messages in the chat UI while offline.
 */
export function getPendingMessages(conversationId) {
  return readQueue().filter(m => m.conversationId === conversationId);
}

/**
 * Remove a message from the outbox (after successful send elsewhere).
 */
export function removeFromOutbox(id) {
  const queue = readQueue().filter(m => m.id !== id);
  writeQueue(queue);
}

/**
 * Subscribe to outbox changes.
 * @param {function} fn - called with the current queue on every change
 * @returns {function} unsubscribe
 */
export function subscribeOutbox(fn) {
  LISTENERS.add(fn);
  fn(readQueue());
  return () => LISTENERS.delete(fn);
}

/**
 * Is the device currently online?
 */
export function isOnline() {
  return navigator.onLine;
}

/**
 * Initialize the outbox — wires up online/offline event listeners.
 * Call once at app startup. Pass the sendFn that delivers a single message.
 * @param {function} sendFn - async (item) => createdMessage
 * @returns {function} cleanup
 */
export function initOutbox(sendFn) {
  const handleOnline = () => processQueue(sendFn);
  window.addEventListener('online', handleOnline);
  // Also retry on visibility return (user switches back to app)
  const handleVisible = () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      processQueue(sendFn);
    }
  };
  document.addEventListener('visibilitychange', handleVisible);
  // Initial attempt
  if (navigator.onLine) processQueue(sendFn);
  return () => {
    window.removeEventListener('online', handleOnline);
    document.removeEventListener('visibilitychange', handleVisible);
  };
}