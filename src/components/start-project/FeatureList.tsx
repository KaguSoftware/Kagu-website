"use client";

/* Step 2 of the builder: toggle priced feature add-ons for the chosen type.
   Dependent add-ons (e.g. RTL under Multi-language) render indented and only
   appear while their parent feature is selected. */

import { Fragment } from "react";
import {
  featuresForType,
  formatPrice,
  type Feature,
  type WebsiteTypeId,
} from "./catalog";

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
  const parents = features.filter((f) => !f.requires);

  // Group dependents under the parent they require.
  const dependents = new Map<string, Feature[]>();
  for (const f of features) {
    if (!f.requires) continue;
    const list = dependents.get(f.requires) ?? [];
    list.push(f);
    dependents.set(f.requires, list);
  }

  return (
    <div style={{ borderTop: "1px solid var(--neutral)" }}>
      {parents.map((feature) => (
        <Fragment key={feature.id}>
          <FeatureRow
            feature={feature}
            on={selected.has(feature.id)}
            onToggle={() => onToggle(feature.id)}
          />
          {selected.has(feature.id)
            ? (dependents.get(feature.id) ?? []).map((dep) => (
                <FeatureRow
                  key={dep.id}
                  feature={dep}
                  on={selected.has(dep.id)}
                  onToggle={() => onToggle(dep.id)}
                  indent
                />
              ))
            : null}
        </Fragment>
      ))}
    </div>
  );
}

function FeatureRow({
  feature,
  on,
  onToggle,
  indent = false,
}: {
  feature: Feature;
  on: boolean;
  onToggle: () => void;
  indent?: boolean;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      data-cursor="view"
      onClick={onToggle}
      className="flex w-full items-center gap-4 text-left"
      style={{
        minHeight: 52,
        padding: "var(--space-3) var(--space-2)",
        paddingLeft: indent ? "calc(var(--space-2) + 32px)" : "var(--space-2)",
        borderBottom: "1px solid var(--neutral)",
        background: indent
          ? "color-mix(in oklab, var(--mint-deep) 5%, transparent)"
          : "transparent",
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
            <path d="M1.5 5.2 4 7.6 8.5 2.4" stroke="var(--ink)" strokeWidth="1.6" />
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
        {feature.note ? (
          <span
            className="font-mono"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              marginTop: "var(--space-2)",
              padding: "3px 9px",
              borderRadius: 999,
              fontSize: 10,
              letterSpacing: "0.04em",
              lineHeight: 1.3,
              color: "#c0364a",
              background: "color-mix(in oklab, #e25c7a 14%, transparent)",
              border: "1px solid color-mix(in oklab, #e25c7a 45%, transparent)",
              whiteSpace: "normal",
            }}
          >
            <span
              aria-hidden
              style={{
                width: 5,
                height: 5,
                flex: "0 0 auto",
                borderRadius: 999,
                background: "#e25c7a",
              }}
            />
            {feature.note}
          </span>
        ) : null}
      </span>
      <span
        className="font-mono"
        style={{
          fontSize: "var(--type-sm)",
          color: on ? "var(--mint-deep)" : "var(--slate-ink)",
          whiteSpace: "nowrap",
          alignSelf: "flex-start",
          marginTop: 2,
          transition: "color var(--dur-quick) var(--ease-out-quint)",
        }}
      >
        + {formatPrice(feature.price)}
      </span>
    </button>
  );
}
