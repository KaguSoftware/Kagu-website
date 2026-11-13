/* Deterministic plain-ASCII texture lines for OG images (no randomness, no fonts needed). */
const RAMP = " .,:;-=+*#";

export function ogTexture(cols = 120, rows = 36, seed = 1): string[] {
  const out: string[] = [];
  for (let y = 0; y < rows; y++) {
    let line = "";
    for (let x = 0; x < cols; x++) {
      const a = Math.sin(x * 0.09 + y * 0.35 + seed) * 0.5 + 0.5;
      const b = Math.sin(x * 0.04 - y * 0.2 + seed * 2.3) * 0.5 + 0.5;
      const h = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
      const r = h - Math.floor(h);
      const edge = Math.min(x, cols - 1 - x) / (cols * 0.5);
      const v = (a * 0.5 + b * 0.35 + r * 0.15) * (0.35 + 0.65 * (1 - edge * 0.6));
      line += RAMP[Math.min(RAMP.length - 1, Math.floor(v * RAMP.length * 0.9))];
    }
    out.push(line);
  }
  return out;
}
