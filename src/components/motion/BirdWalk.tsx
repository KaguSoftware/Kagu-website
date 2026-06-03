"use client";

/*
  Decorative bird strip between sections. A row of small bird silhouettes
  drift slowly right-to-left, with a subtle vertical hop (the kagu is a
  flightless bird — it walks, doesn't fly). Pauses offscreen, respects
  prefers-reduced-motion.
*/

import { useEffect, useRef } from "react";
import { KaguMark } from "@/components/KaguMark";

interface BirdWalkProps {
  count?: number;
  size?: number;
  duration?: number; // seconds
  className?: string;
}

export function BirdWalk({
  count = 9,
  size = 36,
  duration = 38,
  className,
}: BirdWalkProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          el.style.animationPlayState = entry.isIntersecting ? "running" : "paused";
          el.querySelectorAll<HTMLElement>(".kagu-walk-bird").forEach((b) => {
            b.style.animationPlayState = entry.isIntersecting ? "running" : "paused";
          });
        });
      },
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      aria-hidden
      className={className}
      style={{
        overflow: "hidden",
        position: "relative",
        height: size * 1.6,
        width: "100%",
        maskImage:
          "linear-gradient(to right, transparent 0, black 8%, black 92%, transparent 100%)",
      }}
    >
      <div
        ref={ref}
        className="kagu-walk-track"
        style={{
          display: "flex",
          gap: size * 2.2,
          alignItems: "flex-end",
          height: "100%",
          width: "max-content",
          paddingLeft: size,
          willChange: "transform",
        }}
      >
        {Array.from({ length: count * 2 }).map((_, i) => (
          <div
            key={i}
            className="kagu-walk-bird"
            style={{
              width: size,
              height: size,
              position: "relative",
              animationDelay: `${(i % count) * 0.16}s`,
            }}
          >
            <KaguMark
              preserveAspectRatio="xMidYMax meet"
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                color: "var(--slate-ink)",
                opacity: 0.95,
              }}
            />
          </div>
        ))}
      </div>
      <style>{`
        .kagu-walk-track {
          animation: kagu-walk-track ${duration}s linear infinite;
        }
        .kagu-walk-bird {
          animation: kagu-walk-hop 1.1s cubic-bezier(0.4, 0, 0.2, 1) infinite alternate;
        }
        @keyframes kagu-walk-track {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        @keyframes kagu-walk-hop {
          from { transform: translateY(0) rotate(-1deg); }
          to   { transform: translateY(-6px) rotate(2deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .kagu-walk-track,
          .kagu-walk-bird { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
