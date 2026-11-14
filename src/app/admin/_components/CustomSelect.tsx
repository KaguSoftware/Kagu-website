"use client";

/*
  CustomSelect — accessible, themed replacement for a native <select>.

  API
    <CustomSelect
      options={[{ value: "a", label: "Alpha", disabled?: boolean }]}
      // controlled:
      value={v} onChange={(next: string) => setV(next)}
      // or uncontrolled:
      defaultValue="a"
      name="field"        // renders a hidden <input name value> so <form>/server actions still submit it
      required            // empty value blocks native form submit (via a hidden validity input)
      disabled
      placeholder="Select…"   // shown when value matches no option (default "Select…")
      id="x"              // id of the trigger button
      aria-label="…" / aria-labelledby="…"
      className="…"       // extra classes on the wrapper
      buttonClassName="…" // extra classes on the trigger (e.g. a compact size)
    />

  Keyboard: ArrowUp/Down, Home/End, PageUp/PageDown move; Enter/Space select
  (Space/Enter/ArrowDown on the closed trigger opens it); Escape closes;
  Tab closes + commits nothing; printable keys type-ahead. Click outside closes.
  The popup is portalled into the nearest `.admin` element (so tokens apply and
  overflow:hidden ancestors can't clip it) and positioned fixed; it flips above
  the trigger when there is no room below and closes on outside scroll/resize.
  Uncontrolled instances reset to defaultValue when their form is reset.
*/

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

export type SelectOption = { value: string; label: string; disabled?: boolean };

export type CustomSelectProps = {
  options: readonly SelectOption[];
  value?: string;
  defaultValue?: string | null;
  onChange?: (value: string) => void;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  id?: string;
  className?: string;
  buttonClassName?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
};

type Pos = { top: number; left: number; width: number; maxHeight: number; up: boolean };

export function CustomSelect({
  options,
  value,
  defaultValue,
  onChange,
  name,
  required,
  disabled,
  placeholder = "Select…",
  id,
  className = "",
  buttonClassName = "",
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
}: CustomSelectProps) {
  const uid = useId();
  const listId = `${uid}-list`;
  const controlled = value !== undefined;
  const initial = defaultValue ?? (options.find((o) => !o.disabled)?.value ?? "");
  const [inner, setInner] = useState<string>(defaultValue ?? initial);
  const current = controlled ? (value as string) : inner;

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [pos, setPos] = useState<Pos | null>(null);
  const [host, setHost] = useState<Element | null>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typed = useRef({ s: "", t: 0 });

  const selectedIdx = useMemo(
    () => options.findIndex((o) => o.value === current),
    [options, current],
  );
  const selected = selectedIdx >= 0 ? options[selectedIdx] : null;

  const commit = useCallback(
    (v: string) => {
      if (!controlled) setInner(v);
      onChange?.(v);
    },
    [controlled, onChange],
  );

  const measure = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const below = window.innerHeight - r.bottom - 12;
    const above = r.top - 12;
    const want = Math.min(280, options.length * 38 + 10);
    const up = below < want && above > below;
    const maxHeight = Math.max(120, Math.min(280, up ? above : below));
    setPos({
      left: r.left,
      width: r.width,
      maxHeight,
      up,
      top: up ? r.top - 6 : r.bottom + 6,
    });
  }, [options.length]);

  const openList = useCallback(() => {
    if (disabled) return;
    setHost(btnRef.current?.closest(".admin") ?? document.body);
    measure();
    setActive(selectedIdx >= 0 ? selectedIdx : options.findIndex((o) => !o.disabled));
    setOpen(true);
  }, [disabled, measure, options, selectedIdx]);

  const close = useCallback((refocus = true) => {
    setOpen(false);
    if (refocus) btnRef.current?.focus({ preventScroll: true });
  }, []);

  // Outside click / scroll / resize.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t) || listRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onScroll = (e: Event) => {
      if (listRef.current?.contains(e.target as Node)) return;
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

  // Keep the active option in view.
  useLayoutEffect(() => {
    if (!open || active < 0) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-idx="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [open, active, pos]);

  // Uncontrolled: follow form reset.
  useEffect(() => {
    if (controlled) return;
    const form = wrapRef.current?.closest("form");
    if (!form) return;
    const onReset = () => setInner(defaultValue ?? initial);
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, [controlled, defaultValue, initial]);

  const step = (from: number, dir: 1 | -1) => {
    let i = from;
    for (let n = 0; n < options.length; n++) {
      i += dir;
      if (i < 0 || i >= options.length) return from;
      if (!options[i].disabled) return i;
    }
    return from;
  };
  const edge = (dir: 1 | -1) => {
    const idxs = options.map((_, i) => i).filter((i) => !options[i].disabled);
    if (!idxs.length) return -1;
    return dir === 1 ? idxs[0] : idxs[idxs.length - 1];
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    const k = e.key;
    if (!open) {
      if (k === "ArrowDown" || k === "ArrowUp" || k === "Enter" || k === " ") {
        e.preventDefault();
        openList();
        return;
      }
    } else {
      if (k === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close();
        return;
      }
      if (k === "Tab") {
        setOpen(false);
        return;
      }
      if (k === "ArrowDown") {
        e.preventDefault();
        setActive((a) => step(a, 1));
        return;
      }
      if (k === "ArrowUp") {
        e.preventDefault();
        setActive((a) => step(a, -1));
        return;
      }
      if (k === "Home") {
        e.preventDefault();
        setActive(edge(1));
        return;
      }
      if (k === "End") {
        e.preventDefault();
        setActive(edge(-1));
        return;
      }
      if (k === "PageDown") {
        e.preventDefault();
        setActive((a) => {
          let i = a;
          for (let n = 0; n < 5; n++) i = step(i, 1);
          return i;
        });
        return;
      }
      if (k === "PageUp") {
        e.preventDefault();
        setActive((a) => {
          let i = a;
          for (let n = 0; n < 5; n++) i = step(i, -1);
          return i;
        });
        return;
      }
      if (k === "Enter" || k === " ") {
        e.preventDefault();
        const o = options[active];
        if (o && !o.disabled) {
          commit(o.value);
          close();
        }
        return;
      }
    }
    // Type-ahead (works open or closed).
    if (k.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && k !== " ") {
      const now = Date.now();
      const t = typed.current;
      t.s = now - t.t > 600 ? k.toLowerCase() : t.s + k.toLowerCase();
      t.t = now;
      const startAt = open ? active : selectedIdx;
      const order = [
        ...options.map((_, i) => i).slice(startAt + 1),
        ...options.map((_, i) => i).slice(0, startAt + 1),
      ];
      // Repeated same letter cycles; otherwise prefix match starting at current.
      const prefixFirst =
        t.s.length > 1
          ? [startAt, ...order].find(
              (i) => i >= 0 && !options[i].disabled && options[i].label.toLowerCase().startsWith(t.s),
            )
          : undefined;
      const hit =
        prefixFirst ??
        order.find((i) => !options[i].disabled && options[i].label.toLowerCase().startsWith(t.s[0]));
      if (hit !== undefined) {
        e.preventDefault();
        if (open) setActive(hit);
        else commit(options[hit].value);
      }
    }
  };

  return (
    <div ref={wrapRef} className={`adm-select ${className}`}>
      {name ? (
        <input
          className="adm-select__native"
          name={name}
          value={current}
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
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-activedescendant={open && active >= 0 ? `${uid}-opt-${active}` : undefined}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby}
        aria-required={required || undefined}
        disabled={disabled}
        className={`adm-select__trigger ${buttonClassName}`}
        onClick={() => (open ? close(false) : openList())}
        onKeyDown={onKeyDown}
      >
        <span className="adm-select__value" data-placeholder={selected ? "false" : "true"}>
          {selected ? selected.label : placeholder}
        </span>
        <svg className="adm-select__chev" viewBox="0 0 12 8" fill="none" aria-hidden>
          <path d="M1 1.5 6 6.5 11 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && pos && host
        ? createPortal(
            <ul
              ref={listRef}
              id={listId}
              role="listbox"
              aria-labelledby={ariaLabelledby}
              aria-label={ariaLabelledby ? undefined : ariaLabel}
              className="adm-select__list"
              style={{
                left: pos.left,
                width: pos.width,
                maxHeight: pos.maxHeight,
                top: pos.up ? undefined : pos.top,
                bottom: pos.up ? window.innerHeight - pos.top : undefined,
              }}
              onMouseDown={(e) => e.preventDefault()}
            >
              {options.map((o, i) => (
                <li
                  key={o.value}
                  id={`${uid}-opt-${i}`}
                  data-idx={i}
                  role="option"
                  aria-selected={o.value === current}
                  aria-disabled={o.disabled || undefined}
                  data-active={i === active}
                  className="adm-select__opt"
                  onMouseMove={() => !o.disabled && active !== i && setActive(i)}
                  onClick={() => {
                    if (o.disabled) return;
                    commit(o.value);
                    close();
                  }}
                >
                  <span>{o.label}</span>
                  {o.value === current ? (
                    <svg className="adm-select__tick" viewBox="0 0 12 12" fill="none" aria-hidden>
                      <path d="M2 6.5 4.8 9 10 3.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : null}
                </li>
              ))}
            </ul>,
            host,
          )
        : null}
    </div>
  );
}
