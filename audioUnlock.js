// src/lib/audioUnlock.js
// iOS Safari blocks AudioContext output until a user gesture occurs.
// This module attaches a one-time touch/click listener that unlocks the audio
// context on the first interaction, so ringtones and notification sounds play
// reliably on iOS (and don't hurt other platforms).
//
// Append-only: safe to call multiple times — only unlocks once.

let unlocked = false;

function unlock() {
  if (unlocked) return;
  unlocked = true;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    // Play a silent oscillator to satisfy iOS's gesture requirement
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0; // completely silent
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.001);
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    setTimeout(() => { try { ctx.close(); } catch {} }, 200);
  } catch {}
}

/**
 * Attach one-time listeners that unlock Web Audio on the first user gesture.
 * Call once at app startup (e.g. in App.jsx).
 */
export function initAudioUnlock() {
  if (unlocked) return;
  if (typeof document === 'undefined') return;
  const events = ['touchstart', 'touchend', 'click', 'keydown'];
  const handler = () => {
    unlock();
    events.forEach(e => document.removeEventListener(e, handler));
  };
  events.forEach(e =>
    document.addEventListener(e, handler, { once: true, passive: true })
  );
}

/** Imperatively unlock (e.g. inside a call accept button handler). */
export function unlockAudioNow() {
  unlock();
}