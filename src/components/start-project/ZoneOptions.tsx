"use client";

/*
  Component style pickers — one radio group per zone (navbar / hero / footer).
  Each zone offers included + upgraded styles; "Custom design" is the bespoke
  option (it renders as the animated gradient in the preview).
*/

import {
  COMPONENT_GROUPS,
  formatPrice,
  type PreviewZone,
  type ZoneChoices,
} from "./catalog";

export function ZoneOptions({
  choices,
  onChange,
}: {
  choices: ZoneChoices;
  onChange: (zone: PreviewZone, variantId: string) => void;
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
    </div>
  );
}
