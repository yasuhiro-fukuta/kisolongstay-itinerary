// src/lib/dayColors.ts
export const DAY_COLOR_CYCLE = ["#3b82f6", "#22c55e", "#eab308", "#ef4444"]; // blue, green, yellow, red

export function dayColor(day: number): string {
  const idx = Math.max(0, day - 1) % DAY_COLOR_CYCLE.length;
  return DAY_COLOR_CYCLE[idx];
}

export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "").trim();
  if (h.length !== 6) return `rgba(255,255,255,${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
