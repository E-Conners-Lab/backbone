// The palette (constitution C4, AC18): electric blue, cyan, indigo, ice white, with amber for
// congestion and magenta for failure. No green and no red. tests/unit/palette.test.ts scans this
// file, the stylesheet and the drawing code, and fails if any color falls in a green or red hue band.

export type Rgb = readonly [number, number, number];
const hex = (h: string): Rgb => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];

export const HEX = {
  navy: "#050a18",
  navyLift: "#0a1736",
  land: "#0a1634",
  coast: "#6f8fe8",
  grid: "#5b5bd6",
  indigo: "#5b5bd6",
  blue: "#2d7bff",
  cyan: "#3fe0ff",
  ice: "#eaf6ff",
  muted: "#8fa8d0",
  amber: "#ffb020",
  amberPale: "#ffe2a6",
  magenta: "#ff2bd6",
  magentaPale: "#ffd0f6",
  white: "#ffffff",
} as const;

export const RGB = Object.fromEntries(Object.entries(HEX).map(([k, v]) => [k, hex(v)])) as Record<keyof typeof HEX, Rgb>;

const mix = (a: Rgb, b: Rgb, t: number): Rgb => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** Link color by utilization: indigo -> blue -> cyan -> near white. Congestion is handled separately (amber). */
export function loadColor(u: number): Rgb {
  if (u < 0.45) return mix(RGB.indigo, RGB.blue, u / 0.45);
  if (u < 0.8) return mix(RGB.blue, RGB.cyan, (u - 0.45) / 0.35);
  return mix(RGB.cyan, [0.78, 0.96, 1], (u - 0.8) / 0.2);
}
