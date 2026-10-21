"use client";

/* Free-text client input with a custom suggestion list (replaces <datalist>).
   Submits `client_name` exactly like the old input. */

import { useId, useMemo, useRef, useState } from "react";

export function ClientCombo({
  name,
  defaultValue = "",
  options,
  placeholder,
  required,
}: {
  name: string;
  defaultValue?: string;
  options: string[];
  placeholder?: string;
  required?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listId = useId();
  const wrap = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(q) && o.toLowerCase() !== q).slice(0, 8);
  }, [options, value]);

  const pick = (v: string) => {
    setValue(v);
    setOpen(false);
    setActive(-1);
  };

  return (
    <div
      ref={wrap}
      className="relative"
      onBlur={(e) => {
        if (!wrap.current?.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <input
        name={name}
        value={value}
        required={required}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open && matches.length > 0}
        aria-controls={listId}
        className="w-full"
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive((a) => Math.min(a + 1, matches.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter" && open && active >= 0 && matches[active]) {
            e.preventDefault();
            pick(matches[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {open && matches.length > 0 ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-auto rounded-[var(--radius-ctl)] border border-[var(--line-strong)] bg-[var(--card)] p-1 shadow-[var(--shadow-pop)]"
        >
          {matches.map((m, i) => (
            <li key={m} role="option" aria-selected={i === active}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(m)}
                className={`block w-full rounded-md px-3 py-2 text-left text-sm text-[var(--ink)] ${
                  i === active ? "bg-[var(--soft)]" : "hover:bg-[var(--sand)]"
                }`}
              >
                {m}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
