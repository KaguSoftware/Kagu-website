"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/*
  Route-change side effect: scroll to top on navigation. Uses Lenis (instant)
  when smooth scroll is active, else native — no ScrollTrigger refresh needed
  (scroll animations are Framer Motion, recomputed automatically).
*/
export function NavigationEvents() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.__kaguLenis) {
      window.__kaguLenis.scrollTo(0, { immediate: true });
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname]);

  return null;
}
