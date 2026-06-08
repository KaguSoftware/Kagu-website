"use client";

import { useEffect } from "react";
import Lenis from "lenis";

declare global {
  interface Window {
    __kaguLenis?: Lenis;
  }
}

/*
  Lenis smooth scroll. Independent of the animation layer (Framer Motion drives
  all reveals/scroll-progress) — Lenis only smooths the wheel so the site keeps
  its premium scroll feel. One self-owned RAF; reduced-motion + touch opt out.
*/
export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.__kaguLenis) return; // strict-mode double-effect guard

    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return; // honor reduced-motion: leave native scroll alone

    const lenis = new Lenis({
      lerp: 0.1,
      // Smooth the wheel on desktop. On touch, leave native momentum alone
      // (syncTouch:false) so phones feel responsive instead of fighting the OS.
      smoothWheel: !coarse,
      syncTouch: false,
      wheelMultiplier: 1,
      touchMultiplier: 1.2,
    });
    window.__kaguLenis = lenis;

    let raf = 0;
    const loop = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
      delete window.__kaguLenis;
    };
  }, []);

  return <>{children}</>;
}
