"use client";

import { useState } from "react";

type Feature = {
  image: string;
  title: string;
  description: string;
  device: "desktop" | "mobile" | null;
};

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
    setFeatures((prev) => [...prev, { image: "", title: "", description: "", device: null }]);
  const remove = (i: number) =>
    setFeatures((prev) => prev.filter((_, idx) => idx !== i));

  return (
    <div>
      <input type="hidden" name="features" value={JSON.stringify(features)} />
      <span className="eyebrow mb-3 block">Case features</span>

      <div className="space-y-5">
        {features.map((f, i) => (
          <div key={i} className="border border-neutral p-4">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-neutral">
                Feature {String(i + 1).padStart(2, "0")}
              </span>
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-xs font-mono uppercase tracking-[0.18em] text-slate-ink hover:text-ink"
              >
                Remove
              </button>
            </div>
            <div className="mt-3 space-y-3">
              <input
                value={f.title}
                onChange={(e) => update(i, "title", e.target.value)}
                placeholder="Title"
                className="w-full border-0 border-b border-neutral bg-transparent py-1.5 text-base text-ink outline-none focus-visible:border-mint-deep"
              />
              <input
                value={f.image}
                onChange={(e) => update(i, "image", e.target.value)}
                placeholder="Image URL (/cases/… or https://…)"
                className="w-full border-0 border-b border-neutral bg-transparent py-1.5 text-sm text-ink outline-none focus-visible:border-mint-deep"
              />
              <textarea
                value={f.description}
                onChange={(e) => update(i, "description", e.target.value)}
                placeholder="Description"
                rows={2}
                className="w-full resize-y border border-neutral bg-transparent p-2 text-sm text-ink outline-none focus-visible:border-mint-deep"
              />
              <select
                value={f.device ?? ""}
                onChange={(e) => update(i, "device", e.target.value)}
                className="border border-neutral bg-paper px-2 py-1.5 text-sm text-ink outline-none focus-visible:border-mint-deep"
              >
                <option value="">Device: inherit</option>
                <option value="desktop">Desktop</option>
                <option value="mobile">Mobile</option>
              </select>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={add}
        className="mt-4 text-xs font-mono uppercase tracking-[0.18em] text-slate-ink transition-colors hover:text-mint-deep"
      >
        + Add feature
      </button>
    </div>
  );
}
