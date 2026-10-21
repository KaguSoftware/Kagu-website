"use client";

import { useEffect, useRef } from "react";
import { RIBBON, FOLD, WING, KAGU_VIEWBOX } from "@/components/KaguMark";

/** Big blurred outline logo behind the page; drifts a few px with scroll. */
export function ContactBackdrop() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const y = Math.min(window.scrollY, 1600);
      el.style.setProperty("--dy", `${(-y * 0.06).toFixed(1)}px`);
      el.style.setProperty("--dx", `${(y * 0.03).toFixed(1)}px`);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="cx-bg" aria-hidden="true">
      <div className="cx-bg__logo" ref={ref}>
        <svg
          viewBox={KAGU_VIEWBOX}
          fill="none"
          stroke="currentColor"
          strokeWidth={16}
          strokeLinejoin="round"
          style={{ overflow: "visible" }}
        >
          <path d={RIBBON} vectorEffect="non-scaling-stroke" />
          <path d={FOLD} vectorEffect="non-scaling-stroke" />
          <path d={WING} vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
    </div>
  );
}
