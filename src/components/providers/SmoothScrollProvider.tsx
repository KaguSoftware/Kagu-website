"use client";

import { useEffect, useRef } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger } from "@/lib/gsap";

declare global {
  interface Window {
    __kaguLenis?: Lenis;
    __kaguGsapReady?: boolean;
  }
}

/*
  Single RAF owns Lenis + ScrollTrigger updates. ScrollTrigger reads scroll
  position from Lenis via scrollerProxy so pin/scrub primitives stay in sync
  with smooth scroll. gsap.ticker.lagSmoothing(0) prevents catch-up jumps.
*/
export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.__kaguLenis) return; // strict-mode double-effect guard

    const coarse = window.matchMedia("(pointer: coarse)").matches;

    // On touch devices use native scroll — Lenis fights iOS/Android momentum.
    if (coarse) {
      window.__kaguGsapReady = true;
      requestAnimationFrame(() => requestAnimationFrame(() => ScrollTrigger.refresh()));
      return () => {
        ScrollTrigger.getAll().forEach((t) => t.kill());
        delete window.__kaguGsapReady;
      };
    }

    const lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
      wheelMultiplier: 1,
    });
    window.__kaguLenis = lenis;

    // Bridge ScrollTrigger ← Lenis
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => {
      lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    window.__kaguGsapReady = true;
    // Refresh ScrollTrigger once initial mount completes (fonts/images settling)
    requestAnimationFrame(() => requestAnimationFrame(() => ScrollTrigger.refresh()));

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      ScrollTrigger.getAll().forEach((t) => t.kill());
      gsap.ticker.remove(lenis.raf as unknown as gsap.TickerCallback);
      lenis.destroy();
      delete window.__kaguLenis;
      delete window.__kaguGsapReady;
    };
  }, []);

  return <>{children}</>;
}
