"use client";

/*
  Section 7 — Contact / Footer.
  Background: --slate-ink (inversion — paper-on-dark for the close).
  Type-dominance: 8xl "Let's talk." statement — wait, already used 2x (Hero+Recognition).
  We'll use 7xl/6xl for the close to respect the ≤2 rule on 8xl.
  Primary motion: M08 hover-text-swap on email + Let's talk.
  Supporting: M11 live clocks, M15 ambient drift (use #2 of 2).
  VARIANCE 9 / MOTION 7 / DENSITY 2.
*/

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Logo } from "@/components/Logo";
import { HoverTextSwap } from "@/components/motion/HoverTextSwap";
import { HoverMagnet } from "@/components/motion/HoverMagnet";
import { AmbientDrift } from "@/components/motion/AmbientDrift";
import { Eyebrow } from "@/components/layout/Eyebrow";
import { studio } from "@/data/studio";

function useLiveTime(tz: string) {
  const [t, setT] = useState("");
  useEffect(() => {
    function tick() {
      setT(
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
  return t;
}

function Clock({ city, tz, utc }: { city: string; tz: string; utc: string }) {
  const t = useLiveTime(tz);
  return (
    <div className="flex flex-col">
      <span
        className="font-mono"
        style={{
          fontSize: "var(--type-xs)",
          letterSpacing: "var(--tracking-eyebrow)",
          textTransform: "uppercase",
          color: "var(--mint-deep)",
        }}
      >
        {city} · {utc}
      </span>
      <span
        className="font-mono"
        style={{
          fontSize: "var(--type-2xl)",
          color: "var(--paper)",
          fontVariantNumeric: "tabular-nums",
          marginTop: 4,
        }}
        suppressHydrationWarning
      >
        {t || "--:--:--"}
      </span>
    </div>
  );
}

export function ContactFooterSection() {
  return (
    <section
      aria-label="Contact"
      style={{
        background: "var(--slate-ink)",
        color: "var(--paper)",
        position: "relative",
        overflow: "hidden",
      }}
      className="px-(--container-x) pt-(--section-y) pb-(--space-12)"
    >
      {/* Ambient drift — M15 (use #2 of 2) */}
      <AmbientDrift variant="dark" />

      <div className="w-full max-w-(--container-max) mx-auto relative">
        {/* The close */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-(--space-32) items-end"
        >
          <div className="md:col-span-9">
            <Eyebrow number="07">
              <span style={{ color: "var(--mint-deep)" }}>Get in touch</span>
            </Eyebrow>
            <h2
              className="display"
              style={{
                fontSize: "var(--type-8xl)",
                lineHeight: 0.88,
                color: "var(--paper)",
                marginTop: "var(--space-6)",
                maxWidth: "10ch",
                letterSpacing: "var(--tracking-tight)",
              }}
            >
              Let&apos;s talk.
            </h2>
          </div>
        </motion.div>

        {/* Email + CTA */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-(--space-32) items-end">
          <div className="md:col-span-8">
            <span
              className="eyebrow block"
              style={{ color: "var(--mint-deep)", marginBottom: "var(--space-4)" }}
            >
              Direct
            </span>
            <a
              href={`mailto:${studio.email}`}
              data-cursor="read"
              className="kagu-text-swap-trigger"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--type-5xl)",
                color: "var(--paper)",
                display: "inline-block",
                lineHeight: 1,
                letterSpacing: "var(--tracking-tight)",
              }}
            >
              <HoverTextSwap>{studio.email}</HoverTextSwap>
            </a>
            <p
              style={{
                fontSize: "var(--type-md)",
                lineHeight: 1.6,
                color: "var(--mint-pale)",
                marginTop: "var(--space-6)",
                maxWidth: "52ch",
              }}
            >
              We respond inside 24 hours, in Turkish or English. Tell us the
              shift you&apos;re trying to make easier. We&apos;ll tell you whether we&apos;re
              the right team for it.
            </p>
          </div>
          <div className="md:col-span-3 md:col-start-10 md:text-right">
            <HoverMagnet strength={1} radius={120}>
              <Link
                href="/contact"
                data-cursor="view"
                className="inline-flex items-center gap-3"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "var(--type-md)",
                  letterSpacing: "var(--tracking-eyebrow)",
                  textTransform: "uppercase",
                  color: "var(--ink)",
                  background: "var(--mint-deep)",
                  padding: "20px 28px",
                  minHeight: 56,
                  border: "1px solid var(--ink)",
                }}
              >
                <HoverTextSwap>Start a project</HoverTextSwap>
                <span aria-hidden style={{ width: 24, height: 1, background: "var(--ink)" }} />
              </Link>
            </HoverMagnet>
          </div>
        </div>

        {/* Clocks */}
        <div
          className="grid grid-cols-3 gap-6 mb-(--space-24)"
          style={{
            borderTop: "1px solid color-mix(in oklab, var(--mint-pale) 18%, transparent)",
            paddingTop: "var(--space-12)",
          }}
        >
          {studio.clocks.map((c) => (
            <Clock key={c.city} {...c} />
          ))}
        </div>

        {/* Footer meta */}
        <div
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--type-xs)",
            letterSpacing: "var(--tracking-eyebrow)",
            textTransform: "uppercase",
            color: "var(--mint-pale)",
          }}
        >
          <div className="flex items-center gap-4">
            <span style={{ fontSize: "var(--type-lg)" }}>
              <Logo size={24} />
            </span>
            <span style={{ color: "color-mix(in oklab, var(--mint-pale) 65%, transparent)" }}>
              © {new Date().getFullYear()} Kagu Software
            </span>
          </div>
          <span style={{ color: "color-mix(in oklab, var(--mint-pale) 65%, transparent)" }}>
            {studio.location} · {studio.timezone}
          </span>
        </div>
      </div>
    </section>
  );
}
