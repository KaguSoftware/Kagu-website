"use client";

/*
  Contact form — the only client-side part of /contact. The page shell, hero
  and aside are server-rendered (page.tsx) so the copy exists in the raw HTML;
  this component owns the submit flow only.
*/

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { HoverMagnet } from "@/components/motion/HoverMagnet";
import { HoverTextSwap } from "@/components/motion/HoverTextSwap";
import { ArrowGlyph } from "@/components/ui/ArrowGlyph";
import { MailLink } from "@/components/ui/MailLink";

type Stage = "default" | "submitting" | "success" | "error";

export function ContactForm({ email }: { email: string }) {
  const [stage, setStage] = useState<Stage>("default");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (stage !== "default") return;
    setStage("submitting");
    // 1. Saves the message into contact_requests (anon key, insert-only RLS —
    //    never chain .select(), there is no anon read policy).
    // 2. Opens a prefilled mail draft — even if the insert failed, so no
    //    message is lost. Same pattern as the /start-project InquiryForm.
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") || "").trim();
    const senderEmail = String(data.get("email") || "").trim();
    const company = String(data.get("company") || "").trim();
    const message = String(data.get("message") || "").trim();
    const honeypot = String(data.get("website") || "").trim();

    if (honeypot) {
      // Bot: pretend success, store nothing, open nothing.
      setStage("success");
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.from("contact_requests").insert({
      name,
      email: senderEmail,
      company: company || null,
      message,
      source: "contact",
    });
    if (error) {
      // The mail draft still goes out below — the message is never lost.
      console.warn("contact_requests insert failed:", error.message);
    }

    const subject = `Project enquiry: ${name || "new"}`;
    const body =
      `Name: ${name}\n` +
      `Email: ${senderEmail}\n` +
      `Company / project: ${company}\n\n` +
      `${message}\n`;

    const href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    // Brief delay so the user sees the submitting state before the mail client opens.
    window.setTimeout(() => {
      window.location.href = href;
      setStage("success");
    }, 300);
  }

  return (
    // No noValidate: unlike /start-marketing (which validates in JS), this form
    // has no validation of its own, so suppressing the browser's would let an
    // empty submit through — writing a blank contact_requests row and opening
    // an empty mail draft. The fields' own required/type="email" are the check.
    <form onSubmit={onSubmit} aria-busy={stage === "submitting"}>
      {stage === "success" ? (
        <div
          role="status"
          aria-live="polite"
          style={{
            borderTop: "1px solid var(--mint-deep)",
            paddingTop: "var(--space-8)",
          }}
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
            style={{ fontSize: "var(--type-4xl)", lineHeight: 1, marginBottom: "var(--space-6)" }}
          >
            Thanks. We&apos;ll be in touch within 24 hours.
          </h2>
          <p style={{ fontSize: "var(--type-md)", color: "var(--ink)", maxWidth: "52ch", lineHeight: 1.6 }}>
            Meanwhile, you can write to us directly at{" "}
            <MailLink
              email={email}
              data-cursor="read"
              style={{ color: "var(--mint-text)", borderBottom: "1px solid var(--mint-text)" }}
            />
            .
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-(--space-8)">
          <Field
            id="name"
            label="Name"
            type="text"
            required
            autoComplete="name"
            placeholder=" "
          />
          <Field
            id="email"
            label="Email"
            type="email"
            required
            autoComplete="email"
            placeholder=" "
          />
          <Field
            id="company"
            label="Company / project"
            type="text"
            autoComplete="organization"
            placeholder=" "
          />
          <Field
            id="message"
            label="What are you trying to make easier?"
            type="textarea"
            required
            placeholder=" "
          />

          {/* Honeypot — hidden from humans, irresistible to bots */}
          <div
            aria-hidden="true"
            style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }}
          >
            <label htmlFor="website">Website</label>
            <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
          </div>

          <div style={{ marginTop: "var(--space-8)" }}>
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
                  <span aria-live="polite" className="kagu-dots">· · ·</span>
                ) : (
                  <HoverTextSwap>Send</HoverTextSwap>
                )}
                <ArrowGlyph length={24} color="var(--ink)" />
              </button>
            </HoverMagnet>
          </div>
        </div>
      )}

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
  placeholder?: string;
}

function Field({ id, label, type, required, autoComplete, placeholder }: FieldProps) {
  const Input = type === "textarea" ? "textarea" : "input";
  return (
    <div className="kagu-field grid gap-2">
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
        placeholder={placeholder}
        aria-required={required ? "true" : undefined}
        rows={type === "textarea" ? 5 : undefined}
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
