"use client";

import { useRef, useState } from "react";

function Arrow() {
  return (
    <svg className="cx-row__arrow" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function ContactRows({
  email,
  whatsapp,
  phone,
}: {
  email: string;
  whatsapp: string | null;
  phone: string;
}) {
  const [copied, setCopied] = useState(false);
  const mailRef = useRef<HTMLSpanElement>(null);
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

  const tel = `tel:${phone.replace(/[^\d+]/g, "")}`;

  return (
    <ul className="cx-rows">
      <li className="cx-rowwrap">
        <a className="cx-row" href={`mailto:${email}`}>
          <span className="cx-row__label">Email</span>
          <span className="cx-row__value" ref={mailRef}>
            {email}
          </span>
          <Arrow />
        </a>
        <button type="button" className="cx-copy" onClick={copy} aria-live="polite">
          {copied ? "Copied" : "Copy"}
        </button>
      </li>
      {whatsapp ? (
        <li className="cx-rowwrap">
          <a className="cx-row" href={whatsapp} target="_blank" rel="noopener noreferrer">
            <span className="cx-row__label">WhatsApp</span>
            <span className="cx-row__value">Message us</span>
            <Arrow />
          </a>
        </li>
      ) : null}
      <li className="cx-rowwrap">
        <a className="cx-row" href={tel}>
          <span className="cx-row__label">Phone</span>
          <span className="cx-row__value">{phone}</span>
          <Arrow />
        </a>
      </li>
    </ul>
  );
}
