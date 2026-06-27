/*
  Shared colour ramp for case-style surfaces.
  The /work folder stack and the home "What we build" cards both run
  darkest → lightest through the brand sky accent; ink is picked per
  surface by WCAG contrast so labels stay legible on any step.
*/

export const NAVY = "#0a1a3f"; // darkest step (top of the pile / first card)
export const SKY = "#1f8fe0"; // brand accent (ramp midpoint)
export const LIGHT = "#d9ecfc"; // lightest step (bottom / last card)
export const DARK_INK = "#091633"; // tinted navy ink (never pure black)
export const LIGHT_INK = "#eef5ff"; // tinted off-white ink (never pure white)

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function toHex(v: number) {
  return Math.max(0, Math.min(255, Math.round(v)))
    .toString(16)
    .padStart(2, "0");
}

export function mix(a: string, b: string, t: number) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return `#${toHex(A[0] + (B[0] - A[0]) * t)}${toHex(
    A[1] + (B[1] - A[1]) * t
  )}${toHex(A[2] + (B[2] - A[2]) * t)}`;
}

export function rgba(hex: string, a: number) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

// Piecewise so the midpoint lands on the brand sky rather than a muddy blend.
export function rampColor(t: number) {
  return t < 0.5 ? mix(NAVY, SKY, t / 0.5) : mix(SKY, LIGHT, (t - 0.5) / 0.5);
}

// WCAG relative luminance + contrast, so ink is chosen for legibility, not a guess.
function relLum(hex: string) {
  const lin = hexToRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

export function contrast(a: string, b: string) {
  const hi = Math.max(relLum(a), relLum(b));
  const lo = Math.min(relLum(a), relLum(b));
  return (hi + 0.05) / (lo + 0.05);
}

// Pick the ink (dark or light) that reads best on the given background.
export function inkFor(bg: string) {
  return contrast(bg, DARK_INK) >= contrast(bg, LIGHT_INK) ? DARK_INK : LIGHT_INK;
}
