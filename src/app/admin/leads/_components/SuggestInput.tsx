"use client";

/*
  SuggestInput — custom replacement for <input list> + <datalist>. A real text
  input (so it submits under `name` and keeps native validity) with a themed,
  keyboard-navigable suggestion list. Free text is always allowed.
*/

import { useId, useMemo, useState } from "react";

export function SuggestInput({
  name,
  suggestions,
  required,
  minLength,
  placeholder,
}: {
  name: string;
  suggestions: readonly string[];
  required?: boolean;
  minLength?: number;
  placeholder?: string;
}) {
  const uid = useId();
  const listId = `${uid}-list`;
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase();
    return suggestions
      .filter((s) => s.toLowerCase() !== q && (!q || s.toLowerCase().includes(q)))
      .slice(0, 8);
  }, [suggestions, value]);

  const showList = open && matches.length > 0;

  const pick = (v: string) => {
    setValue(v);
    setOpen(false);
    setActive(-1);
  };

  return (
    <div className="ld-suggest">
      <input
        name={name}
        value={value}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && active >= 0 ? `${uid}-o${active}` : undefined}
        className="w-full"
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && matches.length) {
            e.preventDefault();
            setOpen(true);
            setActive((a) => (a + 1) % matches.length);
          } else if (e.key === "ArrowUp" && matches.length) {
            e.preventDefault();
            setOpen(true);
            setActive((a) => (a <= 0 ? matches.length - 1 : a - 1));
          } else if (e.key === "Enter" && showList && active >= 0) {
            e.preventDefault();
            pick(matches[active]);
          } else if (e.key === "Escape" && showList) {
            e.stopPropagation(); // close the list, not the surrounding modal
            setOpen(false);
          }
        }}
      />
      {showList && (
        <ul id={listId} role="listbox" className="ld-suggest__list">
          {matches.map((m, i) => (
            <li
              key={m}
              id={`${uid}-o${i}`}
              role="option"
              aria-selected={i === active}
              data-active={i === active}
              className="ld-suggest__opt"
              onMouseDown={(e) => {
                e.preventDefault(); // keep input focus so blur doesn't close first
                pick(m);
              }}
              onMouseEnter={() => setActive(i)}
            >
              {m}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
