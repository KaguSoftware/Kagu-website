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
import Image from "next/image";
import { motion } from "motion/react";
import { WordMaskReveal } from "@/components/motion/WordMaskReveal";
import { GreetingCycle } from "@/components/motion/GreetingCycle";
import { HoverMagnet } from "@/components/motion/HoverMagnet";
import { HoverTextSwap } from "@/components/motion/HoverTextSwap";
import { AmbientDrift } from "@/components/motion/AmbientDrift";
import { ScrollSkew } from "@/components/motion/ScrollSkew";

export function HeroSection() {
  return (
    <section
      aria-label="Introduction"
      style={{
        minHeight: "100dvh",
        background: "var(--paper)",
        position: "relative",
        overflow: "hidden",
      }}
      className="px-(--container-x) pt-(--space-8) pb-(--section-y) flex flex-col"
    >
      {/* Ambient drift (M15 use #1 of 2): plus-pattern + grain + drift */}
      <AmbientDrift variant="light" />

      {/* Hero bird — illustrated character, asymmetric right placement.
          Positioned absolute so it bleeds over the layout grid; the H1
          on the left reads through it visually. */}
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
        <Image
          src="/kagulogoNoBg.png"
          alt=""
          fill
          priority
          sizes="(max-width: 640px) 0px, 560px"
          style={{
            objectFit: "contain",
            objectPosition: "right bottom",
            opacity: 0.92,
          }}
        />
      </motion.div>

      <div className="w-full max-w-(--container-max) mx-auto flex-1 flex flex-col justify-between relative">
        {/* Top row: eyebrow with greeting cycle + status */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-12 gap-4 items-baseline"
          style={{ paddingTop: "var(--space-12)" }}
        >
          <div className="col-span-1 md:col-span-5">
            <span className="eyebrow">
              <GreetingCycle /> · est. 2025 · Istanbul
            </span>
          </div>
          <div className="col-span-1 md:col-span-5 md:col-start-8 md:text-right">
            <span className="eyebrow" style={{ color: "var(--slate-ink)" }}>
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
    </section>
  );
}
