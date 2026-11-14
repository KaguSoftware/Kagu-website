"use client";

/*
  ThemeToggle — Light / Dark / System segmented control for the admin.

  Mechanism: the choice lives in the cookie `kagu-admin-theme` ("light"|"dark";
  absent = system). admin/layout.tsx reads it server-side and renders
  `data-theme` on the `.admin` wrapper (none for system), so first paint is
  already correct — no flash. Clicking sets the cookie, updates the wrapper's
  data-theme, and broadcasts an event so the sidebar and mobile toggles stay in
  sync. admin.css follows the system via color-scheme when no data-theme is set.
*/

import { useEffect, useState } from "react";

export type AdminTheme = "light" | "dark" | "system";
export const THEME_COOKIE = "kagu-admin-theme";
const EVT = "kagu-admin-theme";

const ICONS: Record<AdminTheme, React.ReactNode> = {
  light: (
    <>
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M3.4 12.6l1.1-1.1M11.5 4.5l1.1-1.1" />
    </>
  ),
  dark: <path d="M13.2 9.6A5.6 5.6 0 0 1 6.4 2.8a5.6 5.6 0 1 0 6.8 6.8Z" />,
  system: (
    <>
      <rect x="1.8" y="2.6" width="12.4" height="8.2" rx="1.6" />
      <path d="M5.5 13.6h5M8 10.8v2.8" />
    </>
  ),
};
const LABEL: Record<AdminTheme, string> = { light: "Light", dark: "Dark", system: "System" };

function applyTheme(t: AdminTheme) {
  try {
    if (t === "system") document.cookie = `${THEME_COOKIE}=; path=/; max-age=0; samesite=lax`;
    else document.cookie = `${THEME_COOKIE}=${t}; path=/; max-age=31536000; samesite=lax`;
  } catch {}
  document.querySelectorAll(".admin").forEach((el) => {
    if (t === "system") el.removeAttribute("data-theme");
    else el.setAttribute("data-theme", t);
  });
}

export function ThemeToggle({ initial = "system" }: { initial?: AdminTheme }) {
  const [theme, setTheme] = useState<AdminTheme>(initial);

  useEffect(() => {
    const on = (e: Event) => setTheme((e as CustomEvent<AdminTheme>).detail);
    window.addEventListener(EVT, on);
    return () => window.removeEventListener(EVT, on);
  }, []);

  const pick = (t: AdminTheme) => {
    setTheme(t);
    applyTheme(t);
    window.dispatchEvent(new CustomEvent<AdminTheme>(EVT, { detail: t }));
  };

  return (
    <div className="adm-theme" role="radiogroup" aria-label="Theme">
      {(["light", "dark", "system"] as const).map((t) => (
        <button
          key={t}
          type="button"
          role="radio"
          aria-checked={theme === t}
          aria-label={LABEL[t]}
          data-tip={LABEL[t]}
          className="adm-theme__opt"
          onClick={() => pick(t)}
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            {ICONS[t]}
          </svg>
        </button>
      ))}
    </div>
  );
}
