"use client";

/*
  Marketing lead form — the only client-side part of /marketing. The page shell
  and every word of copy are server-rendered (page.tsx); this component owns
  validation and the submit flow.

  Same contract as /contact and /start-project: validate in the browser, store
  the lead in Supabase with the anon key (insert-only RLS — never chain
  .select(), there is no anon read policy), then open a prefilled mail draft so
  the enquiry survives a failed insert. A hidden honeypot swallows bots.
*/

import { useId, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { HoverMagnet } from "@/components/motion/HoverMagnet";
import { HoverTextSwap } from "@/components/motion/HoverTextSwap";
import { ArrowGlyph } from "@/components/ui/ArrowGlyph";
import { MailLink } from "@/components/ui/MailLink";
import { AD_BUDGET_RANGES } from "@/lib/marketing.config";

type Stage = "default" | "submitting" | "success";

type FieldName =
  | "name"
  | "business"
  | "instagram"
  | "email"
  | "phone"
  | "budget"
  | "message";

type Values = Record<FieldName, string>;
type Errors = Partial<Record<FieldName, string>>;

const EMPTY: Values = {
  name: "",
  business: "",
  instagram: "",
  email: "",
  phone: "",
  budget: "",
  message: "",
};

/** Deliberately permissive — the server never sees an address we rejected. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validate(values: Values): Errors {
  const errors: Errors = {};
  if (!values.name.trim()) errors.name = "Tell us who you are.";
  if (!values.business.trim()) errors.business = "Tell us the name of the business.";
  if (!values.email.trim()) errors.email = "We need an email to reply to.";
  else if (!EMAIL_RE.test(values.email.trim()))
    errors.email = "That doesn't look like an email address.";
  // Optional, but a two-digit "phone" helps nobody.
  if (values.phone.trim() && values.phone.replace(/\D/g, "").length < 7)
    errors.phone = "That number looks too short.";
  if (!values.budget) errors.budget = "Pick a range — an estimate is fine.";
  if (!values.message.trim()) errors.message = "Tell us what you want to run.";
  return errors;
}

/**
 * The one place a lead leaves the browser.
 *
 * TODO(owner): point this at a real endpoint (a CRM, an email service, a
 * server action) if the Supabase table stops being enough. Everything else in
 * this file is presentation — swapping the two calls below is the whole job.
 */
async function submitMarketingLead(values: Values, studioEmail: string) {
  const summary =
    `Business: ${values.business.trim()}\n` +
    `Instagram: ${values.instagram.trim() || "—"}\n` +
    `Phone: ${values.phone.trim() || "—"}\n` +
    `Monthly ad budget: ${values.budget}\n\n` +
    `${values.message.trim()}\n`;

  const supabase = createClient();
  const { error } = await supabase.from("contact_requests").insert({
    name: values.name.trim(),
    email: values.email.trim(),
    // The table's "company / project" column — the business name belongs here.
    // What kind of enquiry it is rides in `source`, not in a name suffix.
    company: values.business.trim(),
    message: summary,
    source: "marketing",
  });
  if (error) {
    // The mail draft still goes out below — the enquiry is never lost.
    console.warn("contact_requests insert failed:", error.message);
  }

  const subject = `Marketing enquiry: ${values.business.trim() || values.name.trim()}`;
  return `mailto:${studioEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(summary)}`;
}

export function MarketingLeadForm({ email }: { email: string }) {
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [stage, setStage] = useState<Stage>("default");
  const [honeypot, setHoneypot] = useState("");
  const summaryId = useId();

  function set(field: FieldName, value: string) {
    setValues((v) => ({ ...v, [field]: value }));
    // Clear a field's error the moment the visitor starts fixing it.
    setErrors((e) => (e[field] ? { ...e, [field]: undefined } : e));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (stage !== "default") return;

    if (honeypot) {
      // Bot: pretend success, store nothing, open nothing.
      setStage("success");
      return;
    }

    const found = validate(values);
    if (Object.keys(found).length) {
      setErrors(found);
      // Move the visitor to the first thing that needs fixing.
      const first = document.getElementById(`marketing-${Object.keys(found)[0]}`);
      first?.focus();
      return;
    }

    setStage("submitting");
    const href = await submitMarketingLead(values, email);
    // Brief delay so the submitting state is seen before the mail client opens.
    window.setTimeout(() => {
      window.location.href = href;
      setStage("success");
    }, 300);
  }

  if (stage === "success") {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{ borderTop: "1px solid var(--mint-deep)", paddingTop: "var(--space-8)" }}
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
        <h3
          className="display"
          style={{
            fontSize: "var(--type-3xl)",
            lineHeight: 1.05,
            color: "var(--ink)",
            marginBottom: "var(--space-6)",
          }}
        >
          Thanks. We&apos;ll be in touch within 24 hours.
        </h3>
        <p
          style={{
            fontSize: "var(--type-md)",
            color: "var(--ink)",
            maxWidth: "52ch",
            lineHeight: 1.6,
          }}
        >
          Meanwhile, you can write to us directly at{" "}
          <MailLink
            email={email}
            data-cursor="read"
            style={{ color: "var(--mint-text)", borderBottom: "1px solid var(--mint-text)" }}
          />
          .
        </p>
      </div>
    );
  }

  const errorCount = Object.values(errors).filter(Boolean).length;

  return (
    <form onSubmit={onSubmit} aria-busy={stage === "submitting"} noValidate>
      {/* One live region for the whole form, so a screen reader hears that
          something failed even when focus lands mid-list. */}
      <p
        id={summaryId}
        role="status"
        aria-live="polite"
        className="font-mono"
        style={{
          fontSize: "var(--type-xs)",
          letterSpacing: "var(--tracking-eyebrow)",
          textTransform: "uppercase",
          color: "var(--mint-text)",
          minHeight: "1.2em",
          marginBottom: "var(--space-6)",
        }}
      >
        {errorCount
          ? `${errorCount} field${errorCount > 1 ? "s" : ""} need${errorCount > 1 ? "" : "s"} attention`
          : ""}
      </p>

      <div className="flex flex-col gap-(--space-8)">
        <Field
          name="name"
          label="Your name"
          required
          autoComplete="name"
          value={values.name}
          error={errors.name}
          onChange={set}
        />
        <Field
          name="business"
          label="Business name"
          required
          autoComplete="organization"
          value={values.business}
          error={errors.business}
          onChange={set}
        />
        <Field
          name="instagram"
          label="Instagram handle"
          hint="Optional"
          placeholder="@yourbusiness"
          value={values.instagram}
          error={errors.instagram}
          onChange={set}
        />
        <Field
          name="email"
          label="Email"
          type="email"
          required
          autoComplete="email"
          value={values.email}
          error={errors.email}
          onChange={set}
        />
        <Field
          name="phone"
          label="Phone"
          type="tel"
          hint="Optional"
          autoComplete="tel"
          value={values.phone}
          error={errors.phone}
          onChange={set}
        />
        <Field
          name="budget"
          label="Monthly ad budget"
          as="select"
          required
          options={AD_BUDGET_RANGES}
          value={values.budget}
          error={errors.budget}
          onChange={set}
        />
        <Field
          name="message"
          label="What do you want to run?"
          as="textarea"
          required
          value={values.message}
          error={errors.message}
          onChange={set}
        />

        {/* Honeypot — hidden from humans, irresistible to bots */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: "-9999px",
            width: 1,
            height: 1,
            overflow: "hidden",
          }}
        >
          <label htmlFor="marketing-website">Website</label>
          <input
            id="marketing-website"
            name="website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
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
              }}
            >
              {stage === "submitting" ? (
                <span aria-live="polite" className="kagu-dots">
                  · · ·
                </span>
              ) : (
                <HoverTextSwap>Send</HoverTextSwap>
              )}
              <ArrowGlyph length={24} color="var(--ink)" />
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
  name: FieldName;
  label: string;
  as?: "input" | "textarea" | "select";
  type?: "text" | "email" | "tel";
  required?: boolean;
  hint?: string;
  placeholder?: string;
  autoComplete?: string;
  options?: readonly string[];
  value: string;
  error?: string;
  onChange: (field: FieldName, value: string) => void;
}

function Field({
  name,
  label,
  as = "input",
  type = "text",
  required,
  hint,
  placeholder,
  autoComplete,
  options,
  value,
  error,
  onChange,
}: FieldProps) {
  const id = `marketing-${name}`;
  const errorId = `${id}-error`;
  const shared = {
    id,
    name,
    value,
    required,
    autoComplete,
    "aria-required": required ? ("true" as const) : undefined,
    "aria-invalid": error ? ("true" as const) : undefined,
    "aria-describedby": error ? errorId : undefined,
    style: {
      width: "100%",
      // backgroundColor, not the `background` shorthand: the shorthand would
      // reset background-image inline and wipe the select's drawn arrow.
      backgroundColor: "transparent",
      border: 0,
      borderBottom: "1px solid var(--neutral)",
      padding: "var(--space-3) 0",
      fontSize: "var(--type-md)",
      fontFamily: "var(--font-body)",
      color: "var(--ink)",
      outline: "none",
    } as React.CSSProperties,
  };

  return (
    <div className="kagu-field grid gap-2" data-invalid={error ? "true" : undefined}>
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
        {required ? (
          <span aria-hidden style={{ color: "var(--mint-deep)" }}> *</span>
        ) : null}
        {hint ? (
          <span style={{ color: "var(--slate-ink)" }}> · {hint}</span>
        ) : null}
      </label>

      {as === "select" ? (
        <select {...shared} onChange={(e) => onChange(name, e.target.value)}>
          <option value="">Select a range</option>
          {options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : as === "textarea" ? (
        <textarea
          {...shared}
          rows={5}
          placeholder={placeholder}
          onChange={(e) => onChange(name, e.target.value)}
          style={{ ...shared.style, resize: "vertical" }}
        />
      ) : (
        <input
          {...shared}
          type={type}
          placeholder={placeholder}
          onChange={(e) => onChange(name, e.target.value)}
        />
      )}

      {error ? (
        <span
          id={errorId}
          className="font-mono"
          style={{
            fontSize: "var(--type-xs)",
            letterSpacing: "0.04em",
            color: "var(--mint-text)",
          }}
        >
          {error}
        </span>
      ) : null}
    </div>
  );
}
