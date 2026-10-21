"use client";

/*
  Wraps the page (main + footer) so every route change runs a view transition.
  Keyed by pathname, so the old page exits and the new page enters. The class
  names map to the animations in src/styles/view-transitions.css, and the
  transition type comes from NavLink (default = the quiet one, which also
  covers browser back/forward). The header sits outside, with its own name.
*/
import { usePathname } from "next/navigation";
import { ViewTransition } from "react";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <ViewTransition
      key={pathname}
      enter={{ "nav-major": "page-major-in", "nav-minor": "page-minor-in", default: "page-minor-in" }}
      exit={{ "nav-major": "page-major-out", "nav-minor": "page-minor-out", default: "page-minor-out" }}
      default="none"
    >
      <div className="page-stage">{children}</div>
    </ViewTransition>
  );
}
