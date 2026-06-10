"use client";

/*
  Section 1 — Hero.
  Background: --paper (baseline).
  Type-dominance: 8xl (use #1 of ≤2 on page).
  Primary motion: M4 word-mask-reveal (use #1 of ≤3 on page).
  Supporting: M3 greeting cycle, M9 magnet on CTA, M15 ambient drift (subtle).
  VARIANCE 9 / MOTION 7 / DENSITY 2.
*/

import Link from "next/link";
import { motion } from "motion/react";
import { KaguMark } from "@/components/KaguMark";
import { WordMaskReveal } from "@/components/motion/WordMaskReveal";
import { GreetingCycle } from "@/components/motion/GreetingCycle";
import { HoverMagnet } from "@/components/motion/HoverMagnet";
import { HoverTextSwap } from "@/components/motion/HoverTextSwap";
import { AmbientDrift } from "@/components/motion/AmbientDrift";
import { ScrollSkew } from "@/components/motion/ScrollSkew";
import { Marquee } from "@/components/motion/Marquee";
import type { MarqueeItem } from "@/lib/marquees";

// Tiny crosshair used as corner registration marks (editorial blueprint feel).
function CornerMark({
  position,
}: {
  position: "tl" | "tr" | "bl" | "br";
}) {
  const offset = "calc(var(--container-x) * 0.55)";
  const placement: Record<typeof position, React.CSSProperties> = {
    tl: { top: offset, left: offset },
    tr: { top: offset, right: offset },
    bl: { bottom: offset, left: offset },
    br: { bottom: offset, right: offset },
  };
  return (
    <span
      aria-hidden
      style={{
        position: "absolute",
        width: 14,
        height: 14,
        zIndex: 1,
        ...placement[position],
      }}
    >
      <span
        style={{
          position: "absolute",
          inset: 0,
          top: "50%",
          height: 1,
          background: "var(--slate-ink)",
          opacity: 0.45,
        }}
      />
      <span
        style={{
          position: "absolute",
          inset: 0,
          left: "50%",
          width: 1,
          background: "var(--slate-ink)",
          opacity: 0.45,
        }}
      />
    </span>
  );
}

export function HeroSection({ heroMarquee }: { heroMarquee: MarqueeItem[] }) {
  return (
    <section
      aria-label="Introduction"
      style={{
        minHeight: "100dvh",
        background: "var(--paper)",
        position: "relative",
        overflow: "hidden",
        // Clear the fixed floating header (pill ≈ 56px + its vertical padding)
        // with generous breathing room so the nav never crowds the hero meta.
        paddingTop: "clamp(128px, 18vh, 192px)",
      }}
      className="px-(--container-x) pb-(--section-y) flex flex-col"
    >
      {/* Ambient drift (M15 use #1 of 2): plus-pattern + grain + drift */}
      <AmbientDrift variant="light" />

      {/* Corner registration marks — editorial framing */}
      <CornerMark position="tl" />
      <CornerMark position="tr" />
      <CornerMark position="bl" />
      <CornerMark position="br" />

      {/* Vertical edge meta — rotated mono on the left margin */}
      <motion.span
        aria-hidden
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.6 }}
        className="hidden md:block font-mono"
        style={{
          position: "absolute",
          left: "calc(var(--container-x) * 0.35)",
          top: "50%",
          transform: "translateY(-50%) rotate(-90deg)",
          transformOrigin: "left center",
          whiteSpace: "nowrap",
          fontSize: "var(--type-xs)",
          letterSpacing: "var(--tracking-eyebrow)",
          textTransform: "uppercase",
          color: "var(--slate-ink)",
          zIndex: 1,
        }}
      >
        S01 · Index · 2026
      </motion.span>

      {/* Hero bird — illustrated character, asymmetric right placement.
          Positioned absolute so it bleeds over the layout grid; the H1
          on the left reads through it visually. Gentle continuous float
          gives the silhouette life without competing with the H1. */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, delay: 1.1, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: "absolute",
          right: "calc(var(--container-x) * -0.4)",
          bottom: "calc(var(--section-y) * 0.25)",
          width: "min(48vw, 560px)",
          aspectRatio: "1 / 1",
          pointerEvents: "none",
        }}
        className="hidden sm:block"
      >
        <motion.div
          style={{ position: "absolute", inset: 0 }}
          animate={{ y: [0, -10, 0], rotate: [0, -1.2, 0] }}
          transition={{
            duration: 7,
            ease: "easeInOut",
            repeat: Infinity,
            repeatType: "loop",
          }}
        >
          <KaguMark
            preserveAspectRatio="xMaxYMax meet"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              color: "var(--slate-ink)",
              opacity: 1,
            }}
          />
        </motion.div>
      </motion.div>

      <div className="w-full max-w-(--container-max) mx-auto flex-1 flex flex-col justify-between relative">
        {/* Top row: eyebrow with greeting cycle + status */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-12 gap-4 items-baseline"
          style={{ paddingTop: "var(--space-4)" }}
        >
          <div className="col-span-1 md:col-span-5">
            <span className="eyebrow inline-flex items-baseline gap-3 flex-wrap">
              <GreetingCycle
                className="display"
                style={{
                  fontSize: "var(--type-3xl)",
                  letterSpacing: "var(--tracking-tight)",
                  textTransform: "none",
                  color: "var(--ink)",
                  lineHeight: 1,
                }}
              />
              <span>· est. 2025 · Istanbul</span>
            </span>
          </div>
          <div className="col-span-1 md:col-span-5 md:col-start-8 md:text-right">
            <span
              className="eyebrow inline-flex items-center gap-2"
              style={{ color: "var(--slate-ink)" }}
            >
              <span
                aria-hidden
                style={{
                  position: "relative",
                  width: 8,
                  height: 8,
                  display: "inline-block",
                }}
              >
                <span
                  data-hero-pulse-ring
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: 999,
                    background: "var(--mint-deep)",
                    animation: "kagu-hero-pulse-ring 2.2s ease-out infinite",
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    inset: 2,
                    borderRadius: 999,
                    background: "var(--mint-deep)",
                  }}
                />
              </span>
              Accepting projects · 2026 Q3
            </span>
          </div>
        </motion.div>

        {/* Hero statement — asymmetric grid placement, left bias */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end" style={{ marginTop: "auto", marginBottom: "auto" }}>
          <div className="md:col-span-10">
            <ScrollSkew>
              <WordMaskReveal
                as="h1"
                text="Software for boutique operators."
                className="display"
                delay={0.4}
              />
            </ScrollSkew>
          </div>
        </div>

        {/* Bottom row: lede + CTA. Hero-metric block removed (impeccable F2). */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end" style={{ marginTop: "var(--space-16)" }}>
          <motion.div
            className="md:col-span-6"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <p
              style={{
                fontSize: "var(--type-md)",
                lineHeight: 1.55,
                maxWidth: "44ch",
                color: "var(--ink)",
              }}
            >
              We build Next.js + Supabase platforms for hospitality, tourism,
              and service businesses. Small team. Real production work. No
              agency theatre.
            </p>
          </motion.div>

          {/* CTA — magnet + text-swap. Border on the mint surface (impeccable F7). */}
          <motion.div
            className="md:col-span-4 md:col-start-9 md:text-right"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.55, ease: [0.22, 1, 0.36, 1] }}
          >
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
                <span
                  aria-hidden
                  style={{
                    width: 24,
                    height: 1,
                    background: "var(--ink)",
                  }}
                />
              </Link>
            </HoverMagnet>
          </motion.div>
        </div>
      </div>

      {/* Capability ticker — quiet bottom edge that gives the hero a heartbeat */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.7 }}
        style={{
          position: "relative",
          zIndex: 1,
          marginTop: "var(--space-12)",
          marginLeft: "calc(var(--container-x) * -1)",
          marginRight: "calc(var(--container-x) * -1)",
          borderTop: "1px solid color-mix(in oklab, var(--slate-ink) 18%, transparent)",
          borderBottom: "1px solid color-mix(in oklab, var(--slate-ink) 18%, transparent)",
          paddingTop: 14,
          paddingBottom: 14,
        }}
      >
        <Marquee duration={48}>
          {heroMarquee.map((cap) => (
            <span
              key={cap.label}
              className="font-mono"
              style={{
                fontSize: "var(--type-xs)",
                letterSpacing: "var(--tracking-eyebrow)",
                textTransform: "uppercase",
                color: "var(--slate-ink)",
                display: "inline-flex",
                alignItems: "center",
                gap: 28,
                paddingRight: 28,
              }}
            >
              {cap.label}
              <span
                aria-hidden
                style={{
                  display: "inline-block",
                  width: 6,
                  height: 6,
                  transform: "rotate(45deg)",
                  background: "var(--mint-deep)",
                }}
              />
            </span>
          ))}
        </Marquee>
      </motion.div>

      <style>{`
        @keyframes kagu-hero-pulse-ring {
          0% { transform: scale(0.8); opacity: 0.6; }
          70% { transform: scale(2.2); opacity: 0; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-hero-pulse-ring] { animation: none !important; }
        }
      `}</style>
    </section>
  );
}
