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
  BRANDING_ID,
  DEFAULT_CUSTOM_PALETTE,
  computeTotals,
  featuresForType,
  formatPrice,
  serializePalette,
  type CustomPalette,
  type PreviewZone,
  type ThemeChoice,
  type WebsiteTypeId,
  type ZoneChoices,
} from "./catalog";
import { TypePicker } from "./TypePicker";
import { ZoneOptions } from "./ZoneOptions";
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

/*
  "I have an idea" — free-text requests that don't fit the catalog. No price
  attached (quoted on the call); they ride along in the inquiry + email.
*/
function IdeaInput({
  ideas,
  onChange,
}: {
  ideas: string[];
  onChange: (ideas: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const text = draft.trim();
    if (!text || ideas.includes(text)) return;
    onChange([...ideas, text]);
    setDraft("");
  };

  return (
    <div style={{ marginTop: "var(--space-5)" }}>
      <label
        htmlFor="custom-idea"
        className="font-mono block"
        style={{
          fontSize: "var(--type-xs)",
          letterSpacing: "var(--tracking-eyebrow)",
          textTransform: "uppercase",
          color: "var(--slate-ink)",
          marginBottom: "var(--space-2)",
        }}
      >
        I have an idea
      </label>
      <div className="flex items-center gap-3">
        <input
          id="custom-idea"
          type="text"
          value={draft}
          placeholder="Something specific in mind? Type it here…"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          style={{
            flex: 1,
            background: "transparent",
            border: 0,
            borderBottom: "1px solid var(--neutral)",
            padding: "var(--space-2) 0",
            fontSize: "var(--type-base)",
            fontFamily: "var(--font-body)",
            color: "var(--ink)",
            outline: "none",
          }}
        />
        <button
          type="button"
          data-cursor="view"
          onClick={add}
          disabled={!draft.trim()}
          className="font-mono"
          style={{
            fontSize: "var(--type-xs)",
            letterSpacing: "var(--tracking-eyebrow)",
            textTransform: "uppercase",
            color: draft.trim() ? "var(--mint-deep)" : "var(--slate-ink)",
            background: "transparent",
            border: "1px solid",
            borderColor: draft.trim() ? "var(--mint-deep)" : "var(--neutral)",
            padding: "7px 14px",
            cursor: draft.trim() ? "pointer" : "default",
            whiteSpace: "nowrap",
          }}
        >
          + Add
        </button>
      </div>
      {ideas.length > 0 ? (
        <ul className="flex flex-wrap gap-2" style={{ marginTop: "var(--space-3)" }}>
          {ideas.map((idea) => (
            <li
              key={idea}
              className="inline-flex items-center gap-2"
              style={{
                border: "1px solid var(--neutral)",
                borderRadius: 999,
                padding: "4px 6px 4px 12px",
                fontSize: "var(--type-xs)",
                color: "var(--ink)",
              }}
            >
              {idea}
              <span
                className="font-mono"
                style={{ color: "var(--slate-ink)", fontSize: 10 }}
              >
                we’ll quote
              </span>
              <button
                type="button"
                aria-label={`Remove "${idea}"`}
                onClick={() => onChange(ideas.filter((i) => i !== idea))}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 999,
                  border: 0,
                  background: "color-mix(in oklab, var(--neutral) 60%, transparent)",
                  color: "var(--ink)",
                  fontSize: 11,
                  lineHeight: 1,
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
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
  initialZoneChoices,
  initialTheme,
  initialPalette,
  initialBranding,
  initialAnimation,
}: {
  initialTypeId: WebsiteTypeId;
  initialFeatureIds: string[];
  initialZoneChoices: ZoneChoices;
  initialTheme: ThemeChoice;
  initialPalette: CustomPalette;
  initialBranding: boolean;
  initialAnimation: boolean;
}) {
  const [typeId, setTypeId] = useState<WebsiteTypeId>(initialTypeId);
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialFeatureIds)
  );
  const [zoneChoices, setZoneChoices] = useState<ZoneChoices>(initialZoneChoices);
  const [theme, setTheme] = useState<ThemeChoice>(initialTheme);
  const [palette, setPalette] = useState<CustomPalette>(initialPalette);
  const [branding, setBranding] = useState<boolean>(initialBranding);
  const [animation, setAnimation] = useState<boolean>(initialAnimation);
  const [ideas, setIdeas] = useState<string[]>([]);

  const paletteToken = branding ? BRANDING_ID : serializePalette(palette);

  // Shareable URL — replaceState only, never a navigation/refetch.
  useEffect(() => {
    const search = new URLSearchParams();
    search.set("type", typeId);
    if (selected.size) search.set("f", [...selected].sort().join(","));
    search.set("nav", zoneChoices.navbar);
    search.set("hero", zoneChoices.hero);
    search.set("foot", zoneChoices.footer);
    search.set("theme", theme);
    search.set("accent", paletteToken);
    if (animation) search.set("anim", "1");
    window.history.replaceState(null, "", `?${search.toString()}`);
  }, [typeId, selected, zoneChoices, theme, paletteToken, animation]);

  const changeZone = (zone: PreviewZone, variantId: string) => {
    setZoneChoices((current) => ({ ...current, [zone]: variantId }));
  };

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

  const totals = computeTotals(typeId, selected, zoneChoices, theme, paletteToken, animation);
  const accent = branding ? DEFAULT_CUSTOM_PALETTE.primary : palette.primary;
  const accent2 = branding ? DEFAULT_CUSTOM_PALETTE.accent2 : palette.accent2;
  const accent3 = branding ? DEFAULT_CUSTOM_PALETTE.accent3 : palette.accent3;

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
              <BuilderPreview
                typeId={typeId}
                selected={selected}
                zoneChoices={zoneChoices}
                theme={theme}
                accent={accent}
                accent2={accent2}
                accent3={accent3}
              />
            </div>
          </div>

          {/* Steps 2-4 — components, features, total, contact */}
          <div className="order-3 lg:order-none lg:col-span-5 lg:col-start-1 flex flex-col gap-(--space-12)">
            <div>
              <StepLabel number="02">Shape the components</StepLabel>
              <ZoneOptions
                choices={zoneChoices}
                onChange={changeZone}
                theme={theme}
                onThemeChange={setTheme}
                palette={palette}
                onPalette={setPalette}
                branding={branding}
                onBrandingChange={setBranding}
                animation={animation}
                onAnimationChange={setAnimation}
              />
            </div>

            <div>
              <StepLabel number="03">Add features</StepLabel>
              <FeatureList typeId={typeId} selected={selected} onToggle={toggleFeature} />
              <IdeaInput ideas={ideas} onChange={setIdeas} />
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

            {/* Final step — send */}
            <div>
              <StepLabel number="04">Send it over</StepLabel>
              <InquiryForm
                typeId={typeId}
                selected={selected}
                zoneChoices={zoneChoices}
                theme={theme}
                palette={palette}
                branding={branding}
                animation={animation}
                ideas={ideas}
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
