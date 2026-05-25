"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { ScrollTrigger } from "@/lib/gsap";

/*
  Route-change side effects:
  1. Scroll to top (Lenis owns scroll).
  2. Kill any per-page ScrollTrigger instances so they don't leak across
     routes; the new page will create fresh ones on mount.
  3. Refresh after the next two RAFs so layout has settled.
*/
export function NavigationEvents() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.__kaguLenis?.scrollTo(0, { immediate: true });
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (window.__kaguGsapReady) ScrollTrigger.refresh();
      }),
    );
  }, [pathname]);

  return null;
}
