"use client";

/*
  DatePicker — custom calendar popover (no native <input type="date">).

    <DatePicker label="Published" name="published_at" defaultValue="2026-10-21"
                min="2026-01-01" max="2026-12-31" required
                onChange={(iso: string) => …} />
    // controlled: value="YYYY-MM-DD" ("" = empty) + onChange
    // A hidden <input name value="YYYY-MM-DD"> carries the ISO date to forms
    // (required blocks submit through it, like CustomSelect).
  Keyboard: Enter/Space/ArrowDown opens; in the grid arrows move by day/week,
  PageUp/PageDown by month (Shift = year), Home/End = week start/end,
  Enter/Space picks, Escape closes. Popover is portalled into `.admin`, fixed,
  flips above when needed, closes on outside click/scroll/resize.
*/

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function parse(s?: string | null): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const addMonths = (d: Date, n: number) => {
  const t = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
  return new Date(t.getFullYear(), t.getMonth(), Math.min(d.getDate(), last));
};
const DOW = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const fmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });
const fmtMonth = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" });

export function DatePicker({
  label,
  name,
  value,
  defaultValue,
  onChange,
  min,
  max,
  required,
  disabled,
  placeholder = "Select date",
  id,
  className = "",
  "aria-label": ariaLabel,
}: {
  label?: string;
  name?: string;
  value?: string;
  defaultValue?: string | null;
  onChange?: (iso: string) => void;
  min?: string;
  max?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
  className?: string;
  "aria-label"?: string;
}) {
  const uid = useId();
  const controlled = value !== undefined;
  const [inner, setInner] = useState(defaultValue ?? "");
  const cur = controlled ? (value as string) : inner;
  const sel = parse(cur);
  const minD = parse(min);
  const maxD = parse(max);

  const [open, setOpen] = useState(false);
  const [focusD, setFocusD] = useState<Date>(sel ?? new Date());
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number } | null>(null);
  const [host, setHost] = useState<Element | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  const commit = useCallback(
    (s: string) => {
      if (!controlled) setInner(s);
      onChange?.(s);
    },
    [controlled, onChange],
  );
  const out = (d: Date) => (minD && d < minD) || (maxD && d > maxD);

  const openCal = () => {
    if (disabled) return;
    const r = btnRef.current!.getBoundingClientRect();
    const up = window.innerHeight - r.bottom < 380 && r.top > window.innerHeight - r.bottom;
    setPos({
      left: Math.max(8, Math.min(r.left, window.innerWidth - 296)),
      top: up ? undefined : r.bottom + 6,
      bottom: up ? window.innerHeight - r.top + 6 : undefined,
    });
    setHost(btnRef.current!.closest(".admin") ?? document.body);
    setFocusD(sel ?? new Date());
    setOpen(true);
  };
  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) btnRef.current?.focus({ preventScroll: true });
  };

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || popRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onScroll = (e: Event) => {
      if (popRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onResize = () => setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  // Move DOM focus to the focused day whenever it changes while open.
  useEffect(() => {
    if (!open) return;
    popRef.current?.querySelector<HTMLElement>(`[data-iso="${iso(focusD)}"]`)?.focus({ preventScroll: true });
  }, [open, focusD]);

  // Uncontrolled: follow form reset.
  useEffect(() => {
    if (controlled) return;
    const form = wrapRef.current?.closest("form");
    if (!form) return;
    const onReset = () => setInner(defaultValue ?? "");
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, [controlled, defaultValue]);

  const onGridKey = (e: React.KeyboardEvent) => {
    const k = e.key;
    let next: Date | null = null;
    if (k === "ArrowLeft") next = addDays(focusD, -1);
    else if (k === "ArrowRight") next = addDays(focusD, 1);
    else if (k === "ArrowUp") next = addDays(focusD, -7);
    else if (k === "ArrowDown") next = addDays(focusD, 7);
    else if (k === "PageUp") next = addMonths(focusD, e.shiftKey ? -12 : -1);
    else if (k === "PageDown") next = addMonths(focusD, e.shiftKey ? 12 : 1);
    else if (k === "Home") next = addDays(focusD, -((focusD.getDay() + 6) % 7));
    else if (k === "End") next = addDays(focusD, 6 - ((focusD.getDay() + 6) % 7));
    else if (k === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close();
      return;
    } else if (k === "Tab") {
      setOpen(false);
      return;
    }
    if (next) {
      e.preventDefault();
      setFocusD(next);
    }
  };

  const first = new Date(focusD.getFullYear(), focusD.getMonth(), 1);
  const lead = (first.getDay() + 6) % 7;
  const cells = Array.from({ length: 42 }, (_, i) => addDays(first, i - lead));
  const today = iso(new Date());
  const labelId = `${uid}-l`;

  return (
    <div ref={wrapRef} className={`kagu-field block ${className}`}>
      {label ? (
        <span id={labelId} className="eyebrow mb-2 block">
          {label}
          {required ? <span className="text-mint-deep"> *</span> : null}
        </span>
      ) : null}
      <div className="adm-select">
        {name ? (
          <input
            className="adm-select__native"
            name={name}
            value={cur}
            required={required}
            disabled={disabled}
            tabIndex={-1}
            aria-hidden
            onChange={() => {}}
          />
        ) : null}
        <button
          ref={btnRef}
          id={id}
          type="button"
          className="adm-select__trigger"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-labelledby={label ? labelId : undefined}
          aria-label={label ? undefined : ariaLabel}
          disabled={disabled}
          onClick={() => (open ? close(false) : openCal())}
          onKeyDown={(e) => {
            if (!open && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              openCal();
            }
          }}
        >
          <span className="adm-select__value" data-placeholder={sel ? "false" : "true"}>
            {sel ? fmt.format(sel) : placeholder}
          </span>
          <svg className="adm-select__chev" style={{ height: 14, width: 14 }} viewBox="0 0 14 14" fill="none" aria-hidden>
            <rect x="1.5" y="2.5" width="11" height="10" rx="2" stroke="currentColor" strokeWidth="1.3" />
            <path d="M1.5 5.5h11M4.5 1v3M9.5 1v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {open && pos && host
        ? createPortal(
            <div
              ref={popRef}
              role="dialog"
              aria-label="Choose date"
              className="adm-cal"
              style={{ left: pos.left, top: pos.top, bottom: pos.bottom }}
            >
              <div className="adm-cal__head">
                <button type="button" className="adm-cal__nav" aria-label="Previous month" onClick={() => setFocusD(addMonths(focusD, -1))}>
                  ‹
                </button>
                <span className="adm-cal__title" aria-live="polite">
                  {fmtMonth.format(focusD)}
                </span>
                <button type="button" className="adm-cal__nav" aria-label="Next month" onClick={() => setFocusD(addMonths(focusD, 1))}>
                  ›
                </button>
              </div>
              <div className="adm-cal__grid" role="grid" onKeyDown={onGridKey}>
                {DOW.map((d) => (
                  <span key={d} className="adm-cal__dow" role="columnheader">
                    {d}
                  </span>
                ))}
                {cells.map((d) => {
                  const s = iso(d);
                  const isFocus = s === iso(focusD);
                  return (
                    <button
                      key={s}
                      type="button"
                      role="gridcell"
                      data-iso={s}
                      data-out={d.getMonth() !== focusD.getMonth()}
                      data-today={s === today}
                      aria-selected={s === cur}
                      disabled={!!out(d)}
                      tabIndex={isFocus ? 0 : -1}
                      className="adm-cal__day"
                      onClick={() => {
                        commit(s);
                        close();
                      }}
                    >
                      {d.getDate()}
                    </button>
                  );
                })}
              </div>
              <div className="adm-cal__foot">
                <button
                  type="button"
                  className="adm-btn adm-btn--text"
                  onClick={() => {
                    const t = new Date();
                    if (out(t)) return;
                    commit(iso(t));
                    close();
                  }}
                >
                  Today
                </button>
                {!required ? (
                  <button
                    type="button"
                    className="adm-btn adm-btn--text"
                    onClick={() => {
                      commit("");
                      close();
                    }}
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>,
            host,
          )
        : null}
    </div>
  );
}
