"use client";

/*
  Section 4 — Approach.
  Background: --mint-soft.
  Type-dominance: 8xl numerals.
  Primary motion: M07 sticky-numeral via ScrollTrigger.pin — the left numeral
  column is pinned for the duration of the steps; the active numeral
  cross-fades as the user scrolls through steps.
  VARIANCE 8 / MOTION 5 / DENSITY 3.
*/

import { useEffect, useRef, useState } from "react";
import { ScrollTrigger } from "@/lib/gsap";
import { useReducedMotion } from "motion/react";
import { approach } from "@/data/approach";
import { SectionRise } from "@/components/motion/SectionRise";
import { Eyebrow } from "@/components/layout/Eyebrow";

export function ApproachSection() {
  const stepsRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const stepsEl = stepsRef.current;
    const pinEl = pinRef.current;
    if (!stepsEl || !pinEl) return;

    // Pin the numeral column for the duration of the steps stack
    const pinTrigger = ScrollTrigger.create({
      trigger: stepsEl,
      start: "top top+=88", // header height
      end: "bottom bottom",
      pin: pinEl,
      pinSpacing: false,
    });

    // One trigger per step that updates activeIndex
    const stepEls = Array.from(stepsEl.querySelectorAll<HTMLElement>("[data-step]"));
    const stepTriggers = stepEls.map((el, i) =>
      ScrollTrigger.create({
        trigger: el,
        start: "top center",
        end: "bottom center",
        onEnter: () => setActiveIndex(i),
        onEnterBack: () => setActiveIndex(i),
      }),
    );

    return () => {
      pinTrigger.kill();
      stepTriggers.forEach((t) => t.kill());
    };
  }, [reduced]);

  return (
    <section
      aria-label="Approach"
      style={{ background: "var(--mint-soft)" }}
      className="px-(--container-x) py-(--section-y)"
    >
      <div className="w-full max-w-(--container-max) mx-auto">
        <SectionRise className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-(--space-32) items-end">
          <div className="md:col-span-7">
            <Eyebrow number="04">Approach</Eyebrow>
            <h2
              className="display"
              style={{
                fontSize: "var(--type-6xl)",
                lineHeight: 0.95,
                marginTop: "var(--space-6)",
                maxWidth: "13ch",
              }}
            >
              Four steps. Same every time.
            </h2>
          </div>
        </SectionRise>

        <div ref={stepsRef} className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Pinned numeral column */}
          <div
            ref={pinRef}
            className="md:col-span-4 hidden md:block"
            style={{ minHeight: "60vh", display: "flex", alignItems: "center" }}
          >
            <div style={{ position: "relative", height: "1em", width: "100%" }}>
              {approach.map((step, i) => (
                <span
                  key={step.number}
                  className="display"
                  style={{
                    position: "absolute",
                    inset: 0,
                    fontSize: "var(--type-7xl)",
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
          <div className="md:col-span-7 md:col-start-6 flex flex-col gap-(--space-40)">
            {approach.map((step, i) => (
              <article
                key={step.number}
                data-step
                style={{ minHeight: "40vh" }}
              >
                {/* mobile numeral inline */}
                <div
                  className="display md:hidden"
                  style={{
                    fontSize: "var(--type-7xl)",
                    color: "var(--slate-ink)",
                    lineHeight: 0.85,
                    marginBottom: "var(--space-6)",
                  }}
                  aria-hidden
                >
                  {step.number}
                </div>
                <SectionRise amount={0.3} delay={0.05 * i}>
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
            ))}
          </div>
        </div>
      </div>
      <span className="sr-only">Currently viewing step {activeIndex + 1} of {approach.length}.</span>
    </section>
  );
}
