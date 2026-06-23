"use client";

import { useEffect } from "react";

/*
  Locks the folder pile so it can't be over-scrolled.

  Every .kagu-folder is position:sticky and they all share ONE containing block
  (.kagu-folders), so they un-stick *together* the instant you scroll past that
  block's content box — which yanks the whole aligned pile upward ("breaking").
  A hardcoded runway can't prevent it because the release point moves with the
  viewport and the folders' content heights.

  Instead we size the trailing runway so the document's *last* scroll position
  coincides exactly with the moment the final folder pins. At that point every
  tab is aligned on one level and there's simply no scroll left for the stack to
  release into — the pile locks in place. Recomputed on resize, font load, and
  any content-height change (lazy thumbnails). Disabled under reduced-motion,
  where the folders fall back to static flow and need their full height.
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

        let applied = NaN;

        const fit = () => {
            if (reduce.matches) {
                runway.style.height = "0px";
                runway.style.marginBottom = "0px";
                applied = NaN;
                return;
            }

            const list = folders.querySelectorAll<HTMLElement>(".kagu-folder");
            const last = list[list.length - 1];
            if (!last) return;

            const stackTop = parseFloat(getComputedStyle(last).top) || 0;
            const pad = parseFloat(getComputedStyle(work).paddingBottom) || 0;

            // Tail length that drops the document's max scroll exactly onto the
            // last folder's pin point. Goes negative (pulls the page bottom up)
            // when the final folder is taller than the room below the pin.
            const tail = window.innerHeight - stackTop - last.offsetHeight - pad;

            if (Math.abs(tail - applied) < 0.5) return; // no-op: skip a relayout
            applied = tail;
            runway.style.height = `${Math.max(0, tail)}px`;
            runway.style.marginBottom = `${Math.min(0, tail)}px`;
        };

        fit();

        // Catches lazy thumbnail loads / font swaps that change folder heights.
        const ro = new ResizeObserver(fit);
        ro.observe(folders);
        window.addEventListener("resize", fit);
        document.fonts?.ready.then(fit).catch(() => {});

        return () => {
            ro.disconnect();
            window.removeEventListener("resize", fit);
        };
    }, []);

    return null;
}
