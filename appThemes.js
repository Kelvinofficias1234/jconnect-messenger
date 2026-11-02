// ── App Background Theme Engine ────────────────────────────────────────────
// 10 extraordinary palette presets for the global app background.
// Chat screens are visually isolated — they use their own Chat Background
// setting, so changing the App Background never affects message legibility.

export const APP_THEME_OPTIONS = [
  { label: 'Deep Midnight Purple', value: '#1A002C' },
  { label: 'Obsidian Black',        value: '#0A0A0F' },
  { label: 'Electric Indigo',       value: '#1A0B3D' },
  { label: 'Emerald Slate',         value: '#0D1F1A' },
  { label: 'Nordic Navy',           value: '#0D1B2A' },
  { label: 'Sunset Crimson',        value: '#2D0A0A' },
  { label: 'Cyberpunk Violet',      value: '#2A0040' },
  { label: 'Teal Matrix',           value: '#0D1F1F' },
  { label: 'Rose Gold Dark',        value: '#2D1A1F' },
  { label: 'Charcoal Minimal',      value: '#1A1A1E' },
];

export const DEFAULT_APP_BG = '#1A002C';

export function getAppBg(profile) {
  return profile?.app_background || DEFAULT_APP_BG;
}