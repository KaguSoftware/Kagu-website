"use client";

import { useEffect, useState } from "react";

function now() {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Istanbul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
}

/** "Istanbul · 14:32" — client-only time with a fixed-width placeholder. */
export function IstanbulTime() {
  const [t, setT] = useState<string | null>(null);
  useEffect(() => {
    const tick = () => setT(now());
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <p className="cx-time">
      <span className="cx-time__dot" aria-hidden="true" />
      Istanbul ·{" "}
      <span className="cx-time__t" suppressHydrationWarning>
        {t ?? "--:--"}
      </span>
    </p>
  );
}
