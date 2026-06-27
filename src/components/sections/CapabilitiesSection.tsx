"use client";

/*
  Section 2 — Capabilities.
  Background: --mint-pale (lift from baseline).
  Type-dominance: 4xl (sub-display).
  Primary motion: SectionRise on the rail (M07 stand-in for M05 reveal).
  Supporting: M06 marquee at bottom (stack lineage, use #1 of 2).
  Cards run as a horizontal snap-scroll rail, each step coloured along the
  shared case ramp (navy → sky → light, see /work). A custom progress
  indicator below the rail mirrors the scroll position as a window onto the
  same gradient. VARIANCE 7 / MOTION 5 / DENSITY 4.
*/

import { useCallback, useEffect, useRef, useState } from "react";
import type { Capability } from "@/lib/content";
import type { MarqueeItem } from "@/lib/marquees";
import { SectionRise } from "@/components/motion/SectionRise";
import { Marquee } from "@/components/motion/Marquee";
import { Eyebrow } from "@/components/layout/Eyebrow";
import { GLYPHS } from "@/components/cases/CapabilityGlyph";
import { rampColor, inkFor, rgba, NAVY, SKY, LIGHT } from "@/lib/caseRamp";

// The indicator and the rail share one gradient so the moving thumb reads as
// a window onto the exact colours of the cards beneath it.
const RAMP_GRADIENT = `linear-gradient(90deg, ${NAVY}, ${SKY}, ${LIGHT})`;

export function CapabilitiesSection({
  capabilities,
  stackTokens,
}: {
  capabilities: Capability[];
  stackTokens: MarqueeItem[];
}) {
  const railRef = useRef<HTMLDivElement | null>(null);
  // progress: 0→1 across the scrollable width. thumb: fraction of the rail
  // currently visible (drives the indicator window's size).
  const [progress, setProgress] = useState(0);
  const [thumb, setThumb] = useState(1);

  const measure = useCallback(() => {
    const el = railRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setThumb(el.scrollWidth > 0 ? Math.min(1, el.clientWidth / el.scrollWidth) : 1);
    setProgress(max > 0 ? el.scrollLeft / max : 0);
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  const onScroll = () => {
    const el = railRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setProgress(max > 0 ? el.scrollLeft / max : 0);
  };

  const n = capabilities.length;

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

        {/* Cards — horizontal snap-scroll rail, coloured along the case ramp */}
        <SectionRise amount={0.1}>
          <div
            ref={railRef}
            onScroll={onScroll}
            className="cap-rail"
            role="region"
            aria-label="What we build — scroll horizontally"
            tabIndex={0}
          >
            {capabilities.map((cap, i) => {
              const t = n > 1 ? i / (n - 1) : 0;
              const bg = rampColor(t);
              const ink = inkFor(bg);
              const Glyph = GLYPHS[cap.id];
              return (
                <article
                  key={cap.id}
                  className="cap-card"
                  style={
                    {
                      "--card-bg": bg,
                      "--card-ink": ink,
                      "--card-muted": rgba(ink, 0.78),
                      "--card-line": rgba(ink, 0.22),
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

          {/* Scroll indicator — a window onto the same ramp the cards run on */}
          <div className="cap-indicator" aria-hidden>
            <span className="cap-indicator__track" />
            <span
              className="cap-indicator__thumb"
              style={{
                width: `${thumb * 100}%`,
                left: `${progress * (1 - thumb) * 100}%`,
                backgroundImage: RAMP_GRADIENT,
                backgroundSize: `${thumb > 0 ? (1 / thumb) * 100 : 100}% 100%`,
                backgroundPosition: `${progress * 100}% 0`,
              }}
            />
          </div>

          <style>{`
            .cap-rail {
              display: flex;
              gap: var(--space-6);
              overflow-x: auto;
              overscroll-behavior-x: contain;
              scroll-snap-type: x mandatory;
              -webkit-overflow-scrolling: touch;
              /* room so the cards' drop shadow isn't clipped by the overflow box */
              padding-block: var(--space-2);
              scrollbar-width: none; /* native bar hidden — we draw our own */
            }
            .cap-rail::-webkit-scrollbar { display: none; }
            .cap-rail:focus-visible {
              outline: 2px solid var(--mint-deep);
              outline-offset: 6px;
              border-radius: 4px;
            }
            .cap-card {
              flex: 0 0 clamp(18rem, 80vw, 25rem);
              scroll-snap-align: start;
              display: flex;
              flex-direction: column;
              min-height: clamp(22rem, 60vh, 27rem);
              padding: clamp(1.5rem, 1rem + 1.6vw, 2.25rem);
              border-radius: clamp(16px, 1.4vw, 22px);
              background: var(--card-bg);
              color: var(--card-ink);
              box-shadow:
                inset 0 1px 0 rgba(255, 255, 255, 0.14),
                0 26px 50px -34px rgba(10, 26, 63, 0.65);
            }
            @media (min-width: 768px) {
              .cap-rail { gap: var(--space-8); }
            }

            .cap-indicator {
              position: relative;
              height: 6px;
              margin-top: var(--space-8);
              border-radius: 999px;
            }
            .cap-indicator__track {
              position: absolute;
              inset: 0;
              border-radius: inherit;
              background: color-mix(in oklab, var(--ink) 14%, transparent);
            }
            .cap-indicator__thumb {
              position: absolute;
              top: 0;
              bottom: 0;
              border-radius: inherit;
              background-repeat: no-repeat;
              box-shadow: 0 1px 4px -1px rgba(10, 26, 63, 0.45);
              transition: none;
            }
            @media (prefers-reduced-motion: reduce) {
              .cap-rail { scroll-snap-type: none; scroll-behavior: auto; }
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
