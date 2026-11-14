"use client";

import { useState } from "react";
import { CustomSelect } from "../_components/ui";

type Feature = {
  image: string;
  title: string;
  description: string;
  alt: string;
  device: "desktop" | "mobile" | null;
};

const DEVICE_OPTIONS = [
  { value: "", label: "Device: inherit" },
  { value: "desktop", label: "Desktop" },
  { value: "mobile", label: "Mobile" },
];

export function FeatureEditor({
  defaultValue = [],
}: {
  defaultValue?: Feature[];
}) {
  const [features, setFeatures] = useState<Feature[]>(defaultValue);

  const update = (i: number, key: keyof Feature, v: string) =>
    setFeatures((prev) =>
      prev.map((f, idx) =>
        idx === i ? { ...f, [key]: key === "device" ? (v || null) : v } : f
      )
    );
  const add = () =>
    setFeatures((prev) => [...prev, { image: "", title: "", description: "", alt: "", device: null }]);
  const remove = (i: number) =>
    setFeatures((prev) => prev.filter((_, idx) => idx !== i));

  return (
    <div>
      <input type="hidden" name="features" value={JSON.stringify(features)} />
      <span className="eyebrow mb-3 block">Case features</span>

      <div className="space-y-4">
        {features.map((f, i) => (
          <div
            key={i}
            className="kagu-field rounded-[var(--radius-ctl)] border border-[var(--line)] bg-[var(--card)] p-5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs tabular-nums text-[var(--muted)]">
                Feature {String(i + 1).padStart(2, "0")}
              </span>
              <button type="button" onClick={() => remove(i)} className="adm-btn adm-btn--text">
                Remove
              </button>
            </div>
            <div className="mt-3 space-y-3">
              <input
                value={f.title}
                onChange={(e) => update(i, "title", e.target.value)}
                placeholder="Title"
                aria-label="Feature title"
                className="w-full"
              />
              <input
                value={f.image}
                onChange={(e) => update(i, "image", e.target.value)}
                placeholder="Image URL (/cases/… or https://…)"
                aria-label="Feature image URL"
                className="w-full"
              />
              <textarea
                value={f.description}
                onChange={(e) => update(i, "description", e.target.value)}
                placeholder="Description"
                aria-label="Feature description"
                rows={2}
                className="w-full resize-y"
              />
              <input
                value={f.alt}
                onChange={(e) => update(i, "alt", e.target.value)}
                placeholder="Alt text — what the screenshot shows (falls back to the title)"
                aria-label="Feature alt text"
                className="w-full"
              />
              <CustomSelect
                value={f.device ?? ""}
                onChange={(v) => update(i, "device", v)}
                options={DEVICE_OPTIONS}
                aria-label="Feature device"
              />
            </div>
          </div>
        ))}
      </div>

      <button type="button" onClick={add} className="adm-btn adm-btn--ghost mt-4">
        + Add feature
      </button>
    </div>
  );
}
