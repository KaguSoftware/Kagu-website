"use client";

/*
  Scramble-decode text when it scrolls into view: random glyphs resolve
  left-to-right into the real text. Renders the real text on the server
  (SEO, no-JS) and for reduced motion. Optionally re-scrambles on hover.
*/
import { useEffect, useRef, useState } from "react";

const GLYPHS = "!<>-_\\/[]{}—=+*^?#%@$01";

export function Scramble({
  text,
  duration = 700,
  hover = false,
  className = "",
}: {
  text: string;
  duration?: number;
  /** replay when hovered */
  hover?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [out, setOut] = useState(text);
  const run = useRef<() => void>(() => {});

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const chars = Array.from(text);
    let raf = 0;
    const play = () => {
      cancelAnimationFrame(raf);
      const t0 = performance.now();
      const frame = (now: number) => {
        const p = Math.min(1, (now - t0) / duration);
        const done = Math.floor(p * chars.length);
        setOut(
          chars
            .map((c, i) =>
              i < done || c === " " ? c : GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
            )
            .join(""),
        );
        if (p < 1) raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    };
    run.current = play;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          play();
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, [text, duration]);

  return (
    <span
      ref={ref}
      className={className}
      aria-label={text}
      onMouseEnter={hover ? () => run.current() : undefined}
    >
      <span aria-hidden="true">{out}</span>
    </span>
  );
}
