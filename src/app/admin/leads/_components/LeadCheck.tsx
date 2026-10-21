"use client";

import { useEffect, useRef } from "react";

/* Custom-drawn checkbox (real <input type="checkbox"> underneath) with an
   indeterminate look for "select all". Reuses the admin .adm-check box. */
export function LeadCheck({
  checked,
  indeterminate = false,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: () => void;
  label: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate, checked]);

  return (
    <label className="adm-check ld-check">
      <input
        ref={ref}
        type="checkbox"
        aria-label={label}
        checked={checked}
        onChange={onChange}
      />
      <span className="adm-check__box" aria-hidden>
        <svg className="ld-check__tick" viewBox="0 0 12 12" fill="none">
          <path d="M2 6.5 4.8 9 10 3.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <svg className="ld-check__dash" viewBox="0 0 12 12" fill="none">
          <path d="M2.5 6h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </span>
    </label>
  );
}
