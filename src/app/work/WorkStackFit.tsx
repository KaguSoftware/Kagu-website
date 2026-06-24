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

  Recomputed on resize, font load, and thumbnail load. Disabled under
  reduced-motion, where the cards fall back to natural static flow.
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
        let raf = 0;

        const apply = () => {
            raf = 0;
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

            // 3) Lock scroll so it ends exactly when the last card pins.
            const tail = window.innerHeight - stackTop - cardH - pad;
            runway.style.height = `${Math.max(0, tail)}px`;
            runway.style.marginBottom = `${Math.min(0, tail)}px`;

            if (Math.abs(window.scrollY - prevY) > 1) window.scrollTo(0, prevY);
        };

        const schedule = () => {
            if (!raf) raf = requestAnimationFrame(apply);
        };

        schedule();
        window.addEventListener("resize", schedule);
        document.fonts?.ready.then(schedule).catch(() => {});
        const imgs = Array.from(folders.querySelectorAll("img"));
        imgs.forEach((img) => {
            if (!img.complete) img.addEventListener("load", schedule);
        });

        return () => {
            if (raf) cancelAnimationFrame(raf);
            window.removeEventListener("resize", schedule);
            imgs.forEach((img) => img.removeEventListener("load", schedule));
        };
    }, []);

    return null;
}
