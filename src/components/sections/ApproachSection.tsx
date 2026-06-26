"use client";

/*
  Section 4 — Approach.
  Background: --mint-soft.
  Type-dominance: 8xl numerals.
  Primary motion: M07 sticky-numeral — the left numeral column is pinned via
  CSS `position: sticky` for the duration of the steps; the active numeral
  cross-fades as each step scrolls into the detection band (Framer Motion
  useInView per step).
  VARIANCE 8 / MOTION 5 / DENSITY 3.
*/

import { useCallback, useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "motion/react";
import type { ApproachStep } from "@/lib/content";
import { SectionRise } from "@/components/motion/SectionRise";
import { Eyebrow } from "@/components/layout/Eyebrow";

/*
  One step. Owns its own useInView so the parent can mark it active when it
  reaches the upper-middle of the viewport. The margin shrinks the viewport top
  40% and bottom 45%, leaving a thin band ~the 45% anchor the GSAP pin used, so
  the active numeral lines up with the step heading in view.
*/
function ApproachStepItem({
  step,
  index,
  reduced,
  onActive,
}: {
  step: ApproachStep;
  index: number;
  reduced: boolean;
  onActive: (i: number) => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { margin: "-40% 0px -45% 0px" });

  useEffect(() => {
    if (reduced) return;
    if (inView) onActive(index);
  }, [inView, index, reduced, onActive]);

  return (
    <article ref={ref} data-step style={{ minHeight: "40vh" }}>
      <SectionRise amount={0.3} delay={0.05 * index}>
        <h3
          className="display"
          style={{
            fontSize: "var(--type-4xl)",
            lineHeight: 1,
            marginBottom: "var(--space-6)",
          }}
        >
          {step.title}
        </h3>
        <p
          style={{
            fontSize: "var(--type-md)",
            lineHeight: 1.7,
            color: "var(--ink)",
            maxWidth: "52ch",
          }}
        >
          {step.body}
        </p>
      </SectionRise>
    </article>
  );
}

export function ApproachSection({ approach }: { approach: ApproachStep[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const reduced = useReducedMotion() ?? false;

  const onActive = useCallback((i: number) => setActiveIndex(i), []);
  // Pin the numeral on every breakpoint so the cross-fade is actually visible
  // while the steps scroll past. (Previously gated to desktop, which left the
  // numeral scrolling off-screen on mobile before the next step activated.)
  const sticky = !reduced;

  return (
    <section
      aria-label="Approach"
      style={{ background: "var(--mint-soft)" }}
      className="px-(--container-x) py-(--section-y)"
    >
      <div className="w-full max-w-(--container-max) mx-auto">
        <SectionRise className="grid grid-cols-12 gap-4 md:gap-8 mb-(--space-12) md:mb-(--space-32) items-end">
          <div className="col-span-12 md:col-span-7 md:col-start-1">
            <Eyebrow number="04">Approach</Eyebrow>
            <h2
              className="display max-w-full md:max-w-[13ch]"
              style={{
                fontSize: "var(--type-6xl)",
                lineHeight: 0.95,
                marginTop: "var(--space-6)",
                overflowWrap: "break-word",
                hyphens: "auto",
                textAlign: "left",
              }}
            >
              Four steps. Same every time.
            </h2>
          </div>
        </SectionRise>

        <div className="grid grid-cols-12 gap-4 md:gap-8 items-start">
          {/* Pinned numeral column — sticks at the 45vh anchor on desktop via
              CSS sticky; scrolls naturally on mobile. Anchored so the first
              numeral lines up with the first step ("Listen"). */}
          <div
            className="col-span-3 md:col-span-4 flex items-start"
            style={{
              position: sticky ? "sticky" : "static",
              top: sticky ? "45vh" : undefined,
              alignSelf: "start",
              height: sticky ? "1em" : undefined,
            }}
          >
            <div style={{ position: "relative", height: "1em", width: "100%" }}>
              {approach.map((step, i) => (
                <span
                  key={step.number}
                  className="display"
                  style={{
                    position: "absolute",
                    inset: 0,
                    fontSize: "clamp(3.5rem, 12vw, var(--type-7xl))",
                    color: "var(--slate-ink)",
                    lineHeight: 0.85,
                    fontVariantNumeric: "tabular-nums",
                    opacity: activeIndex === i ? 1 : 0,
                    transition: "opacity 320ms cubic-bezier(0.22, 1, 0.36, 1)",
                  }}
                  aria-hidden={activeIndex !== i}
                >
                  {step.number}
                </span>
              ))}
            </div>
          </div>

          {/* Steps stack */}
          <div className="col-span-9 md:col-span-7 md:col-start-6 flex flex-col gap-(--space-40)">
            {approach.map((step, i) => (
              <ApproachStepItem
                key={step.number}
                step={step}
                index={i}
                reduced={reduced}
                onActive={onActive}
              />
            ))}
          </div>
        </div>
      </div>
      <span className="sr-only">Currently viewing step {activeIndex + 1} of {approach.length}.</span>
    </section>
  );
}
