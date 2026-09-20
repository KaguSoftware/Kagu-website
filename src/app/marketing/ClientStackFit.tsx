"use client";

import { useEffect } from "react";

/*
  Equal-height cards for the /marketing client pile.

  The pile is the same mechanic as /work's folder stack: every card is
  position:sticky at the same top, so each one rises and covers the one before
  it while the tabs line up in a row. This does the same job as WorkStackFit's
  first half — size every card body to the tallest of them, so the pile reads as
  one uniform stack rather than folders of mixed heights, and so a short card
  can never leave the one beneath it poking out below.

  What it deliberately does NOT do is WorkStackFit's second half. That sizes
  /work's runway to swallow the page's remaining scroll so the pile can never
  release — right for the last thing on a page, wrong here, where the pile sits
  mid-page and has to let go so Why Kagu and the contact section can follow. The
  hold before that release is a fixed length in CSS instead, on
  .kagu-client-files__runway.

  Equal heights also keep the release tidy. Sticky siblings sharing a containing
  block are let go by that block's bottom edge, which reaches a taller card
  first — so mixed heights would break the pile apart on the way out instead of
  lifting it away as one object.

  Under reduced motion file-card.css drops the pile to ordinary flow, so there
  is no stack to equalise and the min-heights are cleared.
*/
export function ClientStackFit() {
  useEffect(() => {
    const pile = document.querySelector<HTMLElement>(".kagu-client-files");
    if (!pile) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const rootFont =
      parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

    let raf = 0;
    let pendingForce = false;
    let lastW = -1;
    let lastFit = -1;

    const apply = () => {
      raf = 0;
      const force = pendingForce;
      pendingForce = false;

      const bodies = Array.from(
        pile.querySelectorAll<HTMLElement>(".kagu-folder__body"),
      );
      if (!bodies.length) return;

      if (reduce.matches) {
        bodies.forEach((b) => {
          b.style.minHeight = "";
        });
        return;
      }

      // --fit-h resolves to px here, so max-height IS the per-card viewport cap.
      // It is derived from 100svh, which also makes it the stable stand-in for
      // viewport height: unlike innerHeight it does not move as the mobile URL
      // bar collapses on scroll, so a toolbar-only resize is skipped below and
      // scrolling never sets off a remeasure.
      const fitH =
        parseFloat(getComputedStyle(bodies[0]).maxHeight) ||
        Number.POSITIVE_INFINITY;

      // A forced pass (initial / font / image load) changes card content height
      // and must always remeasure. A bare resize that left both the width and
      // the cap untouched changed nothing this depends on.
      if (!force && window.innerWidth === lastW && Math.abs(fitH - lastFit) < 1) {
        return;
      }
      lastW = window.innerWidth;
      lastFit = fitH;

      // Collapsing the cards to measure shrinks the document for an instant; if
      // that happens while scrolled down (a thumbnail finishing load) the
      // browser clamps the scroll position. Put it back.
      const prevY = window.scrollY;

      bodies.forEach((b) => {
        b.style.minHeight = "0px";
      });
      let maxH = 0;
      for (const b of bodies) if (b.offsetHeight > maxH) maxH = b.offsetHeight;

      const floor = (window.innerWidth >= 1024 ? 38 : 22) * rootFont;
      const cardH = Math.min(Math.max(maxH, floor), fitH);
      bodies.forEach((b) => {
        b.style.minHeight = `${cardH}px`;
      });

      if (Math.abs(window.scrollY - prevY) > 1) window.scrollTo(0, prevY);
    };

    const schedule = (force = false) => {
      if (force) pendingForce = true;
      if (!raf) raf = requestAnimationFrame(apply);
    };

    schedule(true);
    const onResize = () => schedule(false);
    const onForce = () => schedule(true);
    window.addEventListener("resize", onResize);
    reduce.addEventListener("change", onForce);
    document.fonts?.ready.then(() => schedule(true)).catch(() => {});
    const imgs = Array.from(pile.querySelectorAll("img"));
    imgs.forEach((img) => {
      if (!img.complete) img.addEventListener("load", onForce);
    });

    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      reduce.removeEventListener("change", onForce);
      imgs.forEach((img) => img.removeEventListener("load", onForce));
    };
  }, []);

  return null;
}
