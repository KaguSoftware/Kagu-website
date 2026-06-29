/*
  Minimal line-art glyphs per capability. Each is a small SVG that visualizes
  the concept without resorting to an icon-set or emoji. Stroke uses
  currentColor so the parent controls tint.
*/

interface GlyphProps {
  size?: number;
  className?: string;
}

const props = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

// "Full-stack platforms" — two stacked frames (customer + admin) sharing one base.
export function GlyphFullStack({ size = 56, className }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" className={className} aria-hidden>
      <g {...props}>
        <rect x="6" y="10" width="36" height="18" />
        <rect x="14" y="28" width="36" height="18" />
        <line x1="6" y1="14" x2="42" y2="14" />
        <line x1="14" y1="32" x2="50" y2="32" />
      </g>
    </svg>
  );
}

// "Admin staff use" — a checklist + a cursor.
export function GlyphAdmin({ size = 56, className }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" className={className} aria-hidden>
      <g {...props}>
        <line x1="10" y1="14" x2="46" y2="14" />
        <line x1="10" y1="24" x2="38" y2="24" />
        <line x1="10" y1="34" x2="42" y2="34" />
        <path d="M 14 44 l 4 4 l 8 -8" />
      </g>
    </svg>
  );
}

// "Multilingual" — A above letterforms, swap arrow between them.
export function GlyphMultilingual({ size = 56, className }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" className={className} aria-hidden>
      <g {...props}>
        <text x="6" y="22" fontFamily="var(--font-display)" fontSize="14" fill="currentColor" stroke="none">
          TR
        </text>
        <text x="32" y="48" fontFamily="var(--font-display)" fontSize="14" fill="currentColor" stroke="none">
          EN
        </text>
        <path d="M 24 26 l 6 4 l -6 4 M 30 30 H 18" />
      </g>
    </svg>
  );
}

// "Real-time" — pulse waveform.
export function GlyphRealtime({ size = 56, className }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" className={className} aria-hidden>
      <g {...props}>
        <path d="M 4 28 H 14 L 18 16 L 24 40 L 30 22 L 36 32 L 40 28 H 52" />
      </g>
    </svg>
  );
}

// "Ship to production" — arrow rising into a corner / stair.
export function GlyphShip({ size = 56, className }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" className={className} aria-hidden>
      <g {...props}>
        <path d="M 8 44 H 20 V 32 H 32 V 20 H 44 V 8" />
        <path d="M 38 14 L 44 8 L 50 14" />
      </g>
    </svg>
  );
}

// "Solutions, not systems" — a target with a hit centre: aim at the problem,
// not the scaffolding around it.
export function GlyphSolution({ size = 56, className }: GlyphProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" className={className} aria-hidden>
      <g {...props}>
        <circle cx="28" cy="28" r="20" />
        <circle cx="28" cy="28" r="11" />
        <circle cx="28" cy="28" r="2.6" fill="currentColor" stroke="none" />
      </g>
    </svg>
  );
}

export const GLYPHS: Record<string, React.ComponentType<GlyphProps>> = {
  "full-stack": GlyphFullStack,
  admin: GlyphAdmin,
  multilingual: GlyphMultilingual,
  realtime: GlyphRealtime,
  deploy: GlyphShip,
  solutions: GlyphSolution,
};
