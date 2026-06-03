"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * SSR-safe client/media hooks built on `useSyncExternalStore` — they return a
 * stable server snapshot (so hydration matches) and read the real value on the
 * client without any setState-in-effect. Used by the hero to gate the WebGL
 * canvas, pick a responsive layout, and honor reduced-motion.
 */

const noopSubscribe = () => () => {};

/** False during SSR / first paint, true once mounted on the client. */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

/** Live match for a media query. `serverDefault` is used during SSR. */
export function useMediaQuery(query: string, serverDefault = false): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => serverDefault,
  );
}

/** True when the user prefers reduced motion. */
export function useReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}
