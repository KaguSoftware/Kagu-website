"use client";

import { useRef, useState } from "react";

/** Email + Copy + WhatsApp. Copy falls back to selecting the text. */
export function ContactHero({
  email,
  whatsapp,
}: {
  email: string;
  whatsapp: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const mailRef = useRef<HTMLAnchorElement>(null);
  const timer = useRef<number | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1800);
    } catch {
      const el = mailRef.current;
      if (!el) return;
      const range = document.createRange();
      range.selectNodeContents(el);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }

  return (
    <>
      <a ref={mailRef} href={`mailto:${email}`} className="about-mail">
        {email}
      </a>
      <div className="about-pills">
        <button type="button" className="about-pill" onClick={copy} aria-live="polite">
          {copied ? "Copied" : "Copy"}
        </button>
        {whatsapp ? (
          <a
            className="about-pill"
            href={whatsapp}
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp
          </a>
        ) : null}
      </div>
    </>
  );
}
