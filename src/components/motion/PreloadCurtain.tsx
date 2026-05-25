"use client";

/*
  M01 — PreloadCurtain.
  Branded loader, exits via vertical curtain wipe in --mint-deep.
  First visit per session only (sessionStorage guard).
  Total: 2200ms (1200ms wordmark hold + 1000ms wipe).
  Reduced-motion: skipped entirely.
*/

import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import { useReducedMotion } from "motion/react";
import { Logo } from "@/components/Logo";

const SESSION_KEY = "kagu_visited";

export function PreloadCurtain() {
  const reduced = useReducedMotion();
  // Start inactive on every render — server and client agree. Decide AFTER mount.
  const [active, setActive] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const wordmarkRef = useRef<HTMLDivElement>(null);

  // Decide whether to show the curtain on mount (avoids hydration mismatch).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem(SESSION_KEY)) return;
    setActive(true);
  }, []);

  useEffect(() => {
    if (!active) return;
    if (reduced) {
      window.sessionStorage.setItem(SESSION_KEY, "1");
      setActive(false);
      return;
    }

    document.documentElement.style.overflow = "hidden";

    const tl = gsap.timeline({
      onComplete() {
        document.documentElement.style.overflow = "";
        window.sessionStorage.setItem(SESSION_KEY, "1");
        setActive(false);
      },
    });
    tl.fromTo(
      wordmarkRef.current,
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 0.6, ease: "expo.out" },
    )
      .to({}, { duration: 0.8 }) // hold
      .to(wordmarkRef.current, { opacity: 0, duration: 0.32, ease: "power2.in" }, "+=0.05")
      .to(
        panelRef.current,
        { yPercent: -100, duration: 0.85, ease: "expo.inOut" },
        "-=0.1",
      );

    return () => {
      tl.kill();
      document.documentElement.style.overflow = "";
    };
  }, [active, reduced]);

  if (!active) return null;

  return (
    <div
      ref={panelRef}
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--mint-deep)",
        zIndex: "var(--z-curtain)" as unknown as number,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        willChange: "transform",
      }}
    >
      <div
        ref={wordmarkRef}
        style={{
          fontSize: "var(--type-5xl)",
          color: "var(--ink)",
          fontFamily: "var(--font-display)",
          letterSpacing: "var(--tracking-tight)",
          lineHeight: 1,
        }}
      >
        <Logo size={96} />
      </div>
    </div>
  );
}
