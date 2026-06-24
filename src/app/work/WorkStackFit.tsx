"use client";

import { useEffect } from "react";

/*
  Two jobs, both run together so they stay consistent:

  1. Equal-height cards. Every case body is sized to the *tallest* case, so the
     pile reads as one uniform stack instead of folders of mixed heights. A
     larger floor on desktop keeps the cards generous there; mobile (the
     priority) just fits its content. The per-card cap (--fit-h, set in CSS)
     guarantees a card never exceeds the screen, so the whole case is always
     visible when it pins.

  2. Scroll lock. The folders are position:sticky sharing one containing block,
     so they'd un-stick *together* the instant you scroll past it ("breaking").
     We size the trailing runway so the document's last scroll position lands
     exactly when the final (now equal-height) card pins — leaving no scroll for
     the stack to release into.

  Viewport height here is read as a stable 100svh (the *small*, toolbar-expanded
  height the CSS already sizes off), NOT window.innerHeight. innerHeight grows
  and shrinks as the mobile URL bar collapses/expands on scroll; sizing the
  runway off it made the lock drift right at the bottom of the page, so the
  stack would start to release and the page would fight the scroll ("jumpy").
  svh is constant through those toolbar moves, so the lock holds steady.

  Recomputed on resize, font load, and thumbnail load. A toolbar-only viewport
  change (width + svh unchanged) is skipped so scrolling never thrashes the
  remeasure. Disabled under reduced-motion, where the cards fall back to natural
  static flow.
*/
export function WorkStackFit() {
    useEffect(() => {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
        const work = document.querySelector<HTMLElement>(".kagu-work");
        const folders = document.querySelector<HTMLElement>(".kagu-folders");
        const runway = document.querySelector<HTMLElement>(
            ".kagu-folders__runway"
        );
        if (!work || !folders || !runway) return;

        const rootFont =
            parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

        // Measure 100svh in px — the *small* (toolbar-expanded) viewport height.
        // Unlike window.innerHeight this stays put while the mobile URL bar
        // expands/collapses on scroll, so the runway maths never shift under the
        // user near the bottom of the page.
        const probe = document.createElement("div");
        probe.style.cssText =
            "position:fixed;left:0;top:0;width:0;height:100svh;visibility:hidden;pointer-events:none;";
        const readSvh = () => {
            document.body.appendChild(probe);
            const h = probe.getBoundingClientRect().height;
            probe.remove();
            return h || window.innerHeight;
        };

        let raf = 0;
        let pendingForce = false;
        let lastW = -1;
        let lastSvh = -1;

        const apply = () => {
            raf = 0;
            const force = pendingForce;
            pendingForce = false;

            const bodies = Array.from(
                folders.querySelectorAll<HTMLElement>(".kagu-folder__body")
            );
            const firstFolder =
                folders.querySelector<HTMLElement>(".kagu-folder");
            if (!bodies.length || !firstFolder) return;

            if (reduce.matches) {
                bodies.forEach((b) => (b.style.minHeight = ""));
                runway.style.height = "0px";
                runway.style.marginBottom = "0px";
                return;
            }

            const svh = readSvh();
            // A forced pass (initial / font / image load) changes card *content*
            // height, so it must always remeasure. A bare resize that left both
            // the width and svh untouched is just the toolbar moving — nothing
            // the lock depends on changed, so skip the (scroll-disturbing)
            // remeasure entirely and let scrolling stay smooth.
            if (
                !force &&
                window.innerWidth === lastW &&
                Math.abs(svh - lastSvh) < 1
            ) {
                return;
            }
            lastW = window.innerWidth;
            lastSvh = svh;

            const stackTop = parseFloat(getComputedStyle(firstFolder).top) || 0;
            const pad = parseFloat(getComputedStyle(work).paddingBottom) || 0;
            // --fit-h resolves to px here, so reading max-height gives the cap.
            const fitH =
                parseFloat(getComputedStyle(bodies[0]).maxHeight) ||
                Number.POSITIVE_INFINITY;

            // Collapsing the cards to measure shrinks the document for an instant;
            // if this runs while scrolled down (e.g. a thumbnail finishing load)
            // the browser would clamp the scroll position. Restore it afterwards.
            const prevY = window.scrollY;

            // 1) Drop the floor, measure each card's natural height, take the max.
            bodies.forEach((b) => (b.style.minHeight = "0px"));
            let maxH = 0;
            for (const b of bodies) if (b.offsetHeight > maxH) maxH = b.offsetHeight;

            // 2) Equalize every card to the tallest, with a bigger floor on
            //    desktop and the viewport cap as the ceiling.
            const floor = (window.innerWidth >= 1024 ? 38 : 22) * rootFont;
            const cardH = Math.min(Math.max(maxH, floor), fitH);
            bodies.forEach((b) => (b.style.minHeight = `${cardH}px`));

            // 3) Lock scroll so it ends exactly when the last card pins. Sized
            //    off the stable svh, so even when the toolbar collapses and the
            //    real viewport grows taller, the page can never scroll past the
            //    pin (worst case the last card stops a hair short — never a
            //    release).
            const tail = svh - stackTop - cardH - pad;
            runway.style.height = `${Math.max(0, tail)}px`;
            runway.style.marginBottom = `${Math.min(0, tail)}px`;

            if (Math.abs(window.scrollY - prevY) > 1) window.scrollTo(0, prevY);
        };

        const schedule = (force = false) => {
            if (force) pendingForce = true;
            if (!raf) raf = requestAnimationFrame(apply);
        };

        schedule(true);
        const onResize = () => schedule(false);
        const onImgLoad = () => schedule(true);
        window.addEventListener("resize", onResize);
        document.fonts?.ready.then(() => schedule(true)).catch(() => {});
        const imgs = Array.from(folders.querySelectorAll("img"));
        imgs.forEach((img) => {
            if (!img.complete) img.addEventListener("load", onImgLoad);
        });

        return () => {
            if (raf) cancelAnimationFrame(raf);
            window.removeEventListener("resize", onResize);
            imgs.forEach((img) => img.removeEventListener("load", onImgLoad));
        };
    }, []);

    return null;
}
