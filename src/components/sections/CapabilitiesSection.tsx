"use client";

/*
  Section 2 — Capabilities.
  Background: --mint-pale (lift from baseline).
  Type-dominance: 4xl (sub-display).
  Primary motion: SectionRise on the deck (M07 stand-in for M05 reveal).
  Supporting: M06 marquee at bottom (stack lineage, use #1 of 2).
  Cards run as a vertical card-deck carousel — stacked behind each other,
  each step coloured along the shared case ramp (navy → sky → light, see
  /work). It auto-advances and steps with the up/down controls or arrow keys;
  the ramp-coloured dots double as a position indicator. VARIANCE 7 / MOTION 5.
*/

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import type { Capability } from "@/lib/content";
import type { MarqueeItem } from "@/lib/marquees";
import { SectionRise } from "@/components/motion/SectionRise";
import { Marquee } from "@/components/motion/Marquee";
import { Eyebrow } from "@/components/layout/Eyebrow";
import { GLYPHS } from "@/components/cases/CapabilityGlyph";
import { rampColor, inkFor, rgba } from "@/lib/caseRamp";

// How many cards peek out behind the active one before they're hidden.
const DEPTH = 3;
// Autoplay dwell per card (ms).
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

        {/* Cards — vertical card-deck carousel, coloured along the case ramp */}
        <SectionRise amount={0.1}>
          <div
            className="cap-deck"
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
            <div className="cap-deck__stage">
              {capabilities.map((cap, i) => {
                const t = n > 1 ? i / (n - 1) : 0;
                const bg = rampColor(t);
                const ink = inkFor(bg);
                const Glyph = GLYPHS[cap.id];
                // 0 = front; larger = deeper in the stack (wraps so it loops).
                const pos = (i - index + n) % n;
                const hidden = pos > DEPTH;
                return (
                  <article
                    key={cap.id}
                    className="cap-card"
                    aria-hidden={pos !== 0}
                    style={
                      {
                        "--card-bg": bg,
                        "--card-ink": ink,
                        "--card-muted": rgba(ink, 0.78),
                        "--card-line": rgba(ink, 0.22),
                        zIndex: n - pos,
                        opacity: hidden ? 0 : 1 - pos * 0.18,
                        transform: `translateY(${-pos * 20}px) scale(${1 - pos * 0.05})`,
                        pointerEvents: pos === 0 ? "auto" : "none",
                      } as React.CSSProperties
                    }
                  >
                    <div className="flex items-start justify-between mb-(--space-5)">
                      <span
                        className="font-mono"
                        style={{
                          fontSize: "var(--type-xs)",
                          color: "var(--card-muted)",
                          letterSpacing: "var(--tracking-eyebrow)",
                          textTransform: "uppercase",
                        }}
                      >
                        0{i + 1}
                      </span>
                      {Glyph ? (
                        <span style={{ color: "var(--card-ink)" }}>
                          <Glyph size={48} />
                        </span>
                      ) : null}
                    </div>
                    <h3
                      className="display"
                      style={{
                        fontSize: "var(--type-2xl)",
                        lineHeight: 1.05,
                        marginBottom: "var(--space-5)",
                        color: "var(--card-ink)",
                      }}
                    >
                      {cap.title}
                    </h3>
                    <p
                      style={{
                        fontSize: "var(--type-md)",
                        lineHeight: 1.55,
                        color: "var(--card-muted)",
                        marginBottom: "var(--space-6)",
                      }}
                    >
                      {cap.body}
                    </p>
                    <ul
                      className="list-none p-0 m-0 font-mono"
                      style={{
                        marginTop: "auto",
                        borderTop: "1px solid var(--card-line)",
                        fontSize: "var(--type-xs)",
                        letterSpacing: "var(--tracking-eyebrow)",
                        textTransform: "uppercase",
                        color: "var(--card-muted)",
                      }}
                    >
                      {cap.detail.map((d) => (
                        <li
                          key={d}
                          style={{
                            padding: "var(--space-3) 0",
                            borderBottom: "1px solid var(--card-line)",
                          }}
                        >
                          {d}
                        </li>
                      ))}
                    </ul>
                  </article>
                );
              })}
            </div>

            {/* Up / down controls + ramp-coloured position indicator */}
            <div className="cap-deck__controls">
              <button
                type="button"
                className="cap-deck__nav"
                onClick={() => go(-1)}
                aria-label="Previous"
              >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M6 14l6-6 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <ol className="cap-deck__dots">
                {capabilities.map((cap, i) => (
                  <li key={cap.id}>
                    <button
                      type="button"
                      className="cap-deck__dot"
                      aria-label={`Show: ${cap.title}`}
                      aria-current={i === index ? "true" : undefined}
                      data-active={i === index || undefined}
                      onClick={() => setIndex(i)}
                      style={
                        {
                          "--dot": rampColor(n > 1 ? i / (n - 1) : 0),
                        } as React.CSSProperties
                      }
                    />
                  </li>
                ))}
              </ol>
              <button
                type="button"
                className="cap-deck__nav"
                onClick={() => go(1)}
                aria-label="Next"
              >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M6 10l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>

          <style>{`
            .cap-deck {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: var(--space-8);
            }
            .cap-deck:focus-visible {
              outline: 2px solid var(--mint-deep);
              outline-offset: 10px;
              border-radius: 10px;
            }
            .cap-deck__stage {
              position: relative;
              width: 100%;
              max-width: 42rem;
              height: clamp(23rem, 62vh, 29rem);
            }
            .cap-card {
              position: absolute;
              inset: 0;
              display: flex;
              flex-direction: column;
              overflow: hidden;
              padding: clamp(1.6rem, 1rem + 1.8vw, 2.6rem);
              border-radius: clamp(18px, 1.6vw, 26px);
              background: var(--card-bg);
              color: var(--card-ink);
              box-shadow:
                inset 0 1px 0 rgba(255, 255, 255, 0.14),
                0 30px 60px -34px rgba(10, 26, 63, 0.7);
              transform-origin: center;
              transition:
                transform 0.6s cubic-bezier(0.22, 1, 0.36, 1),
                opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1);
            }

            /* Controls: a row beneath the deck on phones, a column beside it on
               wider screens (handled in the md breakpoint below). */
            .cap-deck__controls {
              display: flex;
              flex-direction: row;
              align-items: center;
              gap: var(--space-6);
            }
            .cap-deck__nav {
              display: inline-flex;
              align-items: center;
              justify-content: center;
              width: 2.75rem;
              height: 2.75rem;
              padding: 0;
              border-radius: 999px;
              border: 1px solid color-mix(in oklab, var(--ink) 24%, transparent);
              background: var(--paper);
              color: var(--ink);
              cursor: pointer;
              transition:
                background 0.25s var(--ease-out-quint),
                color 0.25s var(--ease-out-quint),
                border-color 0.25s var(--ease-out-quint),
                transform 0.25s var(--ease-out-quint);
            }
            .cap-deck__nav svg { width: 1.15rem; height: 1.15rem; }
            .cap-deck__nav:focus-visible {
              outline: 2px solid var(--mint-deep);
              outline-offset: 2px;
            }
            @media (hover: hover) {
              .cap-deck__nav:hover {
                background: var(--ink);
                color: var(--paper);
                border-color: var(--ink);
              }
            }
            .cap-deck__dots {
              display: flex;
              flex-direction: row;
              align-items: center;
              gap: var(--space-4);
              list-style: none;
              margin: 0;
              padding: 0;
            }
            .cap-deck__dot {
              display: block;
              width: 11px;
              height: 11px;
              padding: 0;
              border: 0;
              border-radius: 999px;
              background: var(--dot);
              opacity: 0.38;
              cursor: pointer;
              transition: opacity 0.3s var(--ease-out-quint), transform 0.3s var(--ease-out-quint);
            }
            .cap-deck__dot[data-active] { opacity: 1; transform: scale(1.4); }
            .cap-deck__dot:focus-visible {
              outline: 2px solid var(--mint-deep);
              outline-offset: 3px;
            }

            @media (min-width: 768px) {
              .cap-deck {
                flex-direction: row;
                align-items: center;
                justify-content: center;
                gap: var(--space-16);
              }
              .cap-deck__controls { flex-direction: column; }
              .cap-deck__dots { flex-direction: column; }
            }

            @media (prefers-reduced-motion: reduce) {
              .cap-card,
              .cap-deck__dot,
              .cap-deck__nav { transition: none; }
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
