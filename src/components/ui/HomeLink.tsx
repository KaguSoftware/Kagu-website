"use client";

/*
  HomeLink — the kagu mark in the header / corner chip.

  On any other route it navigates home like a normal link. On "/" it used to be
  a no-op (you're already there), so instead it scrolls the page back to the
  top — the behavior a wordmark in a fixed header is expected to have. Lenis
  owns the scroll when it's running, so hand the request to it and fall back to
  the native smooth scroll on touch / reduced-motion, where Lenis opts out.
*/

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback } from "react";

interface HomeLinkProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /** Extra click handling from the call site (e.g. closing the mobile menu). */
  onClick?: () => void;
  tabIndex?: number;
  "aria-hidden"?: boolean | "true" | "false";
  "data-cursor"?: string;
}

export function HomeLink({
  children,
  className,
  style,
  onClick,
  ...rest
}: HomeLinkProps) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      onClick?.();
      if (!isHome) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;

      // Already home: scroll to the top instead of re-navigating.
      e.preventDefault();
      const lenis = typeof window !== "undefined" ? window.__kaguLenis : undefined;
      if (lenis) {
        lenis.scrollTo(0, { duration: 1.1 });
      } else {
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
      }
      // Drop the hash so the URL matches where we actually are.
      if (window.location.hash) {
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }
    },
    [isHome, onClick],
  );

  return (
    <Link
      href="/"
      onClick={handleClick}
      className={className}
      style={style}
      aria-label={isHome ? "Kagu, back to top" : "Kagu, home"}
      {...rest}
    >
      {children}
    </Link>
  );
}
