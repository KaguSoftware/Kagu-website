"use client";

/*
  Component style pickers — one radio group per zone (navbar / hero / footer).
  Each zone offers included + upgraded styles; "Custom design" is the bespoke
  option (it renders as the animated gradient in the preview).
*/

import {
  BRANDING_LABEL,
  BRANDING_PRICE,
  COMPONENT_GROUPS,
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
}: {
  choices: ZoneChoices;
  onChange: (zone: PreviewZone, variantId: string) => void;
  theme: ThemeChoice;
  onThemeChange: (theme: ThemeChoice) => void;
  palette: CustomPalette;
  onPalette: (palette: CustomPalette) => void;
  branding: boolean;
  onBrandingChange: (branding: boolean) => void;
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
        <CustomColorPicker
          value={palette}
          onChange={onPalette}
          disabled={branding}
        />

        {/* No colors yet? We design the identity. */}
        <div style={{ marginTop: "var(--space-4)" }}>
          {(() => {
            const on = branding;
            return (
              <button
                type="button"
                role="switch"
                aria-checked={on}
                data-cursor="view"
                onClick={() => onBrandingChange(!on)}
                className="inline-flex items-center gap-2"
                style={{
                  padding: "5px 12px",
                  borderRadius: 999,
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
                <span
                  aria-hidden
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 999,
                    background:
                      "conic-gradient(#1f8fe0, #7c5cff, #2dd4bf, #e8a33d, #e25c7a, #1f8fe0)",
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
                  {BRANDING_LABEL}
                </span>
                <span
                  className="font-mono"
                  style={{
                    fontSize: "var(--type-xs)",
                    color: on ? "var(--mint-deep)" : "var(--slate-ink)",
                    whiteSpace: "nowrap",
                  }}
                >
                  + {formatPrice(BRANDING_PRICE)}
                </span>
              </button>
            );
          })()}
        </div>
        <p
          style={{
            fontSize: "var(--type-xs)",
            color: "var(--slate-ink)",
            marginTop: "var(--space-3)",
            lineHeight: 1.5,
          }}
        >
          Dial in your three colors for free — or choose branding and we design
          your palette, logo direction and identity with you.
        </p>
      </div>
    </div>
  );
}
