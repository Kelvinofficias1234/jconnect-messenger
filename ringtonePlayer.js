// ── Premium Ringtone & Notification Player ─────────────────────────────────
// 10 studio-quality call ringtones + 10 notification sounds, synthesized via
// Web Audio API with a compressor chain for loud, clear, zero-latency playback.
// AudioContext is kept alive (never closed) for instant playback on demand.
// Preferences are cached in localStorage for zero-latency access before profile loads.

let audioCtx = null;
let compressor = null;
let masterGain = null;
let loopTimer = null;
let stopToken = 0;
let activeOscillators = [];

// ── 10 Premium Call Ringtones (loop while ringing) ─────────────────────────
const RINGTONES = [
  {
    id: 'pulse_chime',
    name: 'Pulse Chime',
    notes: [
      { freq: 880, dur: 0.15, type: 'sine', gap: 0.05, vol: 0.38 },
      { freq: 1108, dur: 0.15, type: 'sine', gap: 0.05, vol: 0.38 },
      { freq: 880, dur: 0.15, type: 'sine', gap: 0.05, vol: 0.38 },
      { freq: 1318, dur: 0.55, type: 'sine', gap: 0, vol: 0.38 },
      { rest: true, dur: 1.0 }
    ]
  },
  {
    id: 'echo_wave',
    name: 'Echo Wave',
    notes: [
      { freq: 523, dur: 0.2, type: 'sine', gap: 0.03, vol: 0.35 },
      { freq: 659, dur: 0.2, type: 'sine', gap: 0.03, vol: 0.35 },
      { freq: 784, dur: 0.2, type: 'sine', gap: 0.03, vol: 0.35 },
      { freq: 1047, dur: 0.4, type: 'sine', gap: 0.03, vol: 0.35 },
      { freq: 784, dur: 0.2, type: 'sine', gap: 0.03, vol: 0.28 },
      { freq: 1047, dur: 0.5, type: 'sine', gap: 0, vol: 0.35 },
      { rest: true, dur: 0.7 }
    ]
  },
  {
    id: 'j_connect_call',
    name: 'J-Connect Call',
    notes: [
      { freq: 659, dur: 0.18, type: 'sine', gap: 0.04, vol: 0.4 },
      { freq: 784, dur: 0.18, type: 'sine', gap: 0.04, vol: 0.4 },
      { freq: 988, dur: 0.18, type: 'sine', gap: 0.04, vol: 0.4 },
      { freq: 1319, dur: 0.6, type: 'sine', gap: 0, vol: 0.4 },
      { rest: true, dur: 0.8 }
    ]
  },
  {
    id: 'velvet_bell',
    name: 'Velvet Bell',
    notes: [
      { freq: 440, dur: 0.5, type: 'sine', gap: 0.1, vol: 0.35 },
      { freq: 554, dur: 0.5, type: 'sine', gap: 0.1, vol: 0.35 },
      { freq: 659, dur: 0.7, type: 'sine', gap: 0, vol: 0.35 },
      { rest: true, dur: 0.8 }
    ]
  },
  {
    id: 'cosmic_ring',
    name: 'Cosmic Ring',
    notes: [
      { freq: 392, dur: 0.3, type: 'sine', gap: 0.05, vol: 0.32 },
      { freq: 523, dur: 0.3, type: 'sine', gap: 0.05, vol: 0.32 },
      { freq: 659, dur: 0.3, type: 'sine', gap: 0.05, vol: 0.32 },
      { freq: 880, dur: 0.6, type: 'sine', gap: 0, vol: 0.32 },
      { rest: true, dur: 0.8 }
    ]
  },
  {
    id: 'minimalist_tone',
    name: 'Minimalist Tone',
    notes: [
      { freq: 880, dur: 0.3, type: 'sine', gap: 0.1, vol: 0.4 },
      { freq: 880, dur: 0.3, type: 'sine', gap: 0.1, vol: 0.4 },
      { freq: 1100, dur: 0.5, type: 'sine', gap: 0, vol: 0.4 },
      { rest: true, dur: 1.0 }
    ]
  },
  {
    id: 'neon_ring',
    name: 'Neon Ring',
    notes: [
      { freq: 740, dur: 0.15, type: 'triangle', gap: 0.04, vol: 0.35 },
      { freq: 988, dur: 0.15, type: 'triangle', gap: 0.04, vol: 0.35 },
      { freq: 1319, dur: 0.4, type: 'triangle', gap: 0.04, vol: 0.35 },
      { freq: 988, dur: 0.15, type: 'triangle', gap: 0.04, vol: 0.35 },
      { freq: 1319, dur: 0.5, type: 'triangle', gap: 0, vol: 0.35 },
      { rest: true, dur: 0.7 }
    ]
  },
  {
    id: 'acoustic_drift',
    name: 'Acoustic Drift',
    notes: [
      { freq: 349, dur: 0.35, type: 'sine', gap: 0.06, vol: 0.35 },
      { freq: 440, dur: 0.35, type: 'sine', gap: 0.06, vol: 0.35 },
      { freq: 523, dur: 0.35, type: 'sine', gap: 0.06, vol: 0.35 },
      { freq: 698, dur: 0.6, type: 'sine', gap: 0, vol: 0.35 },
      { rest: true, dur: 0.7 }
    ]
  },
  {
    id: 'digital_harmony',
    name: 'Digital Harmony',
    notes: [
      { freq: 659, dur: 0.2, type: 'sine', gap: 0.03, vol: 0.35 },
      { freq: 880, dur: 0.2, type: 'sine', gap: 0.03, vol: 0.35 },
      { freq: 659, dur: 0.2, type: 'sine', gap: 0.03, vol: 0.35 },
      { freq: 880, dur: 0.2, type: 'sine', gap: 0.03, vol: 0.35 },
      { freq: 1047, dur: 0.5, type: 'sine', gap: 0, vol: 0.35 },
      { rest: true, dur: 0.8 }
    ]
  },
  {
    id: 'crystal_chime',
    name: 'Crystal Chime',
    notes: [
      { freq: 1568, dur: 0.15, type: 'sine', gap: 0.03, vol: 0.32 },
      { freq: 2093, dur: 0.15, type: 'sine', gap: 0.03, vol: 0.32 },
      { freq: 2637, dur: 0.5, type: 'sine', gap: 0, vol: 0.32 },
      { rest: true, dur: 1.0 }
    ]
  }
];

// ── 10 Premium Notification Sounds (play once) ──────────────────────────────
const NOTIFICATIONS = [
  { id: 'nt_pulse',     name: 'Pulse Chime',    notes: [{ freq: 880, dur: 0.1, type: 'sine', gap: 0, vol: 0.4 }, { freq: 1108, dur: 0.15, type: 'sine', gap: 0, vol: 0.4 }] },
  { id: 'nt_echo',      name: 'Echo Wave',      notes: [{ freq: 659, dur: 0.08, type: 'sine', gap: 0, vol: 0.35 }, { freq: 988, dur: 0.15, type: 'sine', gap: 0, vol: 0.35 }] },
  { id: 'nt_jpop',      name: 'J-Connect Pop',  notes: [{ freq: 784, dur: 0.08, type: 'sine', gap: 0, vol: 0.4 }, { freq: 1047, dur: 0.15, type: 'sine', gap: 0, vol: 0.4 }] },
  { id: 'nt_velvet',    name: 'Velvet Ping',    notes: [{ freq: 554, dur: 0.12, type: 'sine', gap: 0, vol: 0.35 }, { freq: 659, dur: 0.18, type: 'sine', gap: 0, vol: 0.35 }] },
  { id: 'nt_cosmic',    name: 'Cosmic Bell',    notes: [{ freq: 880, dur: 0.1, type: 'sine', gap: 0, vol: 0.32 }, { freq: 1318, dur: 0.2, type: 'sine', gap: 0, vol: 0.32 }] },
  { id: 'nt_minimalist',name: 'Minimalist Ping',notes: [{ freq: 1047, dur: 0.12, type: 'sine', gap: 0, vol: 0.4 }] },
  { id: 'nt_neon',      name: 'Neon Pop',       notes: [{ freq: 988, dur: 0.08, type: 'sine', gap: 0, vol: 0.38 }, { freq: 1319, dur: 0.15, type: 'sine', gap: 0, vol: 0.38 }] },
  { id: 'nt_acoustic',  name: 'Acoustic Tap',   notes: [{ freq: 523, dur: 0.1, type: 'sine', gap: 0, vol: 0.35 }, { freq: 659, dur: 0.15, type: 'sine', gap: 0, vol: 0.35 }] },
  { id: 'nt_digital',   name: 'Digital Note',   notes: [{ freq: 659, dur: 0.08, type: 'sine', gap: 0, vol: 0.35 }, { freq: 880, dur: 0.08, type: 'sine', gap: 0, vol: 0.35 }, { freq: 1047, dur: 0.15, type: 'sine', gap: 0, vol: 0.35 }] },
  { id: 'nt_crystal',   name: 'Crystal Ping',   notes: [{ freq: 2093, dur: 0.15, type: 'sine', gap: 0, vol: 0.32 }] },
];

// ── Local Storage persistence for instant access ───────────────────────────
export function saveRingtonePreference(id) {
  try { localStorage.setItem('jconnect_ringtone', id); } catch {}
}
export function getSavedRingtone() {
  try { return localStorage.getItem('jconnect_ringtone') || 'j_connect_call'; } catch { return 'j_connect_call'; }
}
export function saveNotifPreference(id) {
  try { localStorage.setItem('jconnect_notif_sound', id); } catch {}
}
export function getSavedNotif() {
  try { return localStorage.getItem('jconnect_notif_sound') || 'nt_pulse'; } catch { return 'nt_pulse'; }
}

// ── Audio engine: compressor chain for loud, clean, zero-latency playback ──
function getCtx() {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Recreate compressor if it was disconnected by stopRingtone
  if (!compressor) {
    compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.value = -10;
    compressor.knee.value = 10;
    compressor.ratio.value = 4;
    compressor.attack.value = 0.003;
    compressor.release.value = 0.1;
    compressor.connect(audioCtx.destination);
  }
  // Recreate master gain if it was disconnected by stopRingtone
  if (!masterGain) {
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 1;
    masterGain.connect(compressor);
  }
  return audioCtx;
}

function getMelodyDuration(notes) {
  return notes.reduce((sum, n) => sum + n.dur + (n.gap || 0), 0);
}

function scheduleMelody(notes, startTime) {
  const ctx = getCtx();
  let t = startTime;
  notes.forEach(note => {
    if (note.rest) { t += note.dur; return; }
    const freqs = note.freqs || [note.freq];
    freqs.forEach(freq => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = note.type || 'sine';
      osc.frequency.value = freq;
      osc.connect(gain);
      gain.connect(masterGain);
      const vol = note.vol || 0.35;
      // ADSR envelope for clean, punchy sound
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(vol, t + 0.01);
      gain.gain.setValueAtTime(vol, t + note.dur - 0.04);
      gain.gain.linearRampToValueAtTime(0, t + note.dur);
      osc.start(t);
      osc.stop(t + note.dur + 0.02);
      activeOscillators.push(osc);
      osc.onended = () => {
        const idx = activeOscillators.indexOf(osc);
        if (idx > -1) activeOscillators.splice(idx, 1);
      };
    });
    t += note.dur + (note.gap || 0);
  });
  return t;
}

export { RINGTONES, NOTIFICATIONS };

export function previewRingtone(id) {
  stopRingtone();
  const rt = RINGTONES.find(r => r.id === id);
  if (!rt) return;
  const ctx = getCtx();
  if (ctx.state === 'suspended') ctx.resume();
  scheduleMelody(rt.notes, ctx.currentTime + 0.02);
}

export function previewNotification(id) {
  const nt = NOTIFICATIONS.find(n => n.id === id);
  if (!nt) return;
  const ctx = getCtx();
  if (ctx.state === 'suspended') ctx.resume();
  scheduleMelody(nt.notes, ctx.currentTime + 0.02);
}

export function playNotificationSound(id) {
  try {
    const nt = NOTIFICATIONS.find(n => n.id === id) || NOTIFICATIONS[0];
    const ctx = getCtx();
    if (ctx.state === 'suspended') ctx.resume();
    scheduleMelody(nt.notes, ctx.currentTime + 0.02);
  } catch {}
}

export function playRingtoneLoop(id) {
  stopRingtone();
  const myToken = stopToken;
  const rt = RINGTONES.find(r => r.id === id) || RINGTONES[0];
  const playOne = () => {
    if (myToken !== stopToken) return;
    const ctx = getCtx();
    if (ctx.state === 'suspended') ctx.resume();
    scheduleMelody(rt.notes, ctx.currentTime + 0.02);
    const dur = getMelodyDuration(rt.notes);
    loopTimer = setTimeout(playOne, (dur + 0.3) * 1000);
  };
  playOne();
}

export function stopRingtone() {
  stopToken++;
  if (loopTimer) { clearTimeout(loopTimer); loopTimer = null; }
  // Stop all active oscillators instantly
  activeOscillators.forEach(osc => {
    try { osc.stop(0); osc.disconnect(); } catch {}
  });
  activeOscillators = [];
  // Instant silence: disconnect master gain AND compressor to cut all audio
  // paths — scheduled-but-not-yet-started oscillators can't reach destination.
  if (masterGain) {
    try { masterGain.gain.cancelScheduledValues(0); } catch {}
    try { masterGain.gain.setValueAtTime(0, 0); } catch {}
    try { masterGain.disconnect(); } catch {}
    masterGain = null;
  }
  if (compressor) {
    try { compressor.disconnect(); } catch {}
    compressor = null;
  }
  // Suspend the AudioContext to immediately pause all scheduled audio
  if (audioCtx && audioCtx.state === 'running') {
    try { audioCtx.suspend(); } catch {}
  }
}