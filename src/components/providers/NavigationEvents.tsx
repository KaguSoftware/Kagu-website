"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/*
  Route-change side effect: scroll to top on navigation. Native scroll now
  owns scrolling (Lenis removed); there are no pinned ScrollTriggers left to
  refresh, so the old GSAP refresh is gone.
*/
export function NavigationEvents() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
