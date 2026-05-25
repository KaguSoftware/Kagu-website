"use client";

/*
  Section 3 — Selected Work.
  Background: --paper (return to baseline; work imagery carries the color).
  Type-dominance: 6xl on heading + 8xl is reserved.
  Primary motion: alternating mask-sweep reveal per card (simplified to SectionRise).
  Supporting: M14 cursor-trail-preview disabled here (homepage); M13 scroll skew (also Phase 3).
  VARIANCE 9 / MOTION 6 / DENSITY 3.

  Layout: full-bleed cases alternating with editorial text columns.
  Card hovers: --mint-deep / 20% wash. Cursor mode: view.
  ViewTransition name: work-${slug}-cover, paired with case-study hero.
*/

import Link from "next/link";
import { cases } from "@/data/cases";
import { SectionRise } from "@/components/motion/SectionRise";
import { MaskSweep, type SweepDirection } from "@/components/motion/MaskSweep";
import { Eyebrow } from "@/components/layout/Eyebrow";
import { ViewTransition } from "@/lib/view-transition";
import { CaseCover } from "@/components/cases/CaseCover";

const COVER_BG: Record<string, string> = {
  "mint-pale": "var(--mint-pale)",
  "mint-soft": "var(--mint-soft)",
  "mint-deep": "var(--mint-deep)",
  "slate-ink": "var(--slate-ink)",
  paper: "var(--paper)",
};

export function SelectedWorkSection() {
  return (
    <section
      aria-label="Selected work"
      style={{ background: "var(--paper)" }}
      className="px-(--container-x) py-(--section-y)"
    >
      <div className="w-full max-w-(--container-max) mx-auto">
        {/* Header */}
        <SectionRise className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-(--space-32) items-end">
          <div className="md:col-span-7">
            <Eyebrow number="03">Selected work</Eyebrow>
            <h2
              className="display"
              style={{
                fontSize: "var(--type-6xl)",
                lineHeight: 0.95,
                marginTop: "var(--space-6)",
                maxWidth: "14ch",
              }}
            >
              Four operators, in production.
            </h2>
          </div>
          <div className="md:col-span-4 md:col-start-9">
            <Link
              href="/work"
              data-cursor="view"
              className="font-mono inline-flex items-center gap-3"
              style={{
                fontSize: "var(--type-sm)",
                letterSpacing: "var(--tracking-eyebrow)",
                textTransform: "uppercase",
                color: "var(--ink)",
                borderBottom: "1px solid var(--neutral)",
                paddingBottom: "var(--space-2)",
              }}
            >
              All work
              <span aria-hidden style={{ width: 32, height: 1, background: "var(--ink)" }} />
            </Link>
          </div>
        </SectionRise>

        {/* Cases — alternating left/right column placement AND mask-sweep direction.
            Direction logic: odd cards reveal right-to-left ("looking back"),
            even cards reveal left-to-right ("moving forward"). Reads as rhythm,
            not noise. */}
        <div className="flex flex-col gap-(--space-40)">
          {cases.map((c, i) => {
            const isOdd = i % 2 === 1;
            const sweepDir: SweepDirection = isOdd ? "left" : "right";
            return (
              <SectionRise
                key={c.slug}
                as="article"
                className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end"
                amount={0.18}
              >
                {/* Cover */}
                <Link
                  href={`/work/${c.slug}`}
                  data-cursor="view"
                  className={`md:col-span-8 ${isOdd ? "md:col-start-5 order-1 md:order-2" : ""} group block relative`}
                  style={{
                    aspectRatio: "16 / 11",
                    background: COVER_BG[c.cover.bg] ?? "var(--paper)",
                    overflow: "hidden",
                    border: "1px solid var(--neutral)",
                  }}
                >
                  <MaskSweep direction={sweepDir} className="absolute inset-0">
                    <ViewTransition name={`work-${c.slug}-cover`}>
                      <CaseCover
                        url={c.url}
                        label={c.cover.label}
                        bg={c.cover.bg}
                        labelSize="var(--type-5xl)"
                      />
                    </ViewTransition>
                  </MaskSweep>
                  {/* Hover wash */}
                  <div
                    aria-hidden
                    className="kagu-work-wash"
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "var(--mint-deep)",
                      mixBlendMode: "multiply",
                      opacity: 0,
                      transition: "opacity 320ms cubic-bezier(0.6,0.01,0.05,0.95)",
                      zIndex: 2,
                    }}
                  />
                  <style>{`
                    a:hover .kagu-work-wash,
                    a:focus-visible .kagu-work-wash { opacity: 0.2; }
                  `}</style>
                </Link>

                {/* Meta column */}
                <div className={`md:col-span-4 ${isOdd ? "md:col-start-1 md:row-start-1 order-2 md:order-1" : ""}`}>
                  <span
                    className="font-mono block"
                    style={{
                      fontSize: "var(--type-xs)",
                      letterSpacing: "var(--tracking-eyebrow)",
                      textTransform: "uppercase",
                      color: "var(--slate-ink)",
                      marginBottom: "var(--space-3)",
                    }}
                  >
                    {String(i + 1).padStart(2, "0")} · {c.sector} · {c.year}
                  </span>
                  <h3
                    className="display"
                    style={{
                      fontSize: "var(--type-4xl)",
                      lineHeight: 1,
                      marginBottom: "var(--space-4)",
                    }}
                  >
                    {c.client}
                  </h3>
                  <p
                    style={{
                      fontSize: "var(--type-md)",
                      lineHeight: 1.55,
                      color: "var(--ink)",
                      marginBottom: "var(--space-6)",
                    }}
                  >
                    {c.project}
                  </p>
                  <Link
                    href={`/work/${c.slug}`}
                    data-cursor="view"
                    className="font-mono inline-flex items-center gap-3"
                    style={{
                      fontSize: "var(--type-xs)",
                      letterSpacing: "var(--tracking-eyebrow)",
                      textTransform: "uppercase",
                      color: "var(--ink)",
                      borderBottom: "1px solid var(--mint-deep)",
                      paddingBottom: 6,
                    }}
                  >
                    Read case
                    <span aria-hidden style={{ width: 28, height: 1, background: "var(--mint-deep)" }} />
                  </Link>
                </div>
              </SectionRise>
            );
          })}
        </div>
      </div>
    </section>
  );
}
