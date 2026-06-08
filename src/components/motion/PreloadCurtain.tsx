"use client";

/*
  M01 — PreloadCurtain.
  First screen: the same spinning-sculpture loading screen, with a fake progress
  bar that fills over ~1s, then the whole thing fades away.
  First visit per session only (sessionStorage guard).
*/

import { useEffect, useState } from "react";
import { LoadingScreen } from "@/components/hero3d/LoadingScreen";

const SESSION_KEY = "kagu_visited";
const FILL_MS = 1800; // fake progress duration
const FADE_MS = 600; // exit fade

export function PreloadCurtain() {
  // Start inactive on every render — server and client agree. Decide AFTER mount.
  const [active, setActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const [leaving, setLeaving] = useState(false);

  // Decide whether to show the curtain on mount (avoids hydration mismatch).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem(SESSION_KEY)) return;
    // Activate only after mount — server renders nothing, so this client-only
    // first-visit decision can't cause a hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActive(true);
  }, []);

  // Run the fake progress, then start the exit fade.
  useEffect(() => {
    if (!active) return;
    document.documentElement.style.overflow = "hidden";
    // Next frame so the 0% bar paints before it transitions to 100%.
    const raf = requestAnimationFrame(() => setProgress(100));
    const done = window.setTimeout(() => setLeaving(true), FILL_MS);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(done);
      document.documentElement.style.overflow = "";
    };
  }, [active]);

  // After the fade completes, unmount and remember the visit.
  useEffect(() => {
    if (!leaving) return;
    const t = window.setTimeout(() => {
      window.sessionStorage.setItem(SESSION_KEY, "1");
      document.documentElement.style.overflow = "";
      setActive(false);
    }, FADE_MS);
    return () => window.clearTimeout(t);
  }, [leaving]);

  if (!active) return null;

  return (
    <div
      aria-hidden={leaving}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: "var(--z-curtain)" as unknown as number,
        opacity: leaving ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease`,
        pointerEvents: leaving ? "none" : "auto",
      }}
    >
      <LoadingScreen progress={progress} bare skeleton={false} />
    </div>
  );
}
