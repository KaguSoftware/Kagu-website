/**
 * Cinematic film-grain overlay.
 *
 * Pure CSS: an inline SVG `feTurbulence` noise tile blended over the scene with
 * `soft-light`, plus a slow position jitter so the grain shimmers like film
 * rather than sitting as a static texture. Decorative and non-interactive.
 * The jitter is removed under `prefers-reduced-motion`.
 */

// fractalNoise tile, URL-encoded so it lives entirely in CSS (no asset request).
const NOISE =
  "data:image/svg+xml;charset=utf-8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'>
       <filter id='n'>
         <feTurbulence type='fractalNoise' baseFrequency='0.82' numOctaves='2' stitchTiles='stitch'/>
         <feColorMatrix type='saturate' values='0'/>
       </filter>
       <rect width='100%' height='100%' filter='url(#n)'/>
     </svg>`,
  );

export function GrainOverlay({ opacity = 0.14 }: { opacity?: number }) {
  return (
    <>
      <div aria-hidden className="kagu-grain" style={{ opacity }} />
      <style>{`
        .kagu-grain {
          position: absolute;
          inset: -50%;
          z-index: 5;
          pointer-events: none;
          background-image: url("${NOISE}");
          background-size: 220px 220px;
          mix-blend-mode: soft-light;
          will-change: transform;
          animation: kagu-grain-shift 1.2s steps(4) infinite;
        }
        @keyframes kagu-grain-shift {
          0%   { transform: translate3d(0, 0, 0); }
          25%  { transform: translate3d(-6%, 4%, 0); }
          50%  { transform: translate3d(5%, -5%, 0); }
          75%  { transform: translate3d(-4%, -3%, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .kagu-grain { animation: none; }
        }
      `}</style>
    </>
  );
}
