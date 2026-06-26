"use client";

/*
  Component style pickers — one radio group per zone (navbar / hero / footer).
  Each zone offers included + upgraded styles; "Custom design" is the bespoke
  option (it renders as the animated gradient in the preview).
*/

import {
  ANIMATION_LABEL,
  ANIMATION_PRICE,
  BRANDING_LABEL,
  BRANDING_PRICE,
  COMPONENT_GROUPS,
  NAV_HOVER_LABEL,
  NAV_HOVER_PRICE,
  THEME_OPTIONS,
  formatPrice,
  type CustomPalette,
  type PreviewZone,
  type ThemeChoice,
  type ZoneChoices,
} from "./catalog";
import { CustomColorPicker } from "./CustomColorPicker";

export function ZoneOptions({
  choices,
  onChange,
  theme,
  onThemeChange,
  palette,
  onPalette,
  branding,
  onBrandingChange,
  animation,
  onAnimationChange,
  navHover,
  onNavHoverChange,
}: {
  choices: ZoneChoices;
  onChange: (zone: PreviewZone, variantId: string) => void;
  theme: ThemeChoice;
  onThemeChange: (theme: ThemeChoice) => void;
  palette: CustomPalette;
  onPalette: (palette: CustomPalette) => void;
  branding: boolean;
  onBrandingChange: (branding: boolean) => void;
  animation: boolean;
  onAnimationChange: (animation: boolean) => void;
  navHover: boolean;
  onNavHoverChange: (navHover: boolean) => void;
}) {
  return (
    <div className="flex flex-col gap-(--space-8)">
      {COMPONENT_GROUPS.map((group) => (
        <div key={group.zone}>
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
            {group.label}
          </span>
          <div
            role="radiogroup"
            aria-label={`${group.label} style`}
            className="grid grid-cols-2 gap-2"
          >
            {group.variants.map((variant) => {
              const on = choices[group.zone] === variant.id;
              const isCustom = variant.id === "custom";
              return (
                <button
                  key={variant.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  data-cursor="view"
                  onClick={() => onChange(group.zone, variant.id)}
                  className="flex flex-col gap-1 text-left"
                  style={{
                    padding: "var(--space-3) var(--space-3)",
                    border: "1px solid",
                    borderColor: on ? "var(--mint-deep)" : "var(--neutral)",
                    background: on
                      ? "color-mix(in oklab, var(--mint-deep) 10%, transparent)"
                      : "transparent",
                    cursor: "pointer",
                    transition:
                      "border-color var(--dur-quick) var(--ease-out-quint), background var(--dur-quick) var(--ease-out-quint)",
                  }}
                >
                  <span className="flex items-center gap-2" style={{ width: "100%" }}>
                    {isCustom ? (
                      <span
                        aria-hidden
                        style={{
                          width: 10,
                          height: 10,
                          flex: "0 0 auto",
                          borderRadius: 3,
                          background:
                            "linear-gradient(120deg, #1f8fe0, #7c5cff, #2dd4bf)",
                        }}
                      />
                    ) : null}
                    <span
                      className="font-mono"
                      style={{
                        fontSize: "var(--type-xs)",
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: on ? "var(--mint-deep)" : "var(--ink)",
                      }}
                    >
                      {variant.label}
                    </span>
                    <span
                      className="font-mono"
                      style={{
                        marginLeft: "auto",
                        fontSize: "var(--type-xs)",
                        color: on ? "var(--mint-deep)" : "var(--slate-ink)",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {variant.price === 0 ? "Incl." : `+ ${formatPrice(variant.price)}`}
                    </span>
                  </span>
                  <span
                    style={{
                      fontSize: "var(--type-xs)",
                      color: "var(--slate-ink)",
                      lineHeight: 1.4,
                    }}
                  >
                    {variant.description}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Per-zone motion add-ons — additive on top of the chosen style */}
          {group.zone === "navbar" ? (
            <AddonToggle
              on={navHover}
              onToggle={() => onNavHoverChange(!navHover)}
              label={NAV_HOVER_LABEL}
              description="Links and the logo answer the cursor — magnetic hovers, fluid underlines, micro-motion."
              price={NAV_HOVER_PRICE}
            />
          ) : null}
          {group.zone === "hero" ? (
            <AddonToggle
              on={animation}
              onToggle={() => onAnimationChange(!animation)}
              label={ANIMATION_LABEL}
              description="Cursor-reactive 3D — a WebGL first fold built to move and respond as visitors do."
              price={ANIMATION_PRICE}
            />
          ) : null}
        </div>
      ))}

      {/* Theme */}
      <div>
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
          Theme
        </span>
        <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-2">
          {THEME_OPTIONS.map((option) => {
            const on = theme === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={on}
                data-cursor="view"
                onClick={() => onThemeChange(option.id)}
                className="flex flex-col gap-1 text-left"
                style={{
                  padding: "var(--space-3) var(--space-3)",
                  border: "1px solid",
                  borderColor: on ? "var(--mint-deep)" : "var(--neutral)",
                  background: on
                    ? "color-mix(in oklab, var(--mint-deep) 10%, transparent)"
                    : "transparent",
                  cursor: "pointer",
                  transition:
                    "border-color var(--dur-quick) var(--ease-out-quint), background var(--dur-quick) var(--ease-out-quint)",
                }}
              >
                <span className="flex items-center gap-2" style={{ width: "100%" }}>
                  {/* theme swatch: dark disc / light disc / half-half */}
                  <span
                    aria-hidden
                    style={{
                      width: 12,
                      height: 12,
                      flex: "0 0 auto",
                      borderRadius: 999,
                      border: "1px solid var(--neutral)",
                      background:
                        option.id === "dark"
                          ? "#14161d"
                          : option.id === "light"
                            ? "#eef0ec"
                            : "linear-gradient(90deg, #14161d 50%, #eef0ec 50%)",
                    }}
                  />
                  <span
                    className="font-mono"
                    style={{
                      fontSize: "var(--type-xs)",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: on ? "var(--mint-deep)" : "var(--ink)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {option.label}
                  </span>
                </span>
                <span
                  className="font-mono"
                  style={{
                    fontSize: "var(--type-xs)",
                    color: on ? "var(--mint-deep)" : "var(--slate-ink)",
                  }}
                >
                  {option.price === 0 ? "Incl." : `+ ${formatPrice(option.price)}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Palette */}
      <div>
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
          Palette
        </span>

        {/* ★ The headline offer — full identity design ★ */}
        <BrandingHero on={branding} onToggle={() => onBrandingChange(!branding)} />

        {/* Secondary path — pick your own colors */}
        <div
          className="flex items-center gap-3"
          style={{ margin: "var(--space-6) 0 var(--space-4)" }}
          aria-hidden
        >
          <span style={{ flex: 1, borderTop: "1px solid var(--neutral)" }} />
          <span
            className="font-mono"
            style={{
              fontSize: "var(--type-xs)",
              letterSpacing: "var(--tracking-eyebrow)",
              textTransform: "uppercase",
              color: "var(--slate-ink)",
            }}
          >
            or pick your own — free
          </span>
          <span style={{ flex: 1, borderTop: "1px solid var(--neutral)" }} />
        </div>

        <CustomColorPicker
          value={palette}
          onChange={onPalette}
          disabled={branding}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Add-on toggle — a full-width checkbox card shown under a zone's      */
/* styles (navbar hover, hero motion). Additive on top of the chosen    */
/* style, not a mutually-exclusive option.                              */
/* ------------------------------------------------------------------ */

function AddonToggle({
  on,
  onToggle,
  label,
  description,
  price,
}: {
  on: boolean;
  onToggle: () => void;
  label: string;
  description: string;
  price: number;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      aria-label={label}
      data-cursor="view"
      onClick={onToggle}
      className="flex items-center gap-3 text-left"
      style={{
        width: "100%",
        marginTop: "var(--space-2)",
        padding: "var(--space-3) var(--space-3)",
        border: "1px solid",
        borderColor: on ? "var(--mint-deep)" : "var(--neutral)",
        background: on
          ? "color-mix(in oklab, var(--mint-deep) 10%, transparent)"
          : "transparent",
        cursor: "pointer",
        transition:
          "border-color var(--dur-quick) var(--ease-out-quint), background var(--dur-quick) var(--ease-out-quint)",
      }}
    >
      {/* Checkbox indicator */}
      <span
        aria-hidden
        className="flex items-center justify-center"
        style={{
          width: 18,
          height: 18,
          flex: "0 0 auto",
          borderRadius: 4,
          border: "1px solid",
          borderColor: on ? "var(--mint-deep)" : "var(--neutral)",
          background: on ? "var(--mint-deep)" : "transparent",
          color: "var(--paper)",
          transition:
            "border-color var(--dur-quick) var(--ease-out-quint), background var(--dur-quick) var(--ease-out-quint)",
        }}
      >
        {on ? (
          <svg
            viewBox="0 0 16 16"
            width="11"
            height="11"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 8.5 6.5 12 13 4.5" />
          </svg>
        ) : null}
      </span>

      <span className="flex flex-col gap-1" style={{ minWidth: 0, flex: 1 }}>
        <span
          className="font-mono"
          style={{
            fontSize: "var(--type-xs)",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: on ? "var(--mint-deep)" : "var(--ink)",
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: "var(--type-xs)",
            color: "var(--slate-ink)",
            lineHeight: 1.4,
          }}
        >
          {description}
        </span>
      </span>

      <span
        className="font-mono"
        style={{
          marginLeft: "auto",
          fontSize: "var(--type-xs)",
          color: on ? "var(--mint-deep)" : "var(--slate-ink)",
          whiteSpace: "nowrap",
          alignSelf: "flex-start",
        }}
      >
        + {formatPrice(price)}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Branding hero — the section's biggest selling point. Animated      */
/* gradient frame, spinning palette orb, shimmer sweep, bold copy.    */
/* ------------------------------------------------------------------ */

function BrandingHero({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={BRANDING_LABEL}
      data-cursor="view"
      onClick={onToggle}
      className="brand-hero"
      data-on={on ? "true" : "false"}
    >
      {/* Gradient border layer */}
      <span aria-hidden className="brand-hero__frame" />
      {/* Shimmer sweep */}
      <span aria-hidden className="brand-hero__shimmer" />

      <span className="brand-hero__inner">
        <span aria-hidden className="brand-hero__orb">
          <span className="brand-hero__orb-core" />
        </span>

        <span className="brand-hero__body">
          <span className="brand-hero__flag font-mono">
            ★ Most loved · full identity
          </span>
          <span className="brand-hero__title">{BRANDING_LABEL}</span>
          <span className="brand-hero__desc">
            We design your palette, logo direction &amp; complete brand identity
            with you — from a blank page to something unmistakably yours.
          </span>
        </span>

        <span className="brand-hero__price font-mono">
          <span className="brand-hero__price-plus">+</span>
          {formatPrice(BRANDING_PRICE)}
        </span>

        <span
          aria-hidden
          className="brand-hero__check font-mono"
          data-on={on ? "true" : "false"}
        >
          {/* Confetti burst on add */}
          <span className="brand-hero__burst">
            {Array.from({ length: 6 }).map((_, i) => (
              <span key={i} style={{ ["--i" as string]: i }} />
            ))}
          </span>
          {/* Both labels share the same box so width/height never change */}
          <span className="brand-hero__check-label brand-hero__check-add">
            Add
          </span>
          <span className="brand-hero__check-label brand-hero__check-added">
            <svg
              className="brand-hero__tick"
              viewBox="0 0 16 16"
              width="13"
              height="13"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 8.5 6.5 12 13 4.5" />
            </svg>
            Added
          </span>
        </span>
      </span>

      <style>{`
        .brand-hero {
          position: relative;
          display: block;
          width: 100%;
          padding: 2px; /* room for the gradient frame */
          border: none;
          border-radius: 16px;
          background: transparent;
          cursor: pointer;
          text-align: left;
          isolation: isolate;
          transition: transform var(--dur-quick) var(--ease-out-quint);
        }
        .brand-hero:hover { transform: translateY(-3px); }
        .brand-hero:active { transform: translateY(-1px) scale(0.995); }

        .brand-hero__frame {
          position: absolute;
          inset: 0;
          border-radius: 16px;
          padding: 2px;
          background: linear-gradient(
            100deg,
            #1f8fe0, #7c5cff, #2dd4bf, #e8a33d, #e25c7a
          );
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          mask-composite: exclude;
          opacity: 0.85;
          z-index: 1;
          transition: opacity var(--dur-quick) var(--ease-out-quint), padding var(--dur-quick) var(--ease-out-quint);
        }
        .brand-hero[data-on="true"] .brand-hero__frame {
          padding: 2.5px;
          opacity: 1;
        }

        .brand-hero__inner {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          gap: var(--space-5);
          flex-wrap: wrap;
          padding: var(--space-6) var(--space-6);
          border-radius: 14px;
          background:
            radial-gradient(120% 140% at 0% 0%, color-mix(in oklab, var(--mint-deep) 16%, transparent), transparent 55%),
            radial-gradient(120% 140% at 100% 100%, color-mix(in oklab, #7c5cff 16%, transparent), transparent 55%),
            color-mix(in oklab, var(--mint-pale) 92%, #000);
          overflow: hidden;
        }
        .brand-hero[data-on="true"] .brand-hero__inner {
          background:
            radial-gradient(120% 140% at 0% 0%, color-mix(in oklab, var(--mint-deep) 26%, transparent), transparent 55%),
            radial-gradient(120% 140% at 100% 100%, color-mix(in oklab, #7c5cff 24%, transparent), transparent 55%),
            color-mix(in oklab, var(--mint-pale) 86%, #000);
        }

        .brand-hero__shimmer {
          position: absolute;
          inset: 0;
          z-index: 3;
          border-radius: 14px;
          background: linear-gradient(
            105deg,
            transparent 30%,
            rgba(255,255,255,0.14) 48%,
            rgba(255,255,255,0.04) 56%,
            transparent 70%
          );
          background-size: 250% 100%;
          background-position: 150% 0;
          pointer-events: none;
          animation: brand-shimmer 4.5s var(--ease-out-quint) infinite;
        }
        @keyframes brand-shimmer {
          0%   { background-position: 150% 0; }
          55%  { background-position: -60% 0; }
          100% { background-position: -60% 0; }
        }

        .brand-hero__orb {
          position: relative;
          flex-shrink: 0;
          width: 56px;
          height: 56px;
          border-radius: 999px;
          background: conic-gradient(#1f8fe0, #7c5cff, #2dd4bf, #e8a33d, #e25c7a, #1f8fe0);
          box-shadow: 0 0 0 1px color-mix(in oklab, var(--ink) 12%, transparent),
                      0 8px 26px -8px color-mix(in oklab, #7c5cff 70%, transparent);
        }
        .brand-hero__orb-core {
          position: absolute;
          inset: 7px;
          border-radius: 999px;
          background: color-mix(in oklab, var(--mint-pale) 80%, #000);
          box-shadow: inset 0 0 12px -2px rgba(0,0,0,0.6);
        }

        .brand-hero__body {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex: 1 1 220px;
          min-width: 0;
        }
        .brand-hero__flag {
          display: inline-block;
          width: fit-content;
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--mint-deep);
          padding: 3px 9px;
          border-radius: 999px;
          background: color-mix(in oklab, var(--mint-deep) 14%, transparent);
          border: 1px solid color-mix(in oklab, var(--mint-deep) 35%, transparent);
        }
        .brand-hero__title {
          font-size: clamp(1.25rem, 1rem + 1.4vw, 1.9rem);
          line-height: 1.05;
          font-weight: 650;
          letter-spacing: -0.01em;
          color: var(--ink);
          background: linear-gradient(92deg, var(--ink), color-mix(in oklab, #7c5cff 60%, var(--ink)));
          -webkit-background-clip: text;
          background-clip: text;
        }
        .brand-hero__desc {
          font-size: var(--type-sm, 0.85rem);
          line-height: 1.5;
          color: var(--slate-ink);
          max-width: 46ch;
        }

        .brand-hero__price {
          flex-shrink: 0;
          font-size: clamp(1.1rem, 0.9rem + 1vw, 1.5rem);
          font-weight: 600;
          color: var(--ink);
          white-space: nowrap;
          align-self: flex-start;
        }
        .brand-hero__price-plus {
          color: var(--mint-deep);
          margin-right: 2px;
        }

        .brand-hero__check {
          position: relative;
          flex-shrink: 0;
          /* Fixed box — reserved for the wider "Added" label so the height
             and width never change when the text swaps. */
          display: inline-grid;
          place-items: center;
          min-width: 92px;
          height: 34px;
          font-size: var(--type-xs);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          border-radius: 999px;
          color: var(--paper);
          background: var(--mint-deep);
          box-shadow: 0 6px 18px -6px color-mix(in oklab, var(--mint-deep) 80%, transparent);
          transition: background var(--dur-base) var(--ease-out-quint),
                      box-shadow var(--dur-base) var(--ease-out-quint),
                      transform var(--dur-quick) var(--ease-out-quint);
        }
        .brand-hero__check[data-on="true"] {
          background: #2dd4bf;
          color: #08110f;
          box-shadow: 0 8px 22px -6px color-mix(in oklab, #2dd4bf 85%, transparent);
          animation: brand-pop 460ms var(--ease-out-quint);
        }
        @keyframes brand-pop {
          0%   { transform: scale(1); }
          35%  { transform: scale(1.14); }
          60%  { transform: scale(0.97); }
          100% { transform: scale(1); }
        }
        .brand-hero:hover .brand-hero__check { transform: scale(1.05); }

        /* Both labels stacked in the same grid cell — cross-fade between them */
        .brand-hero__check-label {
          grid-area: 1 / 1;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          white-space: nowrap;
          transition: opacity 200ms var(--ease-out-quint),
                      transform 280ms var(--ease-out-quint);
        }
        .brand-hero__check-add        { opacity: 1; transform: translateY(0); }
        .brand-hero__check-added      { opacity: 0; transform: translateY(60%); }
        .brand-hero__check[data-on="true"] .brand-hero__check-add   { opacity: 0; transform: translateY(-60%); }
        .brand-hero__check[data-on="true"] .brand-hero__check-added { opacity: 1; transform: translateY(0); }

        /* Checkmark draws itself in */
        .brand-hero__tick path {
          stroke-dasharray: 22;
          stroke-dashoffset: 22;
        }
        .brand-hero__check[data-on="true"] .brand-hero__tick path {
          animation: brand-tick 420ms var(--ease-out-quint) 90ms forwards;
        }
        @keyframes brand-tick {
          to { stroke-dashoffset: 0; }
        }

        /* Confetti burst — six dots radiating outward, once, on add */
        .brand-hero__burst {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 1;
        }
        .brand-hero__burst span {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 5px;
          height: 5px;
          border-radius: 999px;
          opacity: 0;
        }
        .brand-hero__burst span:nth-child(odd)  { background: var(--mint-deep); }
        .brand-hero__burst span:nth-child(even) { background: #7c5cff; }
        .brand-hero__burst span:nth-child(3n)   { background: #e8a33d; }
        .brand-hero__check[data-on="true"] .brand-hero__burst span {
          animation: brand-burst 560ms var(--ease-out-quint) forwards;
          transform: rotate(calc(var(--i) * 60deg)) translateX(0);
        }
        @keyframes brand-burst {
          0%   { opacity: 0; transform: rotate(calc(var(--i) * 60deg)) translateX(6px) scale(0.4); }
          40%  { opacity: 1; }
          100% { opacity: 0; transform: rotate(calc(var(--i) * 60deg)) translateX(34px) scale(1); }
        }

        @media (max-width: 480px) {
          .brand-hero__check { order: 3; }
          .brand-hero__price { order: 2; margin-left: auto; }
        }

        @media (prefers-reduced-motion: reduce) {
          .brand-hero__shimmer,
          .brand-hero__check,
          .brand-hero__burst span { animation: none; }
          .brand-hero:hover { transform: none; }
          .brand-hero__check[data-on="true"] .brand-hero__tick path { stroke-dashoffset: 0; }
          .brand-hero__burst span { display: none; }
        }
      `}</style>
    </button>
  );
}
