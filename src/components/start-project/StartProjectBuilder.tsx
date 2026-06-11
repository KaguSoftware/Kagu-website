"use client";

/*
  Package-builder root: owns all selection state, keeps the URL shareable
  (?type=ecommerce&f=hero,chatbot via history.replaceState — no navigation),
  and lays out picker/features/form beside the sticky live preview.
*/

import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "motion/react";
import { Eyebrow } from "@/components/layout/Eyebrow";
import { WordMaskReveal } from "@/components/motion/WordMaskReveal";
import {
  computeTotals,
  featuresForType,
  formatPrice,
  type WebsiteTypeId,
} from "./catalog";
import { TypePicker } from "./TypePicker";
import { FeatureList } from "./FeatureList";
import { BuilderPreview } from "./BuilderPreview";
import { InquiryForm } from "./InquiryForm";

/** Tweens the previous total to the next one (NumberCount restarts from 0). */
function AnimatedPrice({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(value);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced) {
      el.textContent = formatPrice(value);
      prev.current = value;
      return;
    }
    const controls = animate(prev.current, value, {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        el.textContent = formatPrice(Math.round(v));
      },
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, reduced]);

  return (
    <span ref={ref} className="display" style={{ fontSize: "var(--type-4xl)", lineHeight: 1 }}>
      {formatPrice(value)}
    </span>
  );
}

function StepLabel({ number, children }: { number: string; children: React.ReactNode }) {
  return (
    <span className="eyebrow block" style={{ marginBottom: "var(--space-5)" }}>
      <span aria-hidden style={{ color: "var(--mint-deep)" }}>
        {number}
      </span>{" "}
      · {children}
    </span>
  );
}

export function StartProjectBuilder({
  initialTypeId,
  initialFeatureIds,
}: {
  initialTypeId: WebsiteTypeId;
  initialFeatureIds: string[];
}) {
  const [typeId, setTypeId] = useState<WebsiteTypeId>(initialTypeId);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialFeatureIds)
  );

  // Shareable URL — replaceState only, never a navigation/refetch.
  useEffect(() => {
    const search = new URLSearchParams();
    search.set("type", typeId);
    if (selected.size) search.set("f", [...selected].sort().join(","));
    window.history.replaceState(null, "", `?${search.toString()}`);
  }, [typeId, selected]);

  const changeType = (next: WebsiteTypeId) => {
    setTypeId(next);
    // Prune selections that don't apply to the new type so the total is honest.
    setSelected((current) => {
      const applicable = new Set(featuresForType(next).map((f) => f.id));
      return new Set([...current].filter((id) => applicable.has(id)));
    });
  };

  const toggleFeature = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totals = computeTotals(typeId, selected);

  return (
    <>
      {/* Hero */}
      <section
        style={{ background: "var(--paper)" }}
        className="px-(--container-x) pt-(--space-32) pb-(--space-16)"
      >
        <div className="w-full max-w-(--container-max) mx-auto">
          <Eyebrow className="block" >Start a project · Estimate in minutes</Eyebrow>
          <WordMaskReveal
            as="h1"
            text="Build your site."
            className="display"
          />
          <p
            style={{
              marginTop: "var(--space-6)",
              maxWidth: "52ch",
              fontSize: "var(--type-lg)",
              lineHeight: 1.5,
              color: "var(--slate-ink)",
            }}
          >
            Pick a starting point, add what you need, and watch the preview
            assemble itself. The estimate updates as you go — send it over when
            it looks right.
          </p>
        </div>
      </section>

      {/* Builder */}
      <section
        style={{ background: "var(--paper)" }}
        className="px-(--container-x) pb-(--section-y)"
      >
        <div className="w-full max-w-(--container-max) mx-auto grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-14 lg:grid-rows-[auto_1fr]">
          {/* Step 1 — type */}
          <div className="order-1 lg:order-none lg:col-span-5">
            <StepLabel number="01">Choose a starting point</StepLabel>
            <TypePicker value={typeId} onChange={changeType} />
          </div>

          {/* Preview — sticky on desktop, second on mobile */}
          <div className="order-2 lg:order-none lg:col-span-7 lg:col-start-6 lg:row-start-1 lg:row-span-2">
            <div className="lg:sticky" style={{ top: "var(--space-24)" }}>
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
                Live preview
              </span>
              <BuilderPreview typeId={typeId} selected={selected} />
            </div>
          </div>

          {/* Step 2 — features, total, contact */}
          <div className="order-3 lg:order-none lg:col-span-5 lg:col-start-1 flex flex-col gap-(--space-12)">
            <div>
              <StepLabel number="02">Add components</StepLabel>
              <FeatureList typeId={typeId} selected={selected} onToggle={toggleFeature} />
            </div>

            {/* Running total */}
            <div
              aria-live="polite"
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: "var(--space-6)",
                borderTop: "1px solid var(--mint-deep)",
                paddingTop: "var(--space-5)",
              }}
            >
              <div>
                <span
                  className="font-mono block"
                  style={{
                    fontSize: "var(--type-xs)",
                    letterSpacing: "var(--tracking-eyebrow)",
                    textTransform: "uppercase",
                    color: "var(--slate-ink)",
                    marginBottom: "var(--space-2)",
                  }}
                >
                  Estimated total
                </span>
                <AnimatedPrice value={totals.total} />
              </div>
              <p
                style={{
                  fontSize: "var(--type-xs)",
                  color: "var(--slate-ink)",
                  maxWidth: "22ch",
                  textAlign: "right",
                  lineHeight: 1.5,
                }}
              >
                Ballpark, not a quote — we confirm scope on a short call.
              </p>
            </div>

            {/* Step 3 — send */}
            <div>
              <StepLabel number="03">Send it over</StepLabel>
              <InquiryForm typeId={typeId} selected={selected} />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
