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

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import type { Capability } from "@/lib/content";
import type { MarqueeItem } from "@/lib/marquees";
import { SectionRise } from "@/components/motion/SectionRise";
import { Marquee } from "@/components/motion/Marquee";
import { Eyebrow } from "@/components/layout/Eyebrow";
import { GLYPHS } from "@/components/cases/CapabilityGlyph";
import { rampColor } from "@/lib/caseRamp";

// Autoplay dwell per capability (ms). The progress fill animation matches this.
const AUTOPLAY_MS = 4200;

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

  const go = (dir: number) => setIndex((p) => (p + dir + n) % n);

  // Autoplay — pauses on hover/focus and when reduced motion is requested.
  useEffect(() => {
    if (paused || reduced || n <= 1) return;
    const id = setInterval(() => setIndex((p) => (p + 1) % n), AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [paused, reduced, n]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      go(-1);
    } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      go(1);
    }
  };

  return (
    <section
      aria-label="Capabilities"
      style={{ background: "var(--mint-pale)" }}
      className="px-(--container-x) py-(--section-y)"
    >
      <div className="w-full max-w-(--container-max) mx-auto">
        {/* Header row */}
        <SectionRise className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-(--space-24)">
          <div className="md:col-span-5">
            <Eyebrow number="02">What we build</Eyebrow>
          </div>
          <div className="md:col-span-6 md:col-start-7">
            <h2
              className="display"
              style={{ fontSize: "var(--type-4xl)", lineHeight: 1, maxWidth: "18ch" }}
            >
              Five things, done well.
            </h2>
            <p
              style={{
                fontSize: "var(--type-md)",
                lineHeight: 1.55,
                marginTop: "var(--space-6)",
                maxWidth: "44ch",
                color: "var(--ink)",
              }}
            >
              Not a full-service menu. We say no to most of what we&apos;re asked, so
              the work we ship is the work we&apos;re known for.
            </p>
          </div>
        </SectionRise>

        {/* Showcase — one capability at a time, ramp colour as accent only */}
        <SectionRise amount={0.1}>
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
          >
            <div className="cap-show__stage">
              {capabilities.map((cap, i) => {
                const accent = rampColor(n > 1 ? i / (n - 1) : 0);
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
                    <span className="cap-show__rule" aria-hidden />
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
                  const seg = rampColor(n > 1 ? i / (n - 1) : 0);
                  const active = i === index;
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
                        onClick={() => setIndex(i)}
                      >
                        <span className="cap-show__seg-track">
                          {/* One persistent fill per segment: the active one
                              animates 0→100% over the dwell; when its turn ends
                              it eases back to empty. No cumulative reset, so the
                              first segment never snaps and the last fills fully. */}
                          <span
                            className="cap-show__seg-fill"
                            data-active={active || undefined}
                            style={
                              active
                                ? {
                                    animationDuration: `${AUTOPLAY_MS}ms`,
                                    animationPlayState: paused ? "paused" : "running",
                                  }
                                : undefined
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
            .cap-show:focus-visible {
              outline: 2px solid var(--mint-deep);
              outline-offset: 10px;
              border-radius: 10px;
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
            .cap-show__rule {
              display: block;
              width: clamp(3rem, 7vw, 5rem);
              height: 3px;
              margin: var(--space-6) 0;
              border-radius: 999px;
              background: var(--accent);
            }
            .cap-show__body {
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

            /* Footer: timeline + up/down stepper */
            .cap-show__footer {
              display: flex;
              align-items: center;
              gap: var(--space-8);
              margin-top: var(--space-12);
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
              /* eases back to empty once the segment is no longer active */
              transition: transform 0.5s var(--ease-out-quint);
            }
            .cap-show__seg-fill[data-active] {
              animation: cap-seg-fill 4200ms linear forwards;
            }
            @keyframes cap-seg-fill {
              from { transform: scaleX(0); }
              to { transform: scaleX(1); }
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

            @media (prefers-reduced-motion: reduce) {
              .cap-show__item { transition: none; }
              .cap-show__item[data-active] .cap-show__glyph { animation: none; }
              .cap-show__seg-fill { transition: none; }
              .cap-show__seg-fill[data-active] { animation: none; transform: scaleX(1); }
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
