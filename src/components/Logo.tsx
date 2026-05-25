/*
  Kagu wordmark + bird mark.
  The bird (Rhynochetos jubatus, the kagu) is the brand. Mark and wordmark
  are sized together via the `size` prop, which scales the mark; the
  wordmark inherits font-size from the calling context.

  Image asset: public/kagulogoNoBg.png. PNG is fine here — the bird is
  illustrative and renders at 24–96px on shipped surfaces. If we later want
  to tint the bird to slate-ink for harmony with the palette, swap in an
  SVG version and set fill="currentColor".
*/

import Image from "next/image";

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
        <Image
          src="/kagulogoNoBg.png"
          alt="Kagu"
          width={size}
          height={size}
          priority
          style={{ width: size, height: size, objectFit: "contain" }}
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
