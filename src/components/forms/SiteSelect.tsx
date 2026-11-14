"use client";

/*
  SiteSelect — custom dropdown for the public forms (no native <select>).
  Controlled: value / onChange. Keyboard: Arrow keys, Home/End, Enter/Space,
  Escape, Tab, and type-ahead. Click outside closes. Styled in contact-form.css.
*/
import { useEffect, useId, useRef, useState } from "react";

export function SiteSelect({
  options,
  value,
  onChange,
  placeholder = "Choose one",
  labelledBy,
}: {
  options: readonly string[];
  value: string | null;
  onChange: (next: string) => void;
  placeholder?: string;
  labelledBy?: string;
}) {
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const typed = useRef({ s: "", t: 0 });
  const selectedIdx = value ? options.indexOf(value) : -1;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  const openList = () => {
    setActive(selectedIdx >= 0 ? selectedIdx : 0);
    setOpen(true);
  };
  const pick = (i: number) => {
    onChange(options[i]);
    setOpen(false);
    btnRef.current?.focus({ preventScroll: true });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const k = e.key;
    if (!open) {
      if (k === "ArrowDown" || k === "ArrowUp" || k === "Enter" || k === " ") {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (k === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (k === "Tab") {
      setOpen(false);
    } else if (k === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(options.length - 1, a + 1));
    } else if (k === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (k === "Home") {
      e.preventDefault();
      setActive(0);
    } else if (k === "End") {
      e.preventDefault();
      setActive(options.length - 1);
    } else if (k === "Enter" || k === " ") {
      e.preventDefault();
      pick(active);
    } else if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const now = Date.now();
      const t = typed.current;
      t.s = now - t.t > 600 ? k.toLowerCase() : t.s + k.toLowerCase();
      t.t = now;
      const hit = options.findIndex((o) => o.toLowerCase().startsWith(t.s));
      if (hit >= 0) setActive(hit);
    }
  };

  return (
    <div ref={wrapRef} className="cf-select">
      <button
        ref={btnRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${uid}-list` : undefined}
        aria-activedescendant={open ? `${uid}-o${active}` : undefined}
        aria-labelledby={labelledBy}
        className="cf-select__btn"
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
      >
        <span className="cf-select__val" data-empty={value ? "false" : "true"}>
          {value ?? placeholder}
        </span>
        <svg className="cf-select__chev" viewBox="0 0 12 8" fill="none" aria-hidden="true">
          <path
            d="M1 1.5 6 6.5 11 1.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open ? (
        <ul
          id={`${uid}-list`}
          role="listbox"
          aria-labelledby={labelledBy}
          className="cf-select__list"
          onMouseDown={(e) => e.preventDefault()}
        >
          {options.map((o, i) => (
            <li
              key={o}
              id={`${uid}-o${i}`}
              role="option"
              aria-selected={o === value}
              data-active={i === active}
              className="cf-select__opt"
              onMouseMove={() => active !== i && setActive(i)}
              onClick={() => pick(i)}
            >
              <span>{o}</span>
              {o === value ? (
                <svg className="cf-select__tick" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path
                    d="M2 6.5 4.8 9 10 3.2"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
