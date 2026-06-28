"use client";

/*
  Section 2 — Capabilities.
  Background: --mint-pale (lift from baseline).
  Type-dominance: 4xl (sub-display).
  Primary motion: SectionRise on the showcase (M07 stand-in for M05 reveal).
  Supporting: M06 marquee at bottom (stack lineage, use #1 of 2).
  Capabilities run as a minimal editorial showcase — one at a time, big type
  on the section surface, no panels. The shared case ramp (navy → sky → light,
  see /work) is used only as an accent (index, glyph, rule, spec separators)
  and as the colour of a self-filling progress timeline. It auto-advances and
  steps with the up/down controls or arrow keys. VARIANCE 7 / MOTION 5.
*/

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import type { Capability } from "@/lib/content";
import type { MarqueeItem } from "@/lib/marquees";
import { SectionRise } from "@/components/motion/SectionRise";
import { Marquee } from "@/components/motion/Marquee";
import { Eyebrow } from "@/components/layout/Eyebrow";
import { GLYPHS } from "@/components/cases/CapabilityGlyph";
import { rampColor } from "@/lib/caseRamp";

// Autoplay dwell per capability (ms) — how long the active segment takes to fill.
const AUTOPLAY_MS = 4200;
// Time the whole bar takes to drain back to empty when a cycle completes (ms).
const RESET_MS = 520;

export function CapabilitiesSection({
  capabilities,
  stackTokens,
}: {
  capabilities: Capability[];
  stackTokens: MarqueeItem[];
}) {
  const reduced = useReducedMotion();
  const n = capabilities.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  // While true the bar drains every segment to empty before restarting at 0,
  // so the loop never snaps the first segment from full back to nothing.
  const [resetting, setResetting] = useState(false);

  // The active segment's fill is driven straight on the DOM (rAF) so its
  // progress survives re-renders and pause/resume without re-animating.
  const activeFillRef = useRef<HTMLSpanElement | null>(null);
  const progressRef = useRef(0); // 0→1 fill of the active segment
  const rafRef = useRef(0);

  const goTo = (i: number) => {
    progressRef.current = 0;
    setResetting(false);
    setIndex(((i % n) + n) % n);
  };
  const go = (dir: number) => goTo(index + dir);

  // Drive the active fill and advance when it tops out. On the last segment we
  // enter the drain phase instead of wrapping straight to 0.
  useEffect(() => {
    if (paused || reduced || resetting || n <= 1) return;
    let prev: number | undefined;
    const tick = (ts: number) => {
      if (prev === undefined) prev = ts;
      progressRef.current = Math.min(progressRef.current + (ts - prev) / AUTOPLAY_MS, 1);
      prev = ts;
      if (activeFillRef.current) {
        activeFillRef.current.style.transform = `scaleX(${progressRef.current})`;
      }
      if (progressRef.current >= 1) {
        progressRef.current = 0;
        if (index === n - 1) setResetting(true);
        else setIndex(index + 1);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [index, paused, reduced, resetting, n]);

  // After the drain animation finishes, restart the cycle from the first item.
  useEffect(() => {
    if (!resetting) return;
    const t = setTimeout(() => {
      setIndex(0);
      setResetting(false);
    }, RESET_MS);
    return () => clearTimeout(t);
  }, [resetting]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      go(-1);
    } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      go(1);
    }
  };

  // Accent ramp trimmed at the dark end: pure navy (/work's first folder)
  // disappears on this dark surface, so we start at a visible medium-blue and
  // keep the blue → sky → light identity across the set.
  const accentAt = (i: number) =>
    rampColor(n > 1 ? 0.3 + 0.7 * (i / (n - 1)) : 0.65);

  // Colour of the item on screen — carried into the header so the title visibly
  // belongs to whichever capability is playing.
  const accent = accentAt(index);

  return (
    <section
      aria-label="Capabilities"
      style={{ background: "var(--mint-pale)" }}
      className="px-(--container-x) py-(--section-y)"
    >
      <div className="w-full max-w-(--container-max) mx-auto">
        {/* What we build — header and showcase as one composition: the title
            block and the progress console occupy the left column, the active
            capability plays in the right. The heading sits directly above the
            five progress segments, so it reads as part of the set rather than a
            detached band, and they reveal together in a single motion. */}
        <SectionRise amount={0.15}>
          <div
            className="cap-show"
            role="group"
            aria-roledescription="carousel"
            aria-label="What we build"
            tabIndex={0}
            onKeyDown={onKeyDown}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
            style={{ "--accent-now": accent } as React.CSSProperties}
          >
            <div className="cap-show__header">
              <Eyebrow number="02">What we build</Eyebrow>
              <h2 className="cap-show__heading display">
                Five things, done well
                <span className="cap-show__dot" aria-hidden>
                  .
                </span>
              </h2>
              <p className="cap-show__intro">
                Not a full-service menu. We say no to most of what we&apos;re
                asked, so the work we ship is the work we&apos;re known for.
              </p>
            </div>

            <div className="cap-show__stage">
              {capabilities.map((cap, i) => {
                const accent = accentAt(i);
                const Glyph = GLYPHS[cap.id];
                const active = i === index;
                return (
                  <article
                    key={cap.id}
                    className="cap-show__item"
                    data-active={active || undefined}
                    aria-hidden={!active}
                    style={{ "--accent": accent } as React.CSSProperties}
                  >
                    <div className="cap-show__head">
                      <span className="cap-show__no">
                        0{i + 1} <em>/ 0{n}</em>
                      </span>
                      {Glyph ? (
                        <span className="cap-show__glyph" aria-hidden>
                          <Glyph size={64} />
                        </span>
                      ) : null}
                    </div>
                    <h3 className="cap-show__title display">{cap.title}</h3>
                    <p className="cap-show__body">{cap.body}</p>
                    <ul className="cap-show__specs">
                      {cap.detail.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                  </article>
                );
              })}
            </div>

            {/* Self-filling progress timeline (also the up/down stepper) */}
            <div className="cap-show__footer">
              <ol className="cap-show__timeline">
                {capabilities.map((cap, i) => {
                  const seg = accentAt(i);
                  const active = !resetting && i === index;
                  const past = !resetting && i < index;
                  return (
                    <li
                      key={cap.id}
                      className="cap-show__seg"
                      data-active={active || undefined}
                      style={{ "--seg": seg } as React.CSSProperties}
                    >
                      <button
                        type="button"
                        className="cap-show__seg-btn"
                        aria-label={`Show: ${cap.title}`}
                        aria-current={active ? "true" : undefined}
                        onClick={() => goTo(i)}
                      >
                        <span className="cap-show__seg-track">
                          {/* Past segments stay full; the active one is filled by
                              rAF (transform set on the DOM, no CSS transition);
                              everything else (and the whole bar while resetting)
                              eases to empty via the CSS transition below. */}
                          <span
                            ref={active && !reduced ? activeFillRef : undefined}
                            className="cap-show__seg-fill"
                            style={
                              active
                                ? reduced
                                  ? { transform: "scaleX(1)" }
                                  : { transition: "none" }
                                : { transform: `scaleX(${past ? 1 : 0})` }
                            }
                          />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
              <div className="cap-show__nav-group">
                <button
                  type="button"
                  className="cap-show__nav"
                  onClick={() => go(-1)}
                  aria-label="Previous"
                >
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M14 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="cap-show__nav"
                  onClick={() => go(1)}
                  aria-label="Next"
                >
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M10 6l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <style>{`
            /* One composition: header + console (left) and the playing
               capability (right). On a single column they stack
               header → stage → footer in reading order. */
            .cap-show {
              display: grid;
              grid-template-columns: 1fr;
              grid-template-areas: "header" "stage" "footer";
              gap: var(--space-10);
            }
            .cap-show__header { grid-area: header; align-self: start; }
            .cap-show__stage { grid-area: stage; }
            .cap-show__footer { grid-area: footer; }
            .cap-show:focus-visible {
              outline: 2px solid var(--mint-deep);
              outline-offset: 10px;
              border-radius: 10px;
            }

            .cap-show__heading {
              font-size: var(--type-4xl);
              line-height: 1.02;
              letter-spacing: var(--tracking-display);
              max-width: 18ch;
              margin-top: var(--space-5);
            }
            /* live through-line: the period takes the on-screen item's colour */
            .cap-show__dot {
              color: var(--accent-now);
              transition: color 0.5s var(--ease-out-quint);
            }
            .cap-show__intro {
              margin-top: var(--space-6);
              max-width: 40ch;
              font-size: var(--type-md);
              line-height: 1.55;
              color: var(--slate-ink);
            }

            .cap-show__stage {
              position: relative;
              width: 100%;
              display: grid;
              min-height: clamp(20rem, 46vh, 26rem);
            }
            .cap-show__item {
              /* every item shares the same grid cell so they overlap for the
                 cross-fade while the cell sizes to the tallest one (no clipping
                 or overflow into the footer on short screens). */
              grid-area: 1 / 1;
              display: flex;
              flex-direction: column;
              justify-content: center;
              opacity: 0;
              transform: translateY(16px);
              pointer-events: none;
              transition:
                opacity 0.55s var(--ease-out-quint),
                transform 0.55s var(--ease-out-quint);
            }
            .cap-show__item[data-active] {
              opacity: 1;
              transform: none;
              pointer-events: auto;
            }
            .cap-show__head {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              gap: var(--space-6);
              margin-bottom: var(--space-6);
            }
            .cap-show__no {
              font-family: var(--font-mono);
              font-size: var(--type-sm);
              letter-spacing: var(--tracking-eyebrow);
              text-transform: uppercase;
              color: var(--accent);
            }
            .cap-show__no em { font-style: normal; opacity: 0.5; }
            .cap-show__glyph {
              color: var(--accent);
              flex: none;
              transform-origin: center;
            }
            /* Re-fires every time an item gains [data-active] — i.e. on each
               advance — so the glyph "draws in" as the slide arrives. */
            .cap-show__item[data-active] .cap-show__glyph {
              animation: cap-glyph-in 0.7s var(--ease-out-quint) both;
            }
            @keyframes cap-glyph-in {
              0% { opacity: 0; transform: translateY(10px) scale(0.7) rotate(-12deg); }
              60% { opacity: 1; }
              100% { opacity: 1; transform: none; }
            }
            .cap-show__title {
              font-size: clamp(2.5rem, 1.5rem + 4.6vw, 5.5rem);
              line-height: 0.98;
              letter-spacing: var(--tracking-display);
              color: var(--ink);
              max-width: 16ch;
            }
            .cap-show__body {
              margin-top: var(--space-6);
              max-width: 48ch;
              font-size: var(--type-lg);
              line-height: var(--leading-normal);
              color: var(--slate-ink);
            }
            .cap-show__specs {
              display: flex;
              flex-wrap: wrap;
              align-items: center;
              list-style: none;
              margin: var(--space-8) 0 0;
              padding: 0;
              font-family: var(--font-mono);
              font-size: var(--type-xs);
              letter-spacing: var(--tracking-eyebrow);
              text-transform: uppercase;
              color: var(--slate-ink);
            }
            .cap-show__specs li + li::before {
              content: "·";
              margin: 0 0.7em;
              color: var(--accent);
            }

            /* Footer: timeline + up/down stepper (grid gap handles spacing) */
            .cap-show__footer {
              display: flex;
              align-items: center;
              gap: var(--space-6);
            }
            .cap-show__timeline {
              flex: 1;
              display: flex;
              gap: var(--space-3);
              list-style: none;
              margin: 0;
              padding: 0;
            }
            .cap-show__seg { flex: 1; }
            .cap-show__seg-btn {
              display: block;
              width: 100%;
              padding: var(--space-3) 0;
              border: 0;
              background: none;
              cursor: pointer;
            }
            .cap-show__seg-btn:focus-visible {
              outline: 2px solid var(--mint-deep);
              outline-offset: 4px;
              border-radius: 4px;
            }
            .cap-show__seg-track {
              display: block;
              position: relative;
              height: 3px;
              border-radius: 999px;
              overflow: hidden;
              background: color-mix(in oklab, var(--ink) 16%, transparent);
              transition: height 0.25s var(--ease-out-quint);
            }
            .cap-show__seg[data-active] .cap-show__seg-track { height: 4px; }
            .cap-show__seg-fill {
              position: absolute;
              inset: 0;
              transform-origin: left center;
              transform: scaleX(0);
              border-radius: inherit;
              background: var(--seg);
              /* smooths click-to-fill and the end-of-cycle drain; the active
                 segment overrides this with transition:none (rAF drives it). */
              transition: transform 0.5s var(--ease-out-quint);
            }

            .cap-show__nav-group { display: flex; gap: var(--space-2); flex: none; }
            .cap-show__nav {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              width: 2.6rem;
              height: 1.7rem;
              padding: 0;
              border-radius: 999px;
              border: 1px solid color-mix(in oklab, var(--ink) 22%, transparent);
              background: transparent;
              color: var(--ink);
              cursor: pointer;
              transition:
                background 0.25s var(--ease-out-quint),
                color 0.25s var(--ease-out-quint),
                border-color 0.25s var(--ease-out-quint);
            }
            .cap-show__nav svg { width: 1rem; height: 1rem; }
            .cap-show__nav:focus-visible {
              outline: 2px solid var(--mint-deep);
              outline-offset: 2px;
            }
            @media (hover: hover) {
              .cap-show__nav:hover {
                background: var(--ink);
                color: var(--paper);
                border-color: var(--ink);
              }
            }

            /* Two columns: title + console on the left, the playing capability
               on the right. The middle row flexes so the console settles at the
               stage's baseline and header/items share one visual frame. */
            @media (min-width: 900px) {
              .cap-show {
                grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
                grid-template-rows: auto 1fr auto;
                grid-template-areas:
                  "header stage"
                  ".      stage"
                  "footer stage";
                column-gap: clamp(2rem, 5vw, 5rem);
                row-gap: var(--space-8);
                align-items: start;
              }
              .cap-show__stage { align-self: stretch; }
              .cap-show__footer { align-self: end; }
              .cap-show__heading { margin-top: var(--space-6); }
            }

            @media (prefers-reduced-motion: reduce) {
              .cap-show__item { transition: none; }
              .cap-show__item[data-active] .cap-show__glyph { animation: none; }
              .cap-show__seg-fill { transition: none; }
            }
          `}</style>
        </SectionRise>

        {/* Stack marquee */}
        <div style={{ marginTop: "var(--space-32)", borderTop: "1px solid var(--neutral)", paddingTop: "var(--space-8)" }}>
          <span
            className="eyebrow block"
            style={{ marginBottom: "var(--space-5)" }}
          >
            Stack lineage · always
          </span>
          <Marquee duration={36}>
            {stackTokens.map((t) => (
              <span
                key={t.label}
                className="kagu-marquee-token"
                style={{
                  fontFamily: "var(--font-display)",
                  color: "var(--slate-ink)",
                  whiteSpace: "nowrap",
                }}
              >
                {t.label}
                <span className="kagu-marquee-token__dot" style={{ color: "var(--mint-deep)" }} aria-hidden>
                  ·
                </span>
              </span>
            ))}
          </Marquee>
          <style>{`
            /* Marquee text is sized down on phones so a single token doesn't
               span the whole viewport and strobe past. */
            .kagu-marquee-token {
              font-size: var(--type-2xl);
              padding: 0 var(--space-5);
            }
            .kagu-marquee-token__dot { margin-left: var(--space-5); }
            @media (min-width: 768px) {
              .kagu-marquee-token { font-size: var(--type-4xl); padding: 0 var(--space-8); }
              .kagu-marquee-token__dot { margin-left: var(--space-8); }
            }
          `}</style>
        </div>
      </div>
    </section>
  );
}
