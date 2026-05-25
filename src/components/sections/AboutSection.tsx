"use client";

/*
  Section 5 — About / Studio.
  Background: --paper (return to baseline; quiet for principles + bio).
  Type-dominance: 6xl mission statement.
  Primary motion: M04 word-mask-reveal on mission (use #2 of ≤3 on page).
  Supporting: SectionRise on principles grid.
  VARIANCE 6 / MOTION 4 / DENSITY 4.

  Replaces the brief's team grid with a Studio block + principles grid,
  since Kagu has no public team. Per the plan's brief-vs-reality
  reconciliation in BUILD_LOG.md.
*/

import { studio } from "@/data/studio";
import { SectionRise } from "@/components/motion/SectionRise";
import { WordMaskReveal } from "@/components/motion/WordMaskReveal";
import { Eyebrow } from "@/components/layout/Eyebrow";

export function AboutSection() {
  return (
    <section
      aria-label="About"
      style={{ background: "var(--paper)" }}
      className="px-(--container-x) py-(--section-y)"
    >
      <div className="w-full max-w-(--container-max) mx-auto">
        {/* Mission */}
        <SectionRise className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-(--space-40) items-end">
          <div className="md:col-span-3">
            <Eyebrow number="05">Studio</Eyebrow>
          </div>
          <div className="md:col-span-9">
            <WordMaskReveal
              as="h2"
              text="We build for small teams that care about the operating, not the announcing."
              className="display"
            />
            <p
              style={{
                fontSize: "var(--type-md)",
                lineHeight: 1.6,
                color: "var(--ink)",
                marginTop: "var(--space-8)",
                maxWidth: "58ch",
              }}
            >
              Kagu is small on purpose. The people who write the code are the
              people in the meetings. We work in hospitality, tourism, and
              operator-facing software, verticals where production is the
              deliverable, not the kickoff deck.
            </p>
          </div>
        </SectionRise>

        {/* Principles grid */}
        <SectionRise className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-(--space-16)">
          {studio.principles.map((p, i) => (
            <article
              key={p.title}
              style={{
                borderTop: "1px solid var(--neutral)",
                paddingTop: "var(--space-6)",
              }}
            >
              <span
                className="font-mono block"
                style={{
                  fontSize: "var(--type-xs)",
                  color: "var(--mint-deep)",
                  letterSpacing: "var(--tracking-eyebrow)",
                  textTransform: "uppercase",
                  marginBottom: "var(--space-4)",
                }}
              >
                Principle {String(i + 1).padStart(2, "0")}
              </span>
              <h3
                className="display"
                style={{
                  fontSize: "var(--type-2xl)",
                  lineHeight: 1.05,
                  marginBottom: "var(--space-4)",
                  maxWidth: "20ch",
                }}
              >
                {p.title}
              </h3>
              <p
                style={{
                  fontSize: "var(--type-md)",
                  lineHeight: 1.6,
                  color: "var(--ink)",
                  maxWidth: "44ch",
                }}
              >
                {p.body}
              </p>
            </article>
          ))}
        </SectionRise>
      </div>
    </section>
  );
}
