/*
  ArrowGlyph — the site's CTA arrow.

  Every call-to-action used to end in a bare 1px rule (a <span> with height:1),
  which read as a stray line rather than "this goes somewhere". This draws the
  same hairline but finishes it with a chevron head, at whatever length the
  call site used to give its rule. Stroke is currentColor so it inherits the
  link's color; `color` overrides it where the rule was tinted separately.

  No client hooks — safe inside server components.
*/

interface ArrowGlyphProps {
  /** Total arrow length in px (the old rule's `width`). */
  length?: number;
  /** Hairline weight. Matches the 1px rules it replaces. */
  weight?: number;
  /** Overrides currentColor (for arrows that were tinted apart from the label). */
  color?: string;
  /** Point the arrow back instead of forward (used by "back" links). */
  direction?: "right" | "left";
  className?: string;
  style?: React.CSSProperties;
}

export function ArrowGlyph({
  length = 24,
  weight = 1,
  color,
  direction = "right",
  className,
  style,
}: ArrowGlyphProps) {
  // Head stays proportional to the shaft but bounded, so a 20px arrow keeps a
  // readable tip and a 32px one doesn't grow a fat triangle.
  const head = Math.min(Math.max(length * 0.28, 5), 8);
  const halfSpan = head * 0.62; // vertical reach of each barb
  // Size the box around the head so the barbs can never clip at the edges.
  const h = Math.ceil(2 * (halfSpan + weight));
  const mid = h / 2;
  const inset = weight / 2;
  const tip = length - inset;

  return (
    <svg
      aria-hidden
      focusable="false"
      width={length}
      height={h}
      viewBox={`0 0 ${length} ${h}`}
      fill="none"
      className={className}
      style={{
        display: "block",
        flexShrink: 0,
        color,
        // Mirror for back-links: the shaft still runs the full width, the head
        // just lands on the other end.
        transform: direction === "left" ? "scaleX(-1)" : undefined,
        ...style,
      }}
    >
      <path
        d={`M${inset} ${mid} H${tip} M${tip - head} ${mid - halfSpan} L${tip} ${mid} L${tip - head} ${mid + halfSpan}`}
        stroke="currentColor"
        strokeWidth={weight}
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  );
}
