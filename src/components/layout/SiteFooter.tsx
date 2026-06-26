"use client";

/*
  SiteFooter — used on routes that DON'T have the ContactFooterSection at the
  bottom (homepage has its own contact close). For internal routes, this acts
  as the inverted closing surface: deep grey-navy background, mono meta, multi-city
  clocks. M11 live clocks update every second via useEffect.
*/

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { FooterLegalStrip } from "./FooterLegalStrip";
import { createClient } from "@/lib/supabase/client";
import type { Clock } from "@/lib/supabase/database.types";

export type FooterStudio = {
  mission: string;
  location: string;
  timezone: string;
  email: string;
  clocks: Clock[];
};

const EMPTY_FOOTER: FooterStudio = {
  mission: "",
  location: "",
  timezone: "",
  email: "",
  clocks: [],
};

/** Client-side studio fetch for footers rendered inside client pages. */
function useFooterStudio(initial?: FooterStudio): FooterStudio {
  const [data, setData] = useState<FooterStudio>(initial ?? EMPTY_FOOTER);
  useEffect(() => {
    if (initial) return;
    let active = true;
    (async () => {
      const supabase = createClient();
      const [{ data: settings }, { data: blocks }] = await Promise.all([
        supabase.from("site_settings").select("*").eq("singleton", true).single(),
        supabase.from("about_blocks").select("body, kind").eq("kind", "mission"),
      ]);
      if (!active) return;
      setData({
        mission: blocks?.[0]?.body ?? "",
        location: settings?.location ?? "",
        timezone: settings?.timezone ?? "",
        email: settings?.email ?? "",
        clocks: settings?.clocks ?? [],
      });
    })();
    return () => {
      active = false;
    };
  }, [initial]);
  return data;
}

function useClock(tz: string) {
  const [time, setTime] = useState<string>("");
  useEffect(() => {
    function tick() {
      setTime(
        new Intl.DateTimeFormat("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
          timeZone: tz,
        }).format(new Date()),
      );
    }
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [tz]);
  return time;
}

function Clock({ city, tz, utc }: { city: string; tz: string; utc: string }) {
  const time = useClock(tz);
  return (
    <div className="flex flex-col">
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "var(--type-xs)",
          letterSpacing: "var(--tracking-eyebrow)",
          textTransform: "uppercase",
          color: "var(--mint-deep)",
        }}
      >
        {city} · {utc}
      </span>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "var(--type-2xl)",
          color: "var(--ink)",
          fontVariantNumeric: "tabular-nums",
          marginTop: 4,
        }}
        suppressHydrationWarning
      >
        {time || "--:--"}
      </span>
    </div>
  );
}

export function SiteFooter({ studio: initial }: { studio?: FooterStudio }) {
  const studio = useFooterStudio(initial);
  return (
    <footer
      style={{
        background: "#0e1016",
        color: "var(--ink)",
        paddingTop: "var(--section-y)",
        paddingBottom: "var(--space-12)",
        marginTop: "var(--space-32)",
      }}
    >
      <div className="w-full max-w-(--container-max) mx-auto px-(--container-x)">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 mb-(--space-32)">
          {/* Lockup + email */}
          <div className="md:col-span-7">
            <div style={{ fontSize: "var(--type-4xl)", color: "var(--ink)" }}>
              <Logo size={64} />
            </div>
            <p
              style={{
                fontSize: "var(--type-md)",
                color: "var(--slate-ink)",
                marginTop: "var(--space-6)",
                maxWidth: "44ch",
                lineHeight: 1.55,
              }}
            >
              {studio.mission}
            </p>
          </div>
          {/* Nav */}
          <div className="md:col-span-5 md:col-start-9 flex flex-col gap-3">
            <span
              className="eyebrow"
              style={{ color: "var(--mint-deep)" }}
            >
              Pages
            </span>
            <Link
              href="/work"
              data-cursor="nav-link"
              style={{ fontFamily: "var(--font-display)", fontSize: "var(--type-lg)", color: "var(--ink)" }}
            >
              Work
            </Link>
            <Link
              href="/about"
              data-cursor="nav-link"
              style={{ fontFamily: "var(--font-display)", fontSize: "var(--type-lg)", color: "var(--ink)" }}
            >
              About
            </Link>
            <Link
              href="/contact"
              data-cursor="nav-link"
              style={{ fontFamily: "var(--font-display)", fontSize: "var(--type-lg)", color: "var(--ink)" }}
            >
              Contact
            </Link>
          </div>
        </div>

        {/* Clocks */}
        <div
          className="grid grid-cols-3 gap-6"
          style={{
            borderTop: "1px solid color-mix(in oklab, var(--ink) 14%, transparent)",
            paddingTop: "var(--space-12)",
            marginBottom: "var(--space-16)",
          }}
        >
          {studio.clocks.map((c) => (
            <Clock key={c.city} {...c} />
          ))}
        </div>

        {/* Meta line */}
        <div
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-3"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--type-xs)",
            letterSpacing: "var(--tracking-eyebrow)",
            textTransform: "uppercase",
            color: "var(--slate-ink)",
          }}
        >
          <span>© {new Date().getFullYear()} Kagu Software</span>
          <span>{studio.location} · {studio.timezone}</span>
          <a
            href={`mailto:${studio.email}`}
            data-cursor="read"
            style={{ color: "var(--mint-deep)" }}
          >
            {studio.email}
          </a>
        </div>

        <FooterLegalStrip />
      </div>
    </footer>
  );
}
