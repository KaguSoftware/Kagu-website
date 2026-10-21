"use client";

import { useId, useState, type ReactNode } from "react";

/* Custom accessible disclosure (button + aria-expanded) — replaces native <details>. */
export function Disclosure({
  label,
  openLabel,
  children,
}: {
  label: string;
  openLabel?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <div className="ld-disc">
      <button
        type="button"
        className="ld-disc__btn"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        <svg className="ld-disc__chev" viewBox="0 0 12 12" fill="none" aria-hidden>
          <path d="M4 2.5 7.5 6 4 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {open ? (openLabel ?? label) : label}
      </button>
      <div id={panelId} className="ld-disc__panel" hidden={!open}>
        {children}
      </div>
    </div>
  );
}
