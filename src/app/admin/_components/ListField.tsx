"use client";

import { useState } from "react";

/**
 * Edits a Postgres text[] column. Each row is one array item.
 * Submits as `name` with newline-joined value; the Server Action splits on \n.
 */
export function ListField({
  label,
  name,
  defaultValue = [],
  hint,
}: {
  label: string;
  name: string;
  defaultValue?: readonly string[];
  hint?: string;
}) {
  const [items, setItems] = useState<string[]>(
    defaultValue.length ? [...defaultValue] : [""]
  );

  const update = (i: number, v: string) =>
    setItems((prev) => prev.map((x, idx) => (idx === i ? v : x)));
  const add = () => setItems((prev) => [...prev, ""]);
  const remove = (i: number) =>
    setItems((prev) => (prev.length === 1 ? [""] : prev.filter((_, idx) => idx !== i)));

  return (
    <div className="kagu-field">
      <span className="eyebrow mb-2 block">{label}</span>
      <input type="hidden" name={name} value={items.filter((x) => x.trim()).join("\n")} />
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="adm-listrow">
            <span className="adm-listrow__n">{String(i + 1).padStart(2, "0")}</span>
            <input
              value={item}
              onChange={(e) => update(i, e.target.value)}
              className="w-full"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="adm-listrow__x"
              aria-label="Remove item"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={add}
        className="adm-btn adm-btn--text mt-3"
      >
        + Add row
      </button>
      {hint ? <span className="mt-2 block text-xs text-slate-ink">{hint}</span> : null}
    </div>
  );
}
