"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/* Route-change side effect: scroll to top on navigation (hash links excluded
   so /about#contact lands on its anchor). */
export function NavigationEvents() {
  const pathname = usePathname();

  useEffect(() => {
    if (window.location.hash) return;
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
