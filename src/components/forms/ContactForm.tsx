"use client";

/*
  Contact form — Name, Email, Message. Inserts into `contact_requests`
  (anon key, insert-only RLS: never chain .select()). No mailto draft; on an
  insert error a calm inline note offers email / WhatsApp instead.
*/

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { RIBBON, FOLD, WING, KAGU_VIEWBOX } from "@/components/KaguMark";
import { SiteSelect } from "./SiteSelect";
import "./contact-form.css";

type Stage = "default" | "submitting" | "success" | "error";
type Errors = { name?: string; email?: string; message?: string };

const TYPES = ["App", "Platform", "Hosting", "AI", "Not sure"] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ContactForm({
  email,
  whatsapp,
  topic,
}: {
  email: string;
  whatsapp: string | null;
  topic?: string;
}) {
  const [stage, setStage] = useState<Stage>("default");
  const [errors, setErrors] = useState<Errors>({});
  const [type, setType] = useState<string | null>(null);
  const source = topic === "marketing" ? "start-marketing" : "contact";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (stage === "submitting" || stage === "success") return;
    const form = e.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    const senderEmail = String(data.get("email") || "").trim();
    const message = String(data.get("message") || "").trim();
    const honeypot = String(data.get("website") || "").trim();

    const next: Errors = {};
    if (!name) next.name = "Add your name.";
    if (!EMAIL_RE.test(senderEmail)) next.email = "Add an email so we can reply.";
    if (!message) next.message = "Say a few words.";
    setErrors(next);
    if (Object.keys(next).length) {
      const first = (["name", "email", "message"] as const).find((k) => next[k]);
      if (first) form.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }

    if (honeypot) {
      // Bot: pretend success, store nothing.
      setStage("success");
      return;
    }

    setStage("submitting");
    try {
      const supabase = createClient();
      const { error } = await supabase.from("contact_requests").insert({
        name,
        email: senderEmail,
        company: null,
        message: type ? `Type: ${type}\n\n${message}` : message,
        source,
      });
      if (error) {
        console.warn("contact_requests insert failed:", error.message);
        setStage("error");
        return;
      }
      setStage("success");
    } catch (err) {
      console.warn("contact_requests insert threw:", err);
      setStage("error");
    }
  }

  const done = stage === "success";
  const busy = stage === "submitting";

  return (
    <div className={`cf${done ? " cf--done" : ""}`}>
      <h2 className="cf__title">
        {topic === "marketing" ? "Tell us about your brand." : "Tell us about it."}
      </h2>
      <form
        className="cf__form"
        onSubmit={onSubmit}
        noValidate
        aria-busy={busy}
        aria-hidden={done}
        inert={done}
      >
        <div className="cf__field">
          <span className="cf__label" id="cf-type-l">
            What is it?
          </span>
          <SiteSelect options={TYPES} value={type} onChange={setType} labelledBy="cf-type-l" />
        </div>
        <Field id="cf-name" name="name" label="Name" autoComplete="name" error={errors.name} />
        <Field
          id="cf-email"
          name="email"
          label="Email"
          type="email"
          autoComplete="email"
          inputMode="email"
          error={errors.email}
        />
        <Field id="cf-message" name="message" label="A few words" multiline error={errors.message} />

        <div className="cf__hp" aria-hidden="true">
          <label htmlFor="website">Website</label>
          <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>

        <div className="cf__actions">
          <button type="submit" className="site-btn cf__send" disabled={busy}>
            <span>{busy ? "Sending…" : "Send"}</span>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
          <p className="cf__note">No spam. Just a reply.</p>
        </div>
        <p className="cf__fail" role="status" aria-live="polite">
          {stage === "error" ? (
            <>
              Couldn&apos;t send. <a href={`mailto:${email}`}>Email us instead.</a>
              {whatsapp ? (
                <>
                  {" "}
                  <a href={whatsapp} target="_blank" rel="noopener noreferrer">
                    WhatsApp
                  </a>
                </>
              ) : null}
            </>
          ) : null}
        </p>
      </form>

      <div className="cf__done" role="status" aria-live="polite" aria-hidden={!done}>
        <svg
          className="cf__mark"
          viewBox={KAGU_VIEWBOX}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinejoin="round"
          style={{ overflow: "visible" }}
          aria-hidden="true"
        >
          <path d={RIBBON} pathLength={1} vectorEffect="non-scaling-stroke" />
          <path d={FOLD} pathLength={1} vectorEffect="non-scaling-stroke" />
          <path d={WING} pathLength={1} vectorEffect="non-scaling-stroke" />
        </svg>
        {done ? (
          <>
            <p className="cf__thanks">Thanks.</p>
            <p className="cf__soon">We&apos;ll reply soon.</p>
          </>
        ) : null}
      </div>
    </div>
  );
}

function Field({
  id,
  name,
  label,
  type = "text",
  multiline,
  autoComplete,
  inputMode,
  error,
}: {
  id: string;
  name: string;
  label: string;
  type?: string;
  multiline?: boolean;
  autoComplete?: string;
  inputMode?: "email";
  error?: string;
}) {
  const errId = `${id}-err`;
  const common = {
    id,
    name,
    className: "cf__input",
    autoComplete,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": errId,
  } as const;
  return (
    <div className="cf__field">
      <label htmlFor={id} className="cf__label">
        {label}
      </label>
      {multiline ? (
        <textarea {...common} rows={4} />
      ) : (
        <input {...common} type={type} inputMode={inputMode} />
      )}
      <span id={errId} className="cf__err">
        {error ?? ""}
      </span>
    </div>
  );
}
