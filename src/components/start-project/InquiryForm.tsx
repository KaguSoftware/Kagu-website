"use client";

/*
  Final step of the package builder. On submit:
  1. Inserts the configuration into project_inquiries (anon key, insert-only
     RLS — never chain .select(), there is no anon read policy).
  2. Opens a prefilled mail draft summarizing the package (same mailto
     pattern as /contact) — even if the insert failed, so no lead is lost.
  A visually hidden honeypot ("website") swallows bot submissions.
*/

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { HoverMagnet } from "@/components/motion/HoverMagnet";
import { HoverTextSwap } from "@/components/motion/HoverTextSwap";
import {
  BRANDING_ID,
  BRANDING_PRICE,
  CURRENCY,
  computeTotals,
  formatPrice,
  serializePalette,
  getWebsiteType,
  zoneTokens,
  type CustomPalette,
  type ThemeChoice,
  type WebsiteTypeId,
  type ZoneChoices,
} from "./catalog";

type Stage = "default" | "submitting" | "success";

export function InquiryForm({
  typeId,
  selected,
  zoneChoices,
  theme,
  palette,
  branding,
  ideas,
}: {
  typeId: WebsiteTypeId;
  selected: ReadonlySet<string>;
  zoneChoices: ZoneChoices;
  theme: ThemeChoice;
  palette: CustomPalette;
  branding: boolean;
  ideas: string[];
}) {
  const paletteToken = branding ? BRANDING_ID : serializePalette(palette);
  const [stage, setStage] = useState<Stage>("default");
  const [studioEmail, setStudioEmail] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("site_settings")
        .select("email")
        .eq("singleton", true)
        .single();
      if (active && data?.email) setStudioEmail(data.email);
    })();
    return () => {
      active = false;
    };
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (stage !== "default") return;
    setStage("submitting");

    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") || "").trim();
    const email = String(data.get("email") || "").trim();
    const company = String(data.get("company") || "").trim();
    const notes = String(data.get("notes") || "").trim();
    const honeypot = String(data.get("website") || "").trim();

    if (honeypot) {
      // Bot: pretend success, store nothing, open nothing.
      setStage("success");
      return;
    }

    const type = getWebsiteType(typeId);
    const totals = computeTotals(typeId, selected, zoneChoices, theme, paletteToken);

    const supabase = createClient();
    const { error } = await supabase.from("project_inquiries").insert({
      website_type: typeId,
      // Component/theme/palette choices and custom ideas ride along as
      // prefixed tokens ("navbar:floating", "theme:both", "idea:…").
      features: [
        ...zoneTokens(zoneChoices),
        `theme:${theme}`,
        `palette:${paletteToken}`,
        ...totals.features.map((f) => f.id),
        ...ideas.map((idea) => `idea:${idea}`),
      ],
      base_price: totals.base,
      features_price: totals.featuresPrice + totals.variantsPrice,
      total_price: totals.total,
      currency: CURRENCY,
      name,
      email,
      company: company || null,
      notes: notes || null,
    });
    if (error) {
      // The mail draft still goes out below — the lead is never lost.
      console.warn("project_inquiries insert failed:", error.message);
    }

    const componentLines = [
      ...totals.variants.map(
        ({ group, variant }) =>
          `  · ${group.label} — ${variant.label} ${
            variant.price > 0 ? `(+ ${formatPrice(variant.price)})` : "(included)"
          }`
      ),
      `  · Theme — ${totals.themeOption.label} ${
        totals.themeOption.price > 0
          ? `(+ ${formatPrice(totals.themeOption.price)})`
          : "(included)"
      }`,
      branding
        ? `  · Branding — palette, logo direction & identity (+ ${formatPrice(BRANDING_PRICE)})`
        : `  · Palette — Primary ${palette.primary}, Accent ${palette.accent2}, Accent ${palette.accent3}`,
    ].join("\n");
    const featureLines = totals.features
      .map((f) => `  + ${f.label} — ${formatPrice(f.price)}`)
      .join("\n");
    const ideaLines = ideas.map((idea) => `  ? ${idea} (to be quoted)`).join("\n");
    const subject = `Project request: ${type?.label} — est. ${formatPrice(totals.total)} — ${name}`;
    const body =
      `Name: ${name}\n` +
      `Email: ${email}\n` +
      (company ? `Company: ${company}\n` : "") +
      `\n— Package —\n` +
      `Website type: ${type?.label} (${formatPrice(totals.base)})\n` +
      `Components:\n${componentLines}\n` +
      (featureLines ? `Features:\n${featureLines}\n` : `Features: none\n`) +
      (ideaLines ? `Custom ideas:\n${ideaLines}\n` : "") +
      `Estimated total: ${formatPrice(totals.total)} ${CURRENCY}\n` +
      (notes ? `\n— Notes —\n${notes}\n` : "") +
      `\nSent from the package builder.`;

    const href = `mailto:${studioEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.setTimeout(() => {
      window.location.href = href;
      setStage("success");
    }, 300);
  }

  if (stage === "success") {
    const type = getWebsiteType(typeId);
    const totals = computeTotals(typeId, selected, zoneChoices, theme, paletteToken);
    return (
      <div
        role="status"
        aria-live="polite"
        style={{ borderTop: "1px solid var(--mint-deep)", paddingTop: "var(--space-6)" }}
      >
        <span
          className="font-mono block"
          style={{
            fontSize: "var(--type-xs)",
            letterSpacing: "var(--tracking-eyebrow)",
            textTransform: "uppercase",
            color: "var(--mint-deep)",
            marginBottom: "var(--space-4)",
          }}
        >
          Sent.
        </span>
        <h2
          className="display"
          style={{ fontSize: "var(--type-3xl)", lineHeight: 1.05, marginBottom: "var(--space-5)" }}
        >
          Thanks — we&apos;ll reply within 24 hours.
        </h2>
        <p style={{ fontSize: "var(--type-md)", color: "var(--ink)", lineHeight: 1.6, maxWidth: "48ch" }}>
          Your {type?.label.toLowerCase()} package
          {totals.features.length
            ? ` with ${totals.features.length} add-on${totals.features.length > 1 ? "s" : ""}`
            : ""}{" "}
          (est. {formatPrice(totals.total)}) is in. You can also reach us directly at{" "}
          <a
            href={`mailto:${studioEmail}`}
            data-cursor="read"
            style={{ color: "var(--ink)", borderBottom: "1px solid var(--mint-deep)" }}
          >
            {studioEmail}
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} aria-busy={stage === "submitting"} noValidate>
      <div className="flex flex-col gap-(--space-6)">
        <Field id="name" label="Name" type="text" required autoComplete="name" />
        <Field id="email" label="Email" type="email" required autoComplete="email" />
        <Field id="company" label="Company / project" type="text" autoComplete="organization" />
        <Field id="notes" label="Anything we should know?" type="textarea" />

        {/* Honeypot — hidden from humans, irresistible to bots */}
        <div
          aria-hidden="true"
          style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}
        >
          <label htmlFor="website">Website</label>
          <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>

        <div style={{ marginTop: "var(--space-4)" }}>
          <HoverMagnet strength={1} radius={120}>
            <button
              type="submit"
              data-cursor="view"
              disabled={stage !== "default"}
              className="inline-flex items-center gap-3"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--type-md)",
                letterSpacing: "var(--tracking-eyebrow)",
                textTransform: "uppercase",
                color: "var(--ink)",
                background: "var(--mint-deep)",
                padding: "20px 28px",
                minHeight: 56,
                border: "1px solid var(--ink)",
                cursor: "pointer",
              }}
            >
              {stage === "submitting" ? (
                <span aria-live="polite" className="kagu-dots">· · ·</span>
              ) : (
                <HoverTextSwap>Send my package</HoverTextSwap>
              )}
              <span aria-hidden style={{ width: 24, height: 1, background: "var(--ink)" }} />
            </button>
          </HoverMagnet>
        </div>
      </div>

      <style>{`
        .kagu-dots {
          font-family: var(--font-mono);
          animation: kagu-dots 1.2s steps(4, end) infinite;
        }
        @keyframes kagu-dots {
          0% { opacity: 0.3; }
          50% { opacity: 1; }
          100% { opacity: 0.3; }
        }
      `}</style>
    </form>
  );
}

interface FieldProps {
  id: string;
  label: string;
  type: "text" | "email" | "textarea";
  required?: boolean;
  autoComplete?: string;
}

function Field({ id, label, type, required, autoComplete }: FieldProps) {
  const Input = type === "textarea" ? "textarea" : "input";
  return (
    <div className="grid gap-2">
      <label
        htmlFor={id}
        className="font-mono"
        style={{
          fontSize: "var(--type-xs)",
          letterSpacing: "var(--tracking-eyebrow)",
          textTransform: "uppercase",
          color: "var(--slate-ink)",
        }}
      >
        {label}
        {required ? <span aria-hidden style={{ color: "var(--mint-deep)" }}> *</span> : null}
      </label>
      <Input
        id={id}
        name={id}
        type={type === "textarea" ? undefined : type}
        required={required}
        autoComplete={autoComplete}
        aria-required={required ? "true" : undefined}
        rows={type === "textarea" ? 4 : undefined}
        style={{
          width: "100%",
          background: "transparent",
          border: 0,
          borderBottom: "1px solid var(--neutral)",
          padding: "var(--space-3) 0",
          fontSize: "var(--type-md)",
          fontFamily: "var(--font-body)",
          color: "var(--ink)",
          outline: "none",
          resize: type === "textarea" ? "vertical" : undefined,
        }}
      />
    </div>
  );
}
