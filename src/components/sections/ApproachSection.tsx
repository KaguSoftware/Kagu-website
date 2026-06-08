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
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { useReducedMotion } from "motion/react";
import type { ApproachStep } from "@/lib/content";
import { SectionRise } from "@/components/motion/SectionRise";
import { Eyebrow } from "@/components/layout/Eyebrow";

export function ApproachSection({ approach }: { approach: ApproachStep[] }) {
  const stepsRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const stepsEl = stepsRef.current;
    const pinEl = pinRef.current;
    if (!stepsEl || !pinEl) return;

    // Pin the sticky numeral on all sizes. Desktop pin holds longer
    // ("bottom+=200 bottom") so the final "4" lingers a beat past the
    // last step before releasing.
    const mm = gsap.matchMedia();

    // The numeral pin line and the per-step active triggers must use the SAME
    // vertical anchor so the numeral visually aligns with the active step's
    // heading at all times.
    //   - Desktop: anchor at 35% from viewport top (paragraph in the upper-
    //     middle of the viewport feels more comfortable than top-pinned).
    //   - Mobile:  anchor at 88px from viewport top (right under the nav).
    const buildTriggers = (anchor: string, pin: boolean) => {
      const pinTrigger = pin
        ? ScrollTrigger.create({
            trigger: stepsEl,
            start: `top ${anchor}`,
            end: `bottom ${anchor}`,
            pin: pinEl,
            pinSpacing: false,
            invalidateOnRefresh: true,
          })
        : null;

      const stepEls = Array.from(stepsEl.querySelectorAll<HTMLElement>("[data-step]"));
      const stepTriggers = stepEls.map((el, i) =>
        ScrollTrigger.create({
          trigger: el,
          start: `top ${anchor}`,
          end: `bottom ${anchor}`,
          invalidateOnRefresh: true,
          onEnter: () => setActiveIndex(i),
          onEnterBack: () => setActiveIndex(i),
        }),
      );

      return () => {
        pinTrigger?.kill();
        stepTriggers.forEach((t) => t.kill());
      };
    };

    // Desktop pins the numeral column through the steps. On phones, pinning
    // during touch scroll reads as sticky/janky, so we only drive the active
    // numeral (no pin) — the column scrolls naturally with the content.
    mm.add("(min-width: 768px)", () => buildTriggers("45%", true));
    mm.add("(max-width: 767px)", () => buildTriggers("top+=88", false));

    return () => {
      mm.revert();
    };
  }, [reduced]);

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

        <div ref={stepsRef} className="grid grid-cols-12 gap-4 md:gap-8 items-start">
          {/* Pinned numeral column — visible on all sizes, pinned via gsap.
              Anchored to the top of the column on all sizes so the first
              numeral lines up with the first step ("Listen"). */}
          <div
            ref={pinRef}
            className="col-span-3 md:col-span-4 flex items-start md:min-h-[60vh]"
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
              <article
                key={step.number}
                data-step
                style={{ minHeight: "40vh" }}
              >
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
