// A clean, modern palette of header colors. Distinct hues, all readable with
// white text. Used for table groups and as a per-table fallback.
export const PALETTE = [
  '#6366f1', // indigo
  '#0ea5e9', // sky
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#3b82f6', // blue
  '#84cc16', // lime
  '#a855f7', // purple
];

export const NEUTRAL_HEADER = '#475569'; // slate, for ungrouped tables

/** Deterministic color from a string so the same name always gets the same hue. */
export function hashColor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}
