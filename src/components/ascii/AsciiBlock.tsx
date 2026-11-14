import type { CSSProperties } from "react";
import { AsciiWord } from "./AsciiWord";
import "./ascii.css";

/*
  Static ASCII art. Server-safe. Always decorative (aria-hidden).
  tone "shimmer" runs a slow white-grey sheen through the glyphs; "ink",
  "muted" and "line" are flat greys. Strictly black & white.
*/
export type AsciiTone = "shimmer" | "ink" | "muted" | "line";

export function AsciiBlock({
  art,
  tone = "ink",
  size,
  className = "",
  animate = true,
  style,
}: {
  art: string;
  tone?: AsciiTone;
  /** font-size (any CSS length); default is fluid, see .ascii */
  size?: string;
  className?: string;
  animate?: boolean;
  style?: CSSProperties;
}) {
  const cls = ["ascii", `ascii--${tone}`, animate && tone === "shimmer" ? "ascii--flow" : "", className]
    .filter(Boolean)
    .join(" ");
  return (
    <pre aria-hidden="true" className={cls} style={size ? { ...style, fontSize: size } : style}>
      {art}
    </pre>
  );
}

/*
  A word as a lit, extruded serif slab drawn in dense ASCII (see AsciiWord).
  Callers are server components; the art itself is a small client canvas,
  drawn once. It fills the container width up to a max height (`size`, any CSS
  length). tone sets the brightness; animate is accepted for compatibility
  (the art is static by design).
*/
const TONE_GAIN: Record<AsciiTone, number> = { shimmer: 1, ink: 1, muted: 0.72, line: 0.48 };

export function AsciiBanner({
  word,
  tone = "ink",
  size,
  className = "",
}: {
  word: string;
  tone?: AsciiTone;
  /** max height (any CSS length) */
  size?: string;
  className?: string;
  animate?: boolean;
}) {
  return (
    <AsciiWord
      word={word}
      gain={TONE_GAIN[tone]}
      className={`ascii-banner ${className}`.trim()}
      style={size ? ({ ["--aw-max" as string]: size } as CSSProperties) : undefined}
    />
  );
}
