"use client";

import type { ReactNode } from "react";

/*
  A folder tab. It's a real anchor (#file-slug) so it works without JS as a
  fallback. The folders are position:sticky and all pin to the same top, so once
  a folder is on screen getBoundingClientRect reports its *stuck* position near
  the top — scrolling "to the element" barely moves. We instead walk the offset
  chain for the folder's natural flow position and scroll there minus the pin
  offset, so the later folders drop below and this file rises to the front of the
  stack. Lenis drives the scroll on desktop; native smooth scroll on touch.
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
        const el = document.getElementById(targetId);
        if (!el) return;
        e.preventDefault();

        let naturalTop = 0;
        for (
            let node: HTMLElement | null = el;
            node;
            node = node.offsetParent as HTMLElement | null
        ) {
            naturalTop += node.offsetTop;
        }
        const pin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
        const targetY = Math.max(0, naturalTop - pin);

        const lenis = window.__kaguLenis;
        if (lenis) {
            lenis.scrollTo(targetY);
        } else {
            const reduced = window.matchMedia(
                "(prefers-reduced-motion: reduce)"
            ).matches;
            window.scrollTo({ top: targetY, behavior: reduced ? "auto" : "smooth" });
        }
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
