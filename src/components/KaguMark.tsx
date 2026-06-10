/*
  Kagu geometric bird mark — inline SVG (source: public/kagu-logo.svg).
  Inline (not <Image>) so it scales crisply and tints with `currentColor`;
  set `color` on the element or a parent to recolor.

  2026 mark: three-tone folded-ribbon read —
    · RIBBON: the full silhouette (head fold → body band → tail), mid tone
    · FOLD:   the small head-fold triangle, darkest tone
    · WING:   the big top wing with its smooth rounded shoulder, full tone
  Tones are expressed as opacities of currentColor so the mark recolors
  cleanly in every context (paper, mint, slate).

  Sizing: pass `height` for a fixed pixel height (width follows the 1079:483
  aspect), or give it `style`/`className` with explicit width/height — e.g.
  100% inside a positioned box — and steer placement with `preserveAspectRatio`.
*/

import type { CSSProperties } from "react";

/* Geometry measured pixel-exact from the 2026 brand PNG
   (Kagu logo enhanced.png, 1254px) and normalized to a 1079-wide box. */
const VIEWBOX = "0 0 1079 486";
/** Ribbon band + wing union, with the head-fold triangle cut out so the
    fold's darker tone never stacks on the ribbon's (stacked translucent
    layers would brighten, not darken). */
const RIBBON =
  "M 1078 0 L 778 0 Q 741 0 719 19 L 459 262 L 340 146 L 104 146 L 218 256 L 345 368 L 564 369 L 663 463 L 911 486 L 733 317 Z";
/** Head-fold triangle (darkest tone, fills the cut-out above). */
const FOLD = "M 104 146 L 0 256 L 218 256 Z";
/** Top wing with the rounded shoulder (brightest tone, drawn last). */
const WING = "M 1078 0 L 778 0 Q 741 0 719 19 L 345 368 L 677 368 Z";

interface KaguMarkProps {
  /** Fixed pixel height; width is derived from the mark's aspect ratio. */
  height?: number;
  className?: string;
  style?: CSSProperties;
  /** Accessible name. When omitted the mark is treated as decorative. */
  title?: string;
  preserveAspectRatio?: string;
  /** Opacity of the ribbon silhouette (mid tone). Default 0.6 (measured from the brand PNG). */
  wingOpacity?: number;
  /** Opacity of the head-fold triangle (darkest tone). Defaults to ~83% of the ribbon tone (measured). */
  foldOpacity?: number;
  /** Opacity of the solid top wing (brightest tone). Default 1. */
  bodyOpacity?: number;
}

export function KaguMark({
  height,
  className,
  style,
  title,
  preserveAspectRatio,
  wingOpacity = 0.6,
  foldOpacity,
  bodyOpacity = 1,
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
      <path d={RIBBON} opacity={wingOpacity} />
      <path d={FOLD} opacity={foldOpacity ?? wingOpacity * 0.83} />
      <path d={WING} opacity={bodyOpacity} />
    </svg>
  );
}
