"use client";

/* Step 1 of the builder: pick a website type. Radio-group semantics. */

import { WEBSITE_TYPES, formatPrice, type WebsiteTypeId } from "./catalog";

export function TypePicker({
  value,
  onChange,
}: {
  value: WebsiteTypeId;
  onChange: (id: WebsiteTypeId) => void;
}) {
  return (
    <div role="radiogroup" aria-label="Website type" className="flex flex-col">
      {WEBSITE_TYPES.map((type) => {
        const selectedType = type.id === value;
        return (
          <button
            key={type.id}
            type="button"
            role="radio"
            aria-checked={selectedType}
            data-cursor="view"
            onClick={() => onChange(type.id)}
            className="flex items-baseline gap-4 text-left"
            style={{
              padding: "var(--space-4) var(--space-4)",
              marginTop: -1,
              background: selectedType
                ? "color-mix(in oklab, var(--mint-deep) 10%, transparent)"
                : "transparent",
              border: "1px solid",
              borderColor: selectedType ? "var(--mint-deep)" : "var(--neutral)",
              cursor: "pointer",
              transition:
                "border-color var(--dur-quick) var(--ease-out-quint), background var(--dur-quick) var(--ease-out-quint)",
              position: "relative",
              zIndex: selectedType ? 1 : 0,
            }}
          >
            <span
              className="font-mono"
              style={{
                fontSize: "var(--type-sm)",
                letterSpacing: "var(--tracking-eyebrow)",
                textTransform: "uppercase",
                color: selectedType ? "var(--mint-deep)" : "var(--ink)",
                whiteSpace: "nowrap",
              }}
            >
              {type.label}
            </span>
            <span
              className="hidden sm:block"
              style={{
                flex: 1,
                fontSize: "var(--type-xs)",
                color: "var(--slate-ink)",
                lineHeight: 1.4,
              }}
            >
              {type.tagline}
            </span>
            <span
              className="font-mono"
              style={{
                marginLeft: "auto",
                fontSize: "var(--type-sm)",
                color: selectedType ? "var(--mint-deep)" : "var(--slate-ink)",
                whiteSpace: "nowrap",
              }}
            >
              {formatPrice(type.basePrice)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
