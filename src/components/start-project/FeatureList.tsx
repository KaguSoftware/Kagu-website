"use client";

/* Step 2 of the builder: toggle priced feature add-ons for the chosen type. */

import { featuresForType, formatPrice, type WebsiteTypeId } from "./catalog";

export function FeatureList({
  typeId,
  selected,
  onToggle,
}: {
  typeId: WebsiteTypeId;
  selected: ReadonlySet<string>;
  onToggle: (featureId: string) => void;
}) {
  const features = featuresForType(typeId);

  return (
    <div style={{ borderTop: "1px solid var(--neutral)" }}>
      {features.map((feature) => {
        const on = selected.has(feature.id);
        return (
          <button
            key={feature.id}
            type="button"
            role="checkbox"
            aria-checked={on}
            data-cursor="view"
            onClick={() => onToggle(feature.id)}
            className="flex w-full items-center gap-4 text-left"
            style={{
              minHeight: 52,
              padding: "var(--space-3) var(--space-2)",
              borderBottom: "1px solid var(--neutral)",
              background: "transparent",
              cursor: "pointer",
            }}
          >
            {/* checkbox square */}
            <span
              aria-hidden
              style={{
                width: 16,
                height: 16,
                flex: "0 0 auto",
                border: "1px solid",
                borderColor: on ? "var(--mint-deep)" : "var(--neutral)",
                background: on ? "var(--mint-deep)" : "transparent",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                transition:
                  "background var(--dur-quick) var(--ease-out-quint), border-color var(--dur-quick) var(--ease-out-quint)",
              }}
            >
              {on ? (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path
                    d="M1.5 5.2 4 7.6 8.5 2.4"
                    stroke="var(--ink)"
                    strokeWidth="1.6"
                  />
                </svg>
              ) : null}
            </span>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span
                className="block"
                style={{
                  fontSize: "var(--type-base)",
                  color: "var(--ink)",
                  lineHeight: 1.3,
                }}
              >
                {feature.label}
              </span>
              <span
                className="block"
                style={{
                  fontSize: "var(--type-xs)",
                  color: "var(--slate-ink)",
                  lineHeight: 1.4,
                }}
              >
                {feature.description}
              </span>
            </span>
            <span
              className="font-mono"
              style={{
                fontSize: "var(--type-sm)",
                color: on ? "var(--mint-deep)" : "var(--slate-ink)",
                whiteSpace: "nowrap",
                transition: "color var(--dur-quick) var(--ease-out-quint)",
              }}
            >
              + {formatPrice(feature.price)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
