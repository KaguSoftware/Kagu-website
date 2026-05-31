"use client";

/*
  Section 2 — Capabilities.
  Background: --mint-pale (lift from baseline).
  Type-dominance: 4xl (sub-display).
  Primary motion: SectionRise per card (M07 stand-in for M05 reveal).
  Supporting: M06 marquee at bottom (stack lineage, use #1 of 2).
  VARIANCE 7 / MOTION 5 / DENSITY 4. Asymmetric grid — NOT 3 equal cards.
*/

import type { Capability } from "@/lib/content";
import type { MarqueeItem } from "@/lib/marquees";
import { SectionRise } from "@/components/motion/SectionRise";
import { Marquee } from "@/components/motion/Marquee";
import { Eyebrow } from "@/components/layout/Eyebrow";
import { GLYPHS } from "@/components/cases/CapabilityGlyph";

// Hard asymmetry — varied spans + varied vertical offsets so adjacent cards
// never pair into rows. Card 2 sits deep, card 4 floats high, card 5 anchors
// off-center wide. Mobile falls back to single column.
const layout = [
  { colSpan: "md:col-span-7", offset: "" },
  { colSpan: "md:col-span-4 md:col-start-9", offset: "md:mt-(--space-48)" },
  { colSpan: "md:col-span-5 md:col-start-2", offset: "md:-mt-(--space-20)" },
  { colSpan: "md:col-span-6 md:col-start-7", offset: "md:mt-(--space-24)" },
  { colSpan: "md:col-span-8 md:col-start-3", offset: "md:mt-(--space-16)" },
];

export function CapabilitiesSection({
  capabilities,
  stackTokens,
}: {
  capabilities: Capability[];
  stackTokens: MarqueeItem[];
}) {
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

        {/* Cards — asymmetric grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-x-8 gap-y-(--space-16)">
          {capabilities.map((cap, i) => {
            const slot = layout[i] ?? layout[0];
            const Glyph = GLYPHS[cap.id];
            return (
              <SectionRise
                key={cap.id}
                as="article"
                className={`${slot.colSpan} ${slot.offset}`}
                delay={i * 0.08}
                amount={0.15}
              >
                <div className="flex items-start justify-between mb-(--space-5)">
                  <span
                    className="font-mono"
                    style={{
                      fontSize: "var(--type-xs)",
                      color: "var(--slate-ink)",
                      letterSpacing: "var(--tracking-eyebrow)",
                      textTransform: "uppercase",
                    }}
                  >
                    0{i + 1}
                  </span>
                  {Glyph ? (
                    <span style={{ color: "var(--slate-ink)" }}>
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
                  }}
                >
                  {cap.title}
                </h3>
                <p
                  style={{
                    fontSize: "var(--type-md)",
                    lineHeight: 1.55,
                    color: "var(--ink)",
                    marginBottom: "var(--space-6)",
                    maxWidth: "44ch",
                  }}
                >
                  {cap.body}
                </p>
                <ul
                  className="list-none p-0 m-0 font-mono"
                  style={{
                    borderTop: "1px solid var(--neutral)",
                    fontSize: "var(--type-xs)",
                    letterSpacing: "var(--tracking-eyebrow)",
                    textTransform: "uppercase",
                    color: "var(--slate-ink)",
                  }}
                >
                  {cap.detail.map((d) => (
                    <li
                      key={d}
                      style={{
                        padding: "var(--space-3) 0",
                        borderBottom: "1px solid color-mix(in oklab, var(--neutral) 60%, transparent)",
                      }}
                    >
                      {d}
                    </li>
                  ))}
                </ul>
              </SectionRise>
            );
          })}
        </div>

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
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "var(--type-4xl)",
                  color: "var(--slate-ink)",
                  padding: "0 var(--space-8)",
                  whiteSpace: "nowrap",
                }}
              >
                {t.label}
                <span style={{ color: "var(--mint-deep)", marginLeft: "var(--space-8)" }} aria-hidden>
                  ·
                </span>
              </span>
            ))}
          </Marquee>
        </div>
      </div>
    </section>
  );
}
