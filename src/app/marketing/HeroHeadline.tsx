"use client";

/*
  The /marketing <h1> — a fixed line plus one accent word that cycles.

  Structure (the reason nothing on the page moves when the word changes):

    line 1   "We grow your brand"          ordinary text, never touched
    line 2   [clip box]                    block, overflow:hidden
               ├ sizer   longest word, visibility:hidden, IN FLOW  → holds the
               │                                                     line open
               └ word    the visible word, position:absolute       → floats

  The sizer is what reserves the box. The animated word is taken out of flow
  entirely, so a longer or shorter word cannot resize anything, and because the
  word sits on its own line the fixed part can never re-wrap either. No width
  is animated and nothing is measured in JS.

  Accessibility: the rotator is aria-hidden so the cycling word is never
  announced, and never announced twice. The whole sentence is given to
  assistive tech by aria-label on the <h1> — HERO_SENTENCE, built from the
  constants below so it cannot drift from the copy. Deliberately aria-label
  rather than a visually-hidden span: a hidden span is still rendered text, so
  it would put "smarter." into the <h1> twice for anything reading the DOM,
  Google included. Deliberately not an aria-live region — this is decoration.
*/

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

/** The part of the headline that never changes. */
export const HERO_FIXED = "We grow your brand";

/**
 * The cycling accent word, full stop included — the full stop is part of the
 * string so it takes the accent colour along with the word.
 *
 * THIS IS THE LIST TO EDIT. Add, remove or reorder freely; the first entry is
 * special in three ways: it is what ships in the server-rendered HTML, what
 * assistive tech is given as the end of the sentence, and what reduced-motion
 * visitors see for good.
 *
 * One constraint: the hero is set in Space Mono at --type-6xl, so a word longer
 * than ~9 characters cannot fit on one line at 375px. Keep them short.
 */
export const HERO_ROTATING_WORDS = ["smarter.", "faster.", "louder.", "sharper."] as const;

/** The complete sentence, for the <h1>'s aria-label. */
export const HERO_SENTENCE = `${HERO_FIXED} ${HERO_ROTATING_WORDS[0]}`;

/** How long a word holds before the next one comes in. */
const HOLD_MS = 2800;
/** Swap duration. Seconds — motion's unit, not milliseconds. */
const SWAP_S = 0.45;
const EASE = [0.4, 0, 0.2, 1] as const;

/* The sizer renders the longest word, so the clip box is sized once for the
   worst case rather than re-measured per word. In Space Mono every glyph is
   the same advance, so "longest" is simply the most characters. */
const LONGEST = HERO_ROTATING_WORDS.reduce((a, b) => (b.length > a.length ? b : a));

export function MarketingHeroHeadline() {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [onScreen, setOnScreen] = useState(true);
  const boxRef = useRef<HTMLSpanElement>(null);

  // Same pause-when-offscreen pattern as Marquee and AmbientDrift.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setOnScreen(entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // Reduced motion: the index never advances, so the word never swaps and
    // nothing ever slides. Deliberately not a separate render branch — both
    // states emit identical markup, which keeps hydration clean.
    if (reduced || !onScreen) return;
    const id = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % HERO_ROTATING_WORDS.length);
    }, HOLD_MS);
    return () => window.clearInterval(id);
  }, [reduced, onScreen]);

  return (
    <>
      <span style={{ display: "block" }}>{HERO_FIXED}</span>

      <span ref={boxRef} className="kagu-rotator" aria-hidden="true">
        <span className="kagu-rotator__sizer">{LONGEST}</span>
        <AnimatePresence initial={false}>
          <motion.span
            key={index}
            className="kagu-rotator__word"
            initial={{ y: "110%", opacity: 0 }}
            animate={{ y: "0%", opacity: 1 }}
            exit={{ y: "-110%", opacity: 0 }}
            transition={{ duration: reduced ? 0 : SWAP_S, ease: EASE }}
          >
            {HERO_ROTATING_WORDS[index]}
          </motion.span>
        </AnimatePresence>
      </span>

      {/* href + precedence so React hoists this to <head>. Without them the
          <style> stays put — i.e. inside the <h1>, where its CSS text becomes
          part of the heading's textContent. */}
      <style href="kagu-rotator" precedence="default">{`
        .kagu-rotator {
          display: block;
          position: relative;
          overflow: hidden;
          color: var(--mint-deep);
          /* Space Mono's descender (the "p" in "sharper.") drops ~0.1em past
             the hero's 0.95 line box, so the clip box is padded below and
             pulled straight back — the hero's line rhythm is unchanged. */
          padding-bottom: 0.16em;
          margin-bottom: -0.16em;
          /* Masking at the line box alone is not enough here: at line-height
             0.95 the line box starts ABOVE the ink of the line before it, so
             an outgoing word spends the middle of its travel superimposed on
             "We grow your brand" — legible as a double exposure. Measured in
             the browser at 375/768/1440: the fixed line's descenders reach
             0.097em past this box's top edge, and the accent word's own ink
             starts at 0.149em. Cutting at 0.12em therefore lands between the
             two at every width — the word is gone before it meets the grey. */
          clip-path: inset(0.12em 0 0 0);
        }
        /* In flow, so it — and only it — decides how tall the line is. */
        .kagu-rotator__sizer {
          visibility: hidden;
          white-space: nowrap;
        }
        /* Out of flow, so its width and height affect nothing. */
        .kagu-rotator__word {
          position: absolute;
          top: 0;
          left: 0;
          white-space: nowrap;
          will-change: transform, opacity;
        }
      `}</style>
    </>
  );
}
