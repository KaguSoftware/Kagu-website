"use client";

import { useState } from "react";
import { updateSettings } from "../_actions/settings";
import { SubmitButton } from "../_components/SubmitButton";
import type { Tables, Clock } from "@/lib/supabase/database.types";

function Text({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue?: string | null;
}) {
  return (
    <label className="kagu-field block">
      <span className="eyebrow mb-2 block">{label}</span>
      <input
        name={name}
        defaultValue={defaultValue ?? undefined}
        className="w-full border-0 border-b border-neutral bg-transparent py-2 text-base text-ink outline-none"
      />
    </label>
  );
}

export function SettingsForm({ settings }: { settings: Tables<"site_settings"> }) {
  const [clocks, setClocks] = useState<Clock[]>(
    settings.clocks?.length ? settings.clocks : [{ city: "", tz: "", utc: "" }]
  );

  const update = (i: number, key: keyof Clock, v: string) =>
    setClocks((prev) => prev.map((c, idx) => (idx === i ? { ...c, [key]: v } : c)));
  const add = () => setClocks((prev) => [...prev, { city: "", tz: "", utc: "" }]);
  const remove = (i: number) =>
    setClocks((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i)));

  return (
    <form action={updateSettings} className="max-w-xl space-y-6">
      <input type="hidden" name="clocks" value={JSON.stringify(clocks)} />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Text label="Founded" name="founded" defaultValue={settings.founded} />
        <Text label="Location" name="location" defaultValue={settings.location} />
        <Text label="Email" name="email" defaultValue={settings.email} />
        <Text label="Domain" name="domain" defaultValue={settings.domain} />
        <Text label="Timezone" name="timezone" defaultValue={settings.timezone} />
      </div>

      <div>
        <span className="eyebrow mb-3 block">World clocks</span>
        <div className="space-y-3">
          {clocks.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={c.city}
                onChange={(e) => update(i, "city", e.target.value)}
                placeholder="City"
                className="w-full border-0 border-b border-neutral bg-transparent py-1.5 text-sm text-ink outline-none focus-visible:border-mint-deep"
              />
              <input
                value={c.tz}
                onChange={(e) => update(i, "tz", e.target.value)}
                placeholder="Europe/Istanbul"
                className="w-full border-0 border-b border-neutral bg-transparent py-1.5 text-sm text-ink outline-none focus-visible:border-mint-deep"
              />
              <input
                value={c.utc}
                onChange={(e) => update(i, "utc", e.target.value)}
                placeholder="+03:00"
                className="w-28 border-0 border-b border-neutral bg-transparent py-1.5 text-sm text-ink outline-none focus-visible:border-mint-deep"
              />
              <button
                type="button"
                onClick={() => remove(i)}
                className="px-2 font-mono text-sm text-slate-ink hover:text-ink"
                aria-label="Remove clock"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={add}
          className="mt-3 text-xs font-mono uppercase tracking-[0.18em] text-slate-ink transition-colors hover:text-mint-deep"
        >
          + Add clock
        </button>
      </div>

      <div className="pt-2">
        <SubmitButton>Save settings</SubmitButton>
      </div>
    </form>
  );
}
