"use client";

import type { ReactNode } from "react";

/*
  A folder tab. It's a real anchor (#file-slug) so it works without JS and on
  touch — where Lenis stays off and the native jump + scroll-margin-top lands it.
  When Lenis is driving the wheel (desktop), the native hash jump fights it, so
  we hand the scroll to Lenis instead and read the target's scroll-margin-top as
  the offset so it pins to the same level the staircase uses.
*/
export function TabLink({
    targetId,
    className,
    ariaLabel,
    children,
}: {
    targetId: string;
    className?: string;
    ariaLabel?: string;
    children: ReactNode;
}) {
    function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
        const lenis = window.__kaguLenis;
        if (!lenis) return; // no Lenis: let the native anchor jump handle it
        const el = document.getElementById(targetId);
        if (!el) return;
        e.preventDefault();
        const offset = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
        lenis.scrollTo(el, { offset: -offset });
    }

    return (
        <a
            href={`#${targetId}`}
            className={className}
            aria-label={ariaLabel}
            onClick={handleClick}
        >
            {children}
        </a>
    );
}
