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
        activeFillRef.current.style.transform = `scaleY(${progressRef.current})`;
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
        {/* What we build — vertical index + detail. The heading sits above a
            vertical list of all five capabilities; a progress spine fills down
            that list as it plays, and the active capability's glyph, body and
            specs show alongside it on the right. */}
        <SectionRise amount={0.15}>
          <div
            className="cap-vx"
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
            {/* Left: heading + vertical index of all five */}
            <div className="cap-vx__index">
              <Eyebrow number="02">What we build</Eyebrow>
              <h2 className="cap-vx__heading display">
                Five things, done well
                <span className="cap-vx__dot" aria-hidden>
                  .
                </span>
              </h2>
              <p className="cap-vx__intro">
                Not a full-service menu. We say no to most of what we&apos;re
                asked, so the work we ship is the work we&apos;re known for.
              </p>
              <ol className="cap-vx__list">
                {capabilities.map((cap, i) => {
                  const itemAccent = accentAt(i);
                  const active = !resetting && i === index;
                  const past = !resetting && i < index;
                  return (
                    <li
                      key={cap.id}
                      className="cap-vx__row"
                      data-active={active || undefined}
                      style={{ "--accent": itemAccent } as React.CSSProperties}
                    >
                      <button
                        type="button"
                        className="cap-vx__row-btn"
                        aria-current={active ? "true" : undefined}
                        onClick={() => goTo(i)}
                      >
                        <span className="cap-vx__spine">
                          {/* Past rows full; the active row's spine is filled by
                              rAF (scaleY on the DOM, no transition); the rest (and
                              the whole spine while resetting) ease empty in CSS. */}
                          <span
                            ref={active && !reduced ? activeFillRef : undefined}
                            className="cap-vx__spine-fill"
                            style={
                              active
                                ? reduced
                                  ? { transform: "scaleY(1)" }
                                  : { transition: "none" }
                                : { transform: `scaleY(${past ? 1 : 0})` }
                            }
                          />
                        </span>
                        <span className="cap-vx__no">0{i + 1}</span>
                        <span className="cap-vx__name">{cap.title}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>

            {/* Right: the active capability's detail */}
            <div className="cap-vx__stage">
              {capabilities.map((cap, i) => {
                const itemAccent = accentAt(i);
                const Glyph = GLYPHS[cap.id];
                const active = i === index;
                return (
                  <article
                    key={cap.id}
                    className="cap-vx__detail"
                    data-active={active || undefined}
                    aria-hidden={!active}
                    style={{ "--accent": itemAccent } as React.CSSProperties}
                  >
                    <div className="cap-vx__detail-head">
                      <span className="cap-vx__detail-no">
                        0{i + 1} <em>/ 0{n}</em>
                      </span>
                      {Glyph ? (
                        <span className="cap-vx__glyph" aria-hidden>
                          <Glyph size={72} />
                        </span>
                      ) : null}
                    </div>
                    <p className="cap-vx__body">{cap.body}</p>
                    <ul className="cap-vx__specs">
                      {cap.detail.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                  </article>
                );
              })}
            </div>
          </div>

          <style>{`
            /* Vertical index + detail: heading + a vertical list of all five
               on the left, the active capability's detail on the right. One
               column on phones (index above detail). */
            .cap-vx {
              display: grid;
              grid-template-columns: 1fr;
              gap: var(--space-12);
            }
            .cap-vx:focus-visible {
              outline: 2px solid var(--mint-deep);
              outline-offset: 10px;
              border-radius: 10px;
            }

            .cap-vx__heading {
              font-size: var(--type-4xl);
              line-height: 1.02;
              letter-spacing: var(--tracking-display);
              max-width: 18ch;
              margin-top: var(--space-5);
            }
            /* live through-line: the period takes the on-screen item's colour */
            .cap-vx__dot {
              color: var(--accent-now);
              transition: color 0.5s var(--ease-out-quint);
            }
            .cap-vx__intro {
              margin-top: var(--space-6);
              max-width: 38ch;
              font-size: var(--type-md);
              line-height: 1.55;
              color: var(--slate-ink);
            }

            /* ---- left: the vertical index ---- */
            .cap-vx__list {
              list-style: none;
              margin: var(--space-10) 0 0;
              padding: 0;
            }
            .cap-vx__row-btn {
              display: grid;
              grid-template-columns: 3px auto minmax(0, 1fr);
              align-items: center;
              column-gap: var(--space-5);
              width: 100%;
              /* no vertical padding + no list gap so the spines of consecutive
                 rows join into one continuous line down the index */
              min-height: clamp(3.25rem, 2.6rem + 1.4vw, 4.5rem);
              padding: 0;
              border: 0;
              background: none;
              text-align: left;
              cursor: pointer;
              color: var(--slate-ink);
            }
            .cap-vx__row-btn:focus-visible {
              outline: 2px solid var(--mint-deep);
              outline-offset: 4px;
              border-radius: 6px;
            }
            .cap-vx__spine {
              position: relative;
              align-self: stretch;
              width: 3px;
              border-radius: 999px;
              overflow: hidden;
              background: color-mix(in oklab, var(--ink) 14%, transparent);
            }
            .cap-vx__spine-fill {
              position: absolute;
              inset: 0;
              transform-origin: top center;
              transform: scaleY(0);
              border-radius: inherit;
              background: var(--accent);
              /* smooths click-to-fill and the drain; active overrides w/ none */
              transition: transform 0.5s var(--ease-out-quint);
            }
            .cap-vx__no {
              font-family: var(--font-mono);
              font-size: var(--type-xs);
              letter-spacing: var(--tracking-eyebrow);
              color: var(--accent);
              opacity: 0.7;
              transition: opacity 0.3s var(--ease-out-quint);
            }
            .cap-vx__name {
              font-family: var(--font-display);
              font-size: var(--type-lg);
              line-height: 1.08;
              letter-spacing: var(--tracking-display);
              color: var(--slate-ink);
              transition:
                color 0.3s var(--ease-out-quint),
                font-size 0.35s var(--ease-out-quint);
            }
            .cap-vx__row[data-active] .cap-vx__no { opacity: 1; }
            .cap-vx__row[data-active] .cap-vx__name {
              color: var(--ink);
              font-size: var(--type-2xl);
            }
            @media (hover: hover) {
              .cap-vx__row:not([data-active]) .cap-vx__row-btn:hover .cap-vx__name {
                color: var(--ink);
              }
            }

            /* ---- right: the active capability's detail ---- */
            .cap-vx__stage {
              position: relative;
              display: grid;
              min-height: clamp(15rem, 34vh, 20rem);
            }
            .cap-vx__detail {
              /* all details share one grid cell so they cross-fade in place */
              grid-area: 1 / 1;
              display: flex;
              flex-direction: column;
              opacity: 0;
              transform: translateY(14px);
              pointer-events: none;
              transition:
                opacity 0.55s var(--ease-out-quint),
                transform 0.55s var(--ease-out-quint);
            }
            .cap-vx__detail[data-active] {
              opacity: 1;
              transform: none;
              pointer-events: auto;
            }
            .cap-vx__detail-head {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              gap: var(--space-6);
              margin-bottom: var(--space-8);
            }
            .cap-vx__detail-no {
              font-family: var(--font-mono);
              font-size: var(--type-sm);
              letter-spacing: var(--tracking-eyebrow);
              text-transform: uppercase;
              color: var(--accent);
            }
            .cap-vx__detail-no em { font-style: normal; opacity: 0.5; }
            .cap-vx__glyph {
              color: var(--accent);
              flex: none;
              transform-origin: center;
            }
            /* Re-fires every time a detail gains [data-active] — i.e. on each
               advance — so the glyph "draws in" as the capability arrives. */
            .cap-vx__detail[data-active] .cap-vx__glyph {
              animation: cap-glyph-in 0.7s var(--ease-out-quint) both;
            }
            @keyframes cap-glyph-in {
              0% { opacity: 0; transform: translateY(10px) scale(0.7) rotate(-12deg); }
              60% { opacity: 1; }
              100% { opacity: 1; transform: none; }
            }
            .cap-vx__body {
              max-width: 46ch;
              font-size: var(--type-lg);
              line-height: var(--leading-normal);
              color: var(--slate-ink);
            }
            .cap-vx__specs {
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
            .cap-vx__specs li + li::before {
              content: "·";
              margin: 0 0.7em;
              color: var(--accent);
            }

            /* Two columns on wider screens: the vertical index on the left, the
               active capability's detail on the right, centred against it. */
            @media (min-width: 900px) {
              .cap-vx {
                grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
                column-gap: clamp(2.5rem, 6vw, 6rem);
                align-items: center;
              }
              .cap-vx__heading { margin-top: var(--space-6); }
            }

            @media (prefers-reduced-motion: reduce) {
              .cap-vx__detail { transition: none; }
              .cap-vx__detail[data-active] .cap-vx__glyph { animation: none; }
              .cap-vx__spine-fill { transition: none; }
              .cap-vx__name { transition: none; }
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
