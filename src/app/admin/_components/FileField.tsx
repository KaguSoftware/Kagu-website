"use client";

/*
  FileField — custom drop zone / button around a REAL <input type="file">
  (kept in the DOM, transparent, covering the zone) so form submission and
  server-action uploads behave exactly as with a native input.

    <FileField label="Image" name="file" accept="image/*" multiple required
               hint="PNG or JPG" onFiles={(files: File[]) => …} />
  Dropping files onto the zone assigns them to the input via DataTransfer.
*/

import { useId, useRef, useState } from "react";

export function FileField({
  label,
  name,
  accept,
  multiple,
  required,
  disabled,
  hint,
  onFiles,
  id,
  className = "",
}: {
  label?: string;
  name: string;
  accept?: string;
  multiple?: boolean;
  required?: boolean;
  disabled?: boolean;
  hint?: string;
  onFiles?: (files: File[]) => void;
  id?: string;
  className?: string;
}) {
  const uid = useId();
  const inputId = id ?? `${uid}-f`;
  const ref = useRef<HTMLInputElement>(null);
  const [names, setNames] = useState<string[]>([]);
  const [drag, setDrag] = useState(false);

  const sync = (files: File[]) => {
    setNames(files.map((f) => f.name));
    onFiles?.(files);
  };

  return (
    <div className={`kagu-field block ${className}`}>
      {label ? (
        <label htmlFor={inputId} className="eyebrow mb-2 block">
          {label}
          {required ? <span className="text-mint-deep"> *</span> : null}
        </label>
      ) : null}
      <div
        className="adm-drop"
        data-drag={drag}
        onDragOver={(e) => {
          if (disabled) return;
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          if (disabled || !ref.current) return;
          const list = Array.from(e.dataTransfer.files);
          if (!list.length) return;
          const dt = new DataTransfer();
          (multiple ? list : list.slice(0, 1)).forEach((f) => dt.items.add(f));
          ref.current.files = dt.files;
          sync(Array.from(dt.files));
        }}
      >
        <input
          ref={ref}
          id={inputId}
          name={name}
          type="file"
          accept={accept}
          multiple={multiple}
          required={required}
          disabled={disabled}
          onChange={(e) => sync(Array.from(e.target.files ?? []))}
        />
        <span className="adm-drop__pick">{names.length ? "Change file" : "Choose file"}</span>
        <span>{multiple ? "or drop files here" : "or drop a file here"}</span>
        {names.length ? <span className="adm-drop__names">{names.join(", ")}</span> : null}
      </div>
      {hint ? <span className="mt-1.5 block text-xs text-slate-ink">{hint}</span> : null}
    </div>
  );
}
