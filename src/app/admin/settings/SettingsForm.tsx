"use client";

import { useState } from "react";
import { updateSettings } from "../_actions/settings";
import { SubmitButton } from "../_components/SubmitButton";
import { Field } from "../_components/ui";
import type { Tables, Clock } from "@/lib/supabase/database.types";

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
    <form action={updateSettings} className="max-w-2xl space-y-9">
      <input type="hidden" name="clocks" value={JSON.stringify(clocks)} />

      <section className="space-y-6">
        <h2 className="eyebrow">Studio</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Field label="Founded" name="founded" defaultValue={settings.founded} />
          <Field label="Location" name="location" defaultValue={settings.location} />
          <Field label="Email" name="email" defaultValue={settings.email} />
          <Field label="Domain" name="domain" defaultValue={settings.domain} />
          <Field label="Timezone" name="timezone" defaultValue={settings.timezone} />
        </div>
      </section>

      <section className="space-y-4 border-t border-[var(--line)] pt-6">
        <h2 className="eyebrow">World clocks</h2>
        <div className="kagu-field space-y-2">
          {clocks.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={c.city}
                onChange={(e) => update(i, "city", e.target.value)}
                placeholder="City"
                aria-label="City"
                className="w-full"
              />
              <input
                value={c.tz}
                onChange={(e) => update(i, "tz", e.target.value)}
                placeholder="Europe/Istanbul"
                aria-label="Time zone"
                className="w-full"
              />
              <input
                value={c.utc}
                onChange={(e) => update(i, "utc", e.target.value)}
                placeholder="+03:00"
                aria-label="UTC offset"
                className="w-32 shrink-0"
              />
              <button
                type="button"
                onClick={() => remove(i)}
                className="adm-listrow__x"
                aria-label="Remove clock"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button type="button" onClick={add} className="adm-btn adm-btn--text">
          + Add clock
        </button>
      </section>

      <div className="sticky bottom-0 -mx-1 flex items-center gap-3 border-t border-[var(--line)] bg-[var(--bg)] px-1 py-4">
        <SubmitButton>Save settings</SubmitButton>
      </div>
    </form>
  );
}
