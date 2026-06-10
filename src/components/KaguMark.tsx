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

const VIEWBOX = "0 0 1079 483";
/** Ribbon band + wing union, with the head-fold triangle cut out so the
    fold's darker tone never stacks on the ribbon's (stacked translucent
    layers would brighten, not darken). */
const RIBBON =
  "M 1078 5 L 800 1 Q 706 2 646 60 L 418 267 L 300 169 L 62 167 L 146 236 L 300 374 L 550 374 L 638 457 L 684 481 L 895 482 L 722 325 Z";
/** Head-fold triangle (darkest tone, fills the cut-out above). */
const FOLD = "M 62 167 L 0 231 L 146 236 Z";
/** Top wing with the rounded shoulder (brightest tone, drawn last). */
const WING = "M 1078 6 L 800 1 Q 706 2 646 60 L 300 373 L 666 372 Z";

interface KaguMarkProps {
  /** Fixed pixel height; width is derived from the mark's aspect ratio. */
  height?: number;
  className?: string;
  style?: CSSProperties;
  /** Accessible name. When omitted the mark is treated as decorative. */
  title?: string;
  preserveAspectRatio?: string;
  /** Opacity of the ribbon silhouette (mid tone). Default 0.45. */
  wingOpacity?: number;
  /** Opacity of the head-fold triangle (darkest tone). Defaults to ~65% of the ribbon tone. */
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
  wingOpacity = 0.45,
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
      <path d={FOLD} opacity={foldOpacity ?? wingOpacity * 0.65} />
      <path d={WING} opacity={bodyOpacity} />
    </svg>
  );
}
