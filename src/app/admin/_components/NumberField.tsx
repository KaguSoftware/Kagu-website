"use client";

/*
  NumberField — custom −/+ stepper around a real <input type="number"> (native
  spinners are hidden in admin.css), so forms and native validity still work.

    <NumberField label="Order" name="sort_order" defaultValue={0} min={0} max={99} step={1}
                 required hint="…" />
    // controlled: value={n} onChange={(n: string) => …}   (string, "" when empty)
    // Without `label` it renders just the stepper (aria-label via `aria-label`).
  ArrowUp/ArrowDown on the input also step (native behaviour kept).
*/

import { useId, useState } from "react";

export function NumberField({
  label,
  name,
  value,
  defaultValue,
  onChange,
  min,
  max,
  step = 1,
  required,
  disabled,
  hint,
  placeholder,
  id,
  className = "",
  "aria-label": ariaLabel,
}: {
  label?: string;
  name?: string;
  value?: number | string;
  defaultValue?: number | string | null;
  onChange?: (value: string) => void;
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
  disabled?: boolean;
  hint?: string;
  placeholder?: string;
  id?: string;
  className?: string;
  "aria-label"?: string;
}) {
  const uid = useId();
  const inputId = id ?? `${uid}-n`;
  const controlled = value !== undefined;
  const [inner, setInner] = useState(String(defaultValue ?? ""));
  const cur = controlled ? String(value) : inner;

  const set = (v: string) => {
    if (!controlled) setInner(v);
    onChange?.(v);
  };
  const nudge = (dir: 1 | -1) => {
    const n = cur === "" ? (min ?? 0) - (dir === 1 ? step : -step) * 0 : Number(cur);
    let next = (Number.isFinite(n) ? n : 0) + dir * step;
    if (cur === "" && dir === 1 && min !== undefined) next = min;
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    const dp = (String(step).split(".")[1] ?? "").length;
    set(String(Number(next.toFixed(dp))));
  };
  const n = Number(cur);
  const atMin = min !== undefined && cur !== "" && n <= min;
  const atMax = max !== undefined && cur !== "" && n >= max;

  return (
    <div className={`kagu-field block ${className}`}>
      {label ? (
        <label htmlFor={inputId} className="eyebrow mb-2 block">
          {label}
          {required ? <span className="text-mint-deep"> *</span> : null}
        </label>
      ) : null}
      <div className="adm-num">
        <button
          type="button"
          className="adm-num__btn"
          aria-label="Decrease"
          tabIndex={-1}
          disabled={disabled || atMin}
          onClick={() => nudge(-1)}
        >
          −
        </button>
        <input
          id={inputId}
          name={name}
          type="number"
          inputMode="decimal"
          value={cur}
          min={min}
          max={max}
          step={step}
          required={required}
          disabled={disabled}
          placeholder={placeholder}
          aria-label={label ? undefined : ariaLabel}
          onChange={(e) => set(e.target.value)}
        />
        <button
          type="button"
          className="adm-num__btn"
          aria-label="Increase"
          tabIndex={-1}
          disabled={disabled || atMax}
          onClick={() => nudge(1)}
        >
          +
        </button>
      </div>
      {hint ? <span className="mt-1.5 block text-xs text-slate-ink">{hint}</span> : null}
    </div>
  );
}
