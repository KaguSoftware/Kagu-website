"use client";

/*
  Section 6 — Clients & Recognition.
  Background: --mint-deep (only fully-saturated section).
  Type-dominance: 8xl on the honest number (use #2 of ≤2).
  Primary motion: M06 marquee (clients strip, use #2 of 2).
  Supporting: M12 number-count on the metric.
  VARIANCE 8 / MOTION 6 / DENSITY 5.

  Honest metrics — NOT fake "30+ awards". Kagu was founded 2025; recognition
  is a tabular dl of real numbers + a marquee of real client names.
*/

import { Marquee } from "@/components/motion/Marquee";
import { SectionRise } from "@/components/motion/SectionRise";
import { Eyebrow } from "@/components/layout/Eyebrow";

export function ClientsRecognitionSection({
  metrics,
  clients,
}: {
  metrics: { label: string; value: string }[];
  clients: { slug: string; client: string }[];
}) {
  return (
    <section
      aria-label="Clients and recognition"
      style={{ background: "var(--mint-deep)", position: "relative", overflow: "hidden" }}
      className="py-(--section-y)"
    >
      {/* Decorative geometry — large quiet shapes layered behind the content. */}
      <svg
        aria-hidden
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      >
        {/* Off-center ring */}
        <circle
          cx="930"
          cy="180"
          r="240"
          fill="none"
          stroke="var(--slate-ink)"
          strokeWidth="1"
          opacity="0.28"
        />
        {/* Small filled dot */}
        <circle cx="930" cy="180" r="6" fill="var(--slate-ink)" opacity="0.55" />
        {/* Diagonal hairline */}
        <line
          x1="60"
          y1="680"
          x2="1140"
          y2="120"
          stroke="var(--slate-ink)"
          strokeWidth="1"
          opacity="0.18"
        />
        {/* Bottom-left ink wedge */}
        <path
          d="M -40 720 L 360 560 L 360 800 L -40 800 Z"
          fill="var(--slate-ink)"
          opacity="0.16"
        />
        {/* Plus glyphs */}
        <g stroke="var(--ink)" strokeWidth="1" opacity="0.4">
          <path d="M120 120 v18 M111 129 h18" />
          <path d="M1080 540 v22 M1069 551 h22" />
          <path d="M520 70 v14 M513 77 h14" />
        </g>
      </svg>
      <div className="w-full max-w-(--container-max) mx-auto px-(--container-x) relative">
        {/* Heading only — the giant NumberCount was a hero-metric template
            reflex (impeccable F3+F4). Removed. Identity now carried by the
            line "No awards. Yet." + the spec-sheet metrics below. */}
        <SectionRise className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-(--space-24)">
          <div className="md:col-span-9">
            <Eyebrow number="06">In production</Eyebrow>
            <h2
              className="display"
              style={{
                fontSize: "var(--type-6xl)",
                lineHeight: 0.95,
                marginTop: "var(--space-6)",
                maxWidth: "12ch",
                color: "var(--ink)",
              }}
            >
              No awards. Yet.
            </h2>
            <p
              style={{
                fontSize: "var(--type-md)",
                lineHeight: 1.6,
                color: "var(--ink)",
                marginTop: "var(--space-6)",
                maxWidth: "52ch",
              }}
            >
              We&apos;re six months old. The work shows up in real shifts, real
              menus, real proposals, measured in clients in production, not
              certificates on a wall.
            </p>
          </div>
        </SectionRise>

        {/* Honest metrics table */}
        <SectionRise>
          <dl
            className="grid grid-cols-2 md:grid-cols-4 gap-x-8"
            style={{
              borderTop: "1px solid color-mix(in oklab, var(--ink) 25%, transparent)",
              paddingTop: "var(--space-8)",
              marginBottom: "var(--space-24)",
            }}
          >
            {metrics.map((m) => (
              <div key={m.label} className="flex flex-col">
                <dt
                  className="font-mono"
                  style={{
                    fontSize: "var(--type-xs)",
                    letterSpacing: "var(--tracking-eyebrow)",
                    textTransform: "uppercase",
                    color: "color-mix(in oklab, var(--ink) 55%, transparent)",
                    marginBottom: "var(--space-3)",
                  }}
                >
                  {m.label}
                </dt>
                <dd
                  className="display"
                  style={{
                    fontSize: "var(--type-xl)",
                    color: "var(--ink)",
                    lineHeight: 1,
                  }}
                >
                  {m.value}
                </dd>
              </div>
            ))}
          </dl>
        </SectionRise>

        {/* Client name marquee */}
        <div
          style={{
            borderTop: "1px solid color-mix(in oklab, var(--ink) 25%, transparent)",
            paddingTop: "var(--space-8)",
          }}
        >
          <span
            className="eyebrow block"
            style={{ color: "var(--ink)", marginBottom: "var(--space-5)" }}
          >
            Operators we&apos;ve shipped for
          </span>
        </div>
      </div>

      {/* Marquee bleeds full-width */}
      <Marquee duration={28}>
        {clients.map((c) => (
          <span
            key={c.slug}
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--type-6xl)",
              color: "var(--ink)",
              padding: "0 var(--space-12)",
              whiteSpace: "nowrap",
              lineHeight: 1,
            }}
          >
            {c.client}
            <span style={{ color: "var(--paper)", marginLeft: "var(--space-12)" }} aria-hidden>
              ·
            </span>
          </span>
        ))}
      </Marquee>
    </section>
  );
}
