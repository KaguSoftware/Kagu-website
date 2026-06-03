/*
  Kagu wordmark + bird mark.
  The bird (Rhynochetos jubatus, the kagu) is the brand. Mark and wordmark
  are sized together via the `size` prop, which scales the mark; the
  wordmark inherits font-size from the calling context.

  Mark: the geometric SVG (KaguMark), inline + tinted to slate-ink via
  currentColor so it sits in harmony with the wordmark.
*/

import { KaguMark } from "@/components/KaguMark";

interface LogoProps {
  /** Pixel size of the bird mark. Wordmark inherits parent font-size. */
  size?: number;
  /** Hide the bird and show only the wordmark "kagu". */
  markOnly?: boolean;
  /** Hide the wordmark and show only the bird. */
  wordmarkOnly?: boolean;
  className?: string;
}

export function Logo({
  size = 32,
  markOnly = false,
  wordmarkOnly = false,
  className,
}: LogoProps) {
  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: size * 0.4,
        lineHeight: 1,
      }}
    >
      {!markOnly && (
        <KaguMark
          height={size * 0.7}
          title={wordmarkOnly ? "Kagu" : undefined}
          wingOpacity={0.55}
          bodyOpacity={1}
          style={{ color: "var(--slate-ink)", display: "block", flexShrink: 0 }}
        />
      )}
      {!wordmarkOnly && (
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 500,
            letterSpacing: "-0.02em",
            color: "var(--slate-ink)",
          }}
          aria-hidden={markOnly ? "true" : undefined}
        >
          kagu
        </span>
      )}
    </span>
  );
}
