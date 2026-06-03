/*
  Kagu geometric bird mark — inline SVG (source: public/kagu-logo.svg).
  Inline (not <Image>) so it scales crisply and tints with `currentColor`;
  set `color` on the element or a parent to recolor. The two paths keep their
  original opacities (0.17 echoed wing + 0.85 body) for a folded, two-tone read.

  Sizing: pass `height` for a fixed pixel height (width follows the 1079:483
  aspect), or give it `style`/`className` with explicit width/height — e.g.
  100% inside a positioned box — and steer placement with `preserveAspectRatio`.
*/

import type { CSSProperties } from "react";

const VIEWBOX = "0 0 1079 483";
const WING =
  "M 1078 5 L 776 0 L 733 9 L 669 47 L 418 267 L 300 169 L 62 167 L 0 231 L 146 236 L 300 374 L 550 374 L 638 457 L 684 481 L 895 482 L 722 325 Z";
const BODY = "M 1078 6 L 770 1 L 724 13 L 666 50 L 300 373 L 666 372 Z";

interface KaguMarkProps {
  /** Fixed pixel height; width is derived from the mark's aspect ratio. */
  height?: number;
  className?: string;
  style?: CSSProperties;
  /** Accessible name. When omitted the mark is treated as decorative. */
  title?: string;
  preserveAspectRatio?: string;
  /** Opacity of the echoed wing path. Default 0.17 (ghosted, decorative). */
  wingOpacity?: number;
  /** Opacity of the solid body path. Default 0.85. */
  bodyOpacity?: number;
}

export function KaguMark({
  height,
  className,
  style,
  title,
  preserveAspectRatio,
  wingOpacity = 0.17,
  bodyOpacity = 0.85,
}: KaguMarkProps) {
  return (
    <svg
      viewBox={VIEWBOX}
      height={height}
      className={className}
      preserveAspectRatio={preserveAspectRatio}
      fill="currentColor"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      style={style}
    >
      {title ? <title>{title}</title> : null}
      <path d={WING} opacity={wingOpacity} />
      <path d={BODY} opacity={bodyOpacity} />
    </svg>
  );
}
