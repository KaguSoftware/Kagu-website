"use client";

/*
  The one client island on /start-marketing. Every question, its label and its
  options live in ./questions.ts — this file renders that array and owns the
  submit flow, nothing more.

  Submission reuses the site's existing contact path: an anon-key insert into
  contact_requests (insert-only RLS — never chain .select(), there is no anon
  read policy), tagged source: "start-marketing" so /admin/requests can tell it
  apart from /contact and the short form on /marketing.

  Where this deliberately differs from /contact and /start-project: those open
  a prefilled mail draft on every submit. This form is twenty questions long —
  a mailto body that size risks truncation, and hijacking to the mail client
  after a successful save is a poor ending on a phone. So the insert is the
  primary path, and the mail draft is the escape hatch offered only when the
  insert fails, with every answer still on screen.
*/

import { useId, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { HoverMagnet } from "@/components/motion/HoverMagnet";
import { HoverTextSwap } from "@/components/motion/HoverTextSwap";
import { ArrowGlyph } from "@/components/ui/ArrowGlyph";
import { MailLink } from "@/components/ui/MailLink";
import { whatsappHref } from "@/lib/marketing.config";
import {
  BLOCKS,
  EMPTY_VALUES,
  FIELDS,
  enquirySubject,
  formatEnquiry,
  isVisible,
  normaliseHandle,
  validateAll,
  validateField,
  type Errors,
  type Field,
  type FieldId,
  type Values,
} from "./questions";

type Stage = "default" | "submitting" | "success" | "error";

/** Backgrounds follow the ladder in docs/DESIGN_BASELINE.md §3 — no two
    adjacent blocks share a surface. */
const BLOCK_BACKGROUNDS = ["var(--mint-pale)", "var(--paper)", "var(--mint-soft)"];

const domId = (id: FieldId) => `sm-${id}`;

export function StartMarketingForm({ email }: { email: string }) {
  const [values, setValues] = useState<Values>(EMPTY_VALUES);
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<ReadonlySet<FieldId>>(new Set());
  const [stage, setStage] = useState<Stage>("default");
  const [honeypot, setHoneypot] = useState("");
  const summaryId = useId();
  const whatsapp = whatsappHref();

  function set(id: FieldId, value: string) {
    setValues((current) => ({ ...current, [id]: value }));
    // Clear the error the moment someone starts fixing it — never re-validate
    // mid-keystroke, that is what blur is for.
    setErrors((current) => (current[id] ? { ...current, [id]: undefined } : current));
  }

  /** Validation on blur, so nobody is told they're wrong while still typing. */
  function blur(field: Field) {
    setTouched((current) => new Set(current).add(field.id));
    const error = validateField(field, values);
    setErrors((current) => ({ ...current, [field.id]: error }));
  }

  /** Chips have no meaningful blur — a pick is the answer, so check it then. */
  function pick(field: Field, value: string) {
    const next = { ...values, [field.id]: value };
    setValues(next);
    setTouched((current) => new Set(current).add(field.id));
    setErrors((current) => ({ ...current, [field.id]: validateField(field, next) }));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (stage === "submitting") return;

    if (honeypot) {
      // Bot: pretend success, store nothing.
      setStage("success");
      return;
    }

    const found = validateAll(values);
    if (Object.keys(found).length) {
      setErrors(found);
      setTouched(new Set(FIELDS.map((field) => field.id)));
      setStage("default");
      // Send them to the first unanswered question, in the order asked.
      const first = FIELDS.find((field) => found[field.id]);
      if (first) document.getElementById(domId(first.id))?.focus();
      return;
    }

    setStage("submitting");
    const supabase = createClient();
    const { error } = await supabase.from("contact_requests").insert({
      name: values.name.trim(),
      email: values.email.trim(),
      company: values.business.trim(),
      message: formatEnquiry(values),
      source: "start-marketing",
    });

    if (error) {
      // Nothing is cleared — the answers stay on screen and the block below
      // offers the mail draft and WhatsApp instead.
      console.warn("contact_requests insert failed:", error.message);
      setStage("error");
      return;
    }

    setStage("success");
  }

  if (stage === "success") {
    // Greet by first name, and show the handle the way we normalised it
    // rather than the URL they may have pasted.
    const firstName = values.name.trim().split(/\s+/)[0];
    const handle = normaliseHandle(values.instagram);
    return (
      <section
        style={{ background: "#0e1016" }}
        className="px-(--container-x) py-(--section-y)"
      >
        <div className="w-full max-w-(--container-max) mx-auto">
          <div role="status" aria-live="polite" style={{ maxWidth: "52ch" }}>
            <span
              className="font-mono block"
              style={{
                fontSize: "var(--type-xs)",
                letterSpacing: "var(--tracking-eyebrow)",
                textTransform: "uppercase",
                color: "var(--mint-text)",
                marginBottom: "var(--space-6)",
              }}
            >
              Sent.
            </span>
            <h2
              className="display"
              style={{
                fontSize: "var(--type-4xl)",
                lineHeight: 1.05,
                color: "var(--ink)",
                marginBottom: "var(--space-8)",
              }}
            >
              Thanks{firstName ? `, ${firstName}` : ""}. We have what we need.
            </h2>
            <p
              style={{
                fontSize: "var(--type-md)",
                color: "var(--ink)",
                lineHeight: 1.6,
                marginBottom: "var(--space-6)",
              }}
            >
              We&apos;ll look at{" "}
              {handle ? (
                <span style={{ color: "var(--mint-text)" }}>{handle}</span>
              ) : (
                "your accounts"
              )}{" "}
              and your ad history before we answer, so the first reply is about your
              situation rather than a brochure. That usually takes less than 24 hours.
            </p>
            <p style={{ fontSize: "var(--type-md)", color: "var(--slate-ink)", lineHeight: 1.6 }}>
              Remembered something? Write to us at{" "}
              <MailLink
                email={email}
                data-cursor="read"
                style={{ color: "var(--mint-text)", borderBottom: "1px solid var(--mint-text)" }}
              />
              {whatsapp ? (
                <>
                  {" "}
                  or{" "}
                  <a
                    href={whatsapp}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-cursor="read"
                    style={{ color: "var(--mint-text)", borderBottom: "1px solid var(--mint-text)" }}
                  >
                    message us on WhatsApp
                  </a>
                </>
              ) : null}
              .
            </p>
          </div>
        </div>
      </section>
    );
  }

  const errorCount = Object.values(errors).filter(Boolean).length;

  return (
    <form onSubmit={onSubmit} aria-busy={stage === "submitting"} noValidate>
      {BLOCKS.map((block, index) => (
        <section
          key={block.id}
          aria-labelledby={`${block.id}-heading`}
          style={{ background: BLOCK_BACKGROUNDS[index] }}
          className="px-(--container-x) py-(--section-y)"
        >
          <div className="w-full max-w-(--container-max) mx-auto grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-(--space-10)">
            {/* Heading rides along on desktop so it is still visible deep into
                a long block; static on mobile, where sticky would eat the
                viewport a keyboard already halved. */}
            <div className="lg:col-span-4">
              <div className="lg:sticky" style={{ top: "var(--space-24)" }}>
                <span className="eyebrow block" style={{ marginBottom: "var(--space-5)" }}>
                  <span aria-hidden style={{ color: "var(--mint-text)" }}>
                    {block.number}
                  </span>{" "}
                  · Step {block.number} of 03
                </span>
                <h2
                  id={`${block.id}-heading`}
                  className="display"
                  style={{ fontSize: "var(--type-3xl)", lineHeight: 1.05 }}
                >
                  {block.title}
                </h2>
                <p
                  style={{
                    marginTop: "var(--space-4)",
                    fontSize: "var(--type-base)",
                    color: "var(--slate-ink)",
                    lineHeight: 1.6,
                    maxWidth: "34ch",
                  }}
                >
                  {block.intro}
                </p>
              </div>
            </div>

            <div className="lg:col-span-7 lg:col-start-6 flex flex-col gap-(--space-10)">
              {block.fields.map((field) =>
                isVisible(field, values) ? (
                  <FieldControl
                    key={field.id}
                    field={field}
                    value={values[field.id]}
                    error={touched.has(field.id) ? errors[field.id] : undefined}
                    onChange={set}
                    onPick={pick}
                    onBlur={blur}
                  />
                ) : null
              )}
            </div>
          </div>
        </section>
      ))}

      {/* ------------------------------ send ------------------------------ */}
      <section style={{ background: "#0e1016" }} className="px-(--container-x) py-(--section-y)">
        <div className="w-full max-w-(--container-max) mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-12 gap-y-(--space-10)">
            <div className="lg:col-span-7">
              {/* One live region for the whole form, so a screen reader hears
                  that something failed even when focus lands mid-page. */}
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
                  ? `${errorCount} question${errorCount > 1 ? "s" : ""} need${errorCount > 1 ? "" : "s"} an answer`
                  : ""}
              </p>

              {stage === "error" ? (
                <div
                  role="alert"
                  style={{
                    border: "1px solid var(--mint-text)",
                    padding: "var(--space-5)",
                    marginBottom: "var(--space-8)",
                    maxWidth: "56ch",
                  }}
                >
                  <span
                    className="font-mono block"
                    style={{
                      fontSize: "var(--type-xs)",
                      letterSpacing: "var(--tracking-eyebrow)",
                      textTransform: "uppercase",
                      color: "var(--mint-text)",
                      marginBottom: "var(--space-3)",
                    }}
                  >
                    That didn&apos;t send
                  </span>
                  <p
                    style={{
                      fontSize: "var(--type-base)",
                      color: "var(--ink)",
                      lineHeight: 1.6,
                      marginBottom: "var(--space-4)",
                    }}
                  >
                    Something on our side refused it — your answers are all still here,
                    nothing is lost. Try once more, or send the same answers as an email
                    and we&apos;ll pick it up from there.
                  </p>
                  <div className="flex flex-wrap items-center gap-5">
                    <a
                      href={`mailto:${email}?subject=${encodeURIComponent(
                        enquirySubject(values)
                      )}&body=${encodeURIComponent(formatEnquiry(values))}`}
                      data-cursor="read"
                      className="font-mono inline-flex items-center gap-2"
                      style={{
                        fontSize: "var(--type-sm)",
                        letterSpacing: "var(--tracking-eyebrow)",
                        textTransform: "uppercase",
                        color: "var(--mint-text)",
                        borderBottom: "1px solid var(--mint-text)",
                        paddingBottom: "var(--space-2)",
                        minHeight: 44,
                      }}
                    >
                      Send it as an email
                      <ArrowGlyph length={20} />
                    </a>
                    {whatsapp ? (
                      <a
                        href={whatsapp}
                        target="_blank"
                        rel="noopener noreferrer"
                        data-cursor="read"
                        className="font-mono inline-flex items-center gap-2"
                        style={{
                          fontSize: "var(--type-sm)",
                          letterSpacing: "var(--tracking-eyebrow)",
                          textTransform: "uppercase",
                          color: "var(--mint-text)",
                          borderBottom: "1px solid var(--mint-text)",
                          paddingBottom: "var(--space-2)",
                          minHeight: 44,
                        }}
                      >
                        Message us instead
                        <ArrowGlyph length={20} />
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {/* Honeypot — hidden from humans, irresistible to bots. Named
                  "nickname" rather than the site's usual "website": this form
                  has a real website field and a bot filling both would look
                  identical to a person. */}
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
                <label htmlFor="sm-nickname">Nickname</label>
                <input
                  id="sm-nickname"
                  name="nickname"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                />
              </div>

              <HoverMagnet strength={1} radius={120}>
                <button
                  type="submit"
                  data-cursor="view"
                  disabled={stage === "submitting"}
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
                    cursor: stage === "submitting" ? "default" : "pointer",
                  }}
                >
                  {stage === "submitting" ? (
                    <span aria-live="polite" className="kagu-dots">
                      · · ·
                    </span>
                  ) : (
                    <HoverTextSwap>
                      {stage === "error" ? "Try again" : "Send it over"}
                    </HoverTextSwap>
                  )}
                  <ArrowGlyph length={24} color="var(--ink)" />
                </button>
              </HoverMagnet>

              <p
                style={{
                  marginTop: "var(--space-6)",
                  fontSize: "var(--type-sm)",
                  color: "var(--slate-ink)",
                  lineHeight: 1.6,
                  maxWidth: "44ch",
                }}
              >
                No obligation and no automated mailing list — one person reads this and
                replies.
              </p>
            </div>

            {/* The unobtrusive escape hatch. */}
            {whatsapp ? (
              <aside className="lg:col-span-4 lg:col-start-9">
                <span
                  className="font-mono block"
                  style={{
                    fontSize: "var(--type-xs)",
                    letterSpacing: "var(--tracking-eyebrow)",
                    textTransform: "uppercase",
                    color: "var(--slate-ink)",
                    marginBottom: "var(--space-4)",
                  }}
                >
                  Would rather just message us?
                </span>
                <a
                  href={whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-cursor="read"
                  className="font-mono inline-flex items-center gap-3"
                  style={{
                    fontSize: "var(--type-sm)",
                    letterSpacing: "var(--tracking-eyebrow)",
                    textTransform: "uppercase",
                    color: "var(--mint-text)",
                    borderBottom: "1px solid var(--mint-text)",
                    paddingBottom: "var(--space-2)",
                    minHeight: 44,
                  }}
                >
                  WhatsApp
                  <ArrowGlyph length={24} />
                </a>
              </aside>
            ) : null}
          </div>
        </div>
      </section>

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
        @media (prefers-reduced-motion: reduce) {
          .kagu-dots { animation: none; }
        }

        /* Choice chips. A real <input type="radio"> inside a real <label>:
           native arrow-key roving focus and a genuine label per option, styled
           to the same rectangle grammar as the /start-project pickers. */
        .kagu-chip {
          display: flex;
          align-items: center;
          min-height: 52px;
          padding: var(--space-3) var(--space-4);
          border: 1px solid var(--neutral);
          background: transparent;
          color: var(--ink);
          font-family: var(--font-mono);
          font-size: var(--type-sm);
          letter-spacing: var(--tracking-eyebrow);
          text-transform: uppercase;
          line-height: 1.35;
          cursor: pointer;
          transition:
            border-color var(--dur-quick) var(--ease-out-quint),
            background var(--dur-quick) var(--ease-out-quint),
            color var(--dur-quick) var(--ease-out-quint);
        }
        .kagu-chip:hover { border-color: var(--slate-ink); }
        .kagu-chip:active { transform: translateY(1px); }
        .kagu-chip:has(input:checked) {
          border-color: var(--mint-deep);
          background: color-mix(in oklab, var(--mint-deep) 12%, transparent);
          color: var(--mint-text);
        }
        .kagu-chip:has(input:focus-visible) {
          outline: 2px solid var(--mint-deep);
          outline-offset: 3px;
        }
        @media (prefers-reduced-motion: reduce) {
          .kagu-chip { transition: none; }
          .kagu-chip:active { transform: none; }
        }

        /* A missing answer marks the whole group, not one chip. */
        .kagu-choice[data-invalid="true"] .kagu-chip { border-color: var(--mint-text); }
      `}</style>
    </form>
  );
}

/* ------------------------------ one question ----------------------------- */

function FieldControl({
  field,
  value,
  error,
  onChange,
  onPick,
  onBlur,
}: {
  field: Field;
  value: string;
  error?: string;
  onChange: (id: FieldId, value: string) => void;
  onPick: (field: Field, value: string) => void;
  onBlur: (field: Field) => void;
}) {
  const id = domId(field.id);
  const errorId = `${id}-error`;
  const helpId = `${id}-help`;
  const describedBy = [error ? errorId : null, field.help ? helpId : null]
    .filter(Boolean)
    .join(" ");

  const label = (
    <>
      {field.label}
      {field.required ? (
        <span aria-hidden style={{ color: "var(--mint-deep)" }}> *</span>
      ) : null}
      {field.hint ? <span style={{ color: "var(--slate-ink)" }}> · {field.hint}</span> : null}
    </>
  );

  const labelStyle: React.CSSProperties = {
    fontSize: "var(--type-xs)",
    letterSpacing: "var(--tracking-eyebrow)",
    textTransform: "uppercase",
    color: "var(--slate-ink)",
  };

  const help = field.help ? (
    <span
      id={helpId}
      style={{
        fontSize: "var(--type-xs)",
        color: "var(--slate-ink)",
        lineHeight: 1.5,
        maxWidth: "52ch",
      }}
    >
      {field.help}
    </span>
  ) : null;

  const errorNode = error ? (
    <span
      id={errorId}
      className="font-mono"
      style={{ fontSize: "var(--type-xs)", letterSpacing: "0.04em", color: "var(--mint-text)" }}
    >
      {error}
    </span>
  ) : null;

  // Chips: a fieldset is the correct grouping, and its legend is the question.
  if (field.kind === "choice") {
    const columns =
      field.columns === 3
        ? "sm:grid-cols-3"
        : field.columns === 2
          ? "sm:grid-cols-2"
          : "";
    return (
      <fieldset
        className="kagu-choice grid gap-3"
        data-invalid={error ? "true" : undefined}
        // Clears the fixed header when focus jumps here after a failed submit.
        style={{ scrollMarginTop: "clamp(5rem, 4rem + 3vw, 7rem)" }}
        aria-describedby={describedBy || undefined}
      >
        <legend className="font-mono" style={{ ...labelStyle, marginBottom: "var(--space-3)" }}>
          {label}
        </legend>
        <div className={`grid grid-cols-1 gap-2 ${columns}`}>
          {field.options?.map((option, index) => (
            <label key={option} className="kagu-chip" data-cursor="view">
              <input
                // Only the first radio carries the lookup id: focusing the
                // group means focusing its first option.
                id={index === 0 ? id : undefined}
                type="radio"
                name={field.id}
                value={option}
                checked={value === option}
                required={field.required}
                onChange={() => onPick(field, option)}
                className="sr-only"
              />
              {option}
            </label>
          ))}
        </div>
        {help}
        {errorNode}
      </fieldset>
    );
  }

  const shared = {
    id,
    name: field.id,
    value,
    required: field.required,
    autoComplete: field.autoComplete,
    inputMode: field.inputMode,
    "aria-required": field.required ? ("true" as const) : undefined,
    "aria-invalid": error ? ("true" as const) : undefined,
    "aria-describedby": describedBy || undefined,
    onBlur: () => onBlur(field),
    style: {
      width: "100%",
      // backgroundColor, not the `background` shorthand: the shorthand resets
      // background-image and would wipe the select's drawn arrow.
      backgroundColor: "transparent",
      border: 0,
      borderBottom: "1px solid var(--neutral)",
      padding: "var(--space-3) 0",
      minHeight: 48,
      fontSize: "var(--type-md)",
      fontFamily: "var(--font-body)",
      color: "var(--ink)",
      outline: "none",
    } as React.CSSProperties,
  };

  return (
    <div
      className="kagu-field grid gap-2"
      data-invalid={error ? "true" : undefined}
      style={{ scrollMarginTop: "clamp(5rem, 4rem + 3vw, 7rem)" }}
    >
      <label htmlFor={id} className="font-mono" style={labelStyle}>
        {label}
      </label>

      {field.kind === "select" ? (
        <select {...shared} onChange={(e) => onChange(field.id, e.target.value)}>
          <option value="">Choose one</option>
          {field.options?.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : field.kind === "textarea" ? (
        <textarea
          {...shared}
          rows={field.rows ?? 3}
          placeholder={field.placeholder}
          onChange={(e) => onChange(field.id, e.target.value)}
          style={{ ...shared.style, resize: "vertical" }}
        />
      ) : (
        <input
          {...shared}
          type={field.kind === "url" ? "url" : field.kind}
          placeholder={field.placeholder}
          onChange={(e) => onChange(field.id, e.target.value)}
        />
      )}

      {help}
      {errorNode}
    </div>
  );
}
