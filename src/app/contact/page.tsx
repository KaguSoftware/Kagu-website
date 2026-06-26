"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import { createClient } from "@/lib/supabase/client";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { HoverMagnet } from "@/components/motion/HoverMagnet";
import { HoverTextSwap } from "@/components/motion/HoverTextSwap";

type Stage = "default" | "submitting" | "success" | "error";

const FALLBACK_CONTACT = { email: "", location: "", timezone: "" };

export default function ContactPage() {
  const [stage, setStage] = useState<Stage>("default");
  const [studio, setStudio] = useState(FALLBACK_CONTACT);
  const reduced = useReducedMotion();
  void reduced; // hook ensures we use the same provider context as the rest



  useEffect(() => {
    let active = true;
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("site_settings")
        .select("email, location, timezone")
        .eq("singleton", true)
        .single();
      if (active && data) {
        setStudio({
          email: data.email ?? "",
          location: data.location ?? "",
          timezone: data.timezone ?? "",
        });
      }
    })();
    return () => {
      active = false;
    };
  }, []);

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
    const email = String(data.get("email") || "").trim();
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
      email,
      company: company || null,
      message,
    });
    if (error) {
      // The mail draft still goes out below — the message is never lost.
      console.warn("contact_requests insert failed:", error.message);
    }

    const subject = `Project enquiry: ${name || "new"}`;
    const body =
      `Name: ${name}\n` +
      `Email: ${email}\n` +
      `Company / project: ${company}\n\n` +
      `${message}\n`;

    const href = `mailto:${studio.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    // Brief delay so the user sees the submitting state before the mail client opens.
    window.setTimeout(() => {
      window.location.href = href;
      setStage("success");
    }, 300);
  }

  return (
    <>
      <section
        style={{ background: "var(--paper)" }}
        className="px-(--container-x) pt-(--space-32) pb-(--space-16)"
      >
        <div className="w-full max-w-(--container-max) mx-auto">
          <span className="eyebrow block" style={{ marginBottom: "var(--space-6)" }}>
            Contact · {studio.location} · {studio.timezone}
          </span>
          <h1
            className="display"
            style={{
              fontSize: "var(--type-7xl)",
              lineHeight: 0.9,
              maxWidth: "12ch",
            }}
          >
            Let&apos;s talk.
          </h1>
        </div>
      </section>

      <section
        style={{ background: "var(--paper)" }}
        className="px-(--container-x) py-(--space-16)"
      >
        <div className="w-full max-w-(--container-max) mx-auto grid grid-cols-1 md:grid-cols-12 gap-12">
          {/* Form */}
          <form
            onSubmit={onSubmit}
            className="md:col-span-7"
            aria-busy={stage === "submitting"}
            noValidate
          >
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
                  <a
                    href={`mailto:${studio.email}`}
                    data-cursor="read"
                    style={{ color: "var(--ink)", borderBottom: "1px solid var(--mint-deep)" }}
                  >
                    {studio.email}
                  </a>
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
                      <span
                        aria-hidden
                        style={{ width: 24, height: 1, background: "var(--ink)" }}
                      />
                    </button>
                  </HoverMagnet>
                </div>
              </div>
            )}
          </form>

          {/* Aside */}
          <aside className="md:col-span-4 md:col-start-9 flex flex-col gap-(--space-10)">
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
                Direct
              </span>
              <a
                href={`mailto:${studio.email}`}
                data-cursor="read"
                className="kagu-text-swap-trigger"
                style={{
                  fontFamily: "var(--font-display)",
                  // Scale down on phones and allow wrapping so a long address
                  // doesn't run off the edge.
                  fontSize: "clamp(1.25rem, 6vw, var(--type-3xl))",
                  color: "var(--ink)",
                  lineHeight: 1.1,
                  borderBottom: "1px solid var(--mint-deep)",
                  display: "inline-block",
                  maxWidth: "100%",
                  overflowWrap: "anywhere",
                  paddingBottom: 4,
                }}
              >
                <HoverTextSwap>{studio.email}</HoverTextSwap>
              </a>
            </div>
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
                Where
              </span>
              <p style={{ fontSize: "var(--type-md)", color: "var(--ink)", lineHeight: 1.5 }}>
                {studio.location}
                <br />
                {studio.timezone}
              </p>
            </div>
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
                Response time
              </span>
              <p style={{ fontSize: "var(--type-md)", color: "var(--ink)", lineHeight: 1.5 }}>
                Within 24h · Turkish, English, Arabic, Persian, Russian
              </p>
            </div>
          </aside>
        </div>
      </section>

      <SiteFooter />

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
    </>
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
