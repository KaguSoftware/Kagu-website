"use client";

/*
  CaseReel — pinned, scroll-paced feature reel for a case study.
  The stage pins; screenshots cross-fade through the case's features
  while the copy column swaps title + description in sync.

  Frame 0 is the optional thumbnail (used as the establishing shot
  with the case lede). Frames 1..N are the features.

  Pin/scrub piped through ScrollTrigger so it stays in lockstep
  with Lenis smooth scroll (bridged in SmoothScrollProvider).
*/

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ScrollTrigger } from "@/lib/gsap";
import { useReducedMotion } from "motion/react";
import type { Case } from "@/data/cases";

interface CaseReelProps {
  caseData: Case;
  index: number;
  /** "large" gives a centerpiece treatment for case-study pages. */
  size?: "default" | "large";
  /** Preview mode: a single pinned frame with the thumbnail + lede + "View details" CTA.
   *  Used on the homepage so visitors get the pin/scroll feel without seeing the full feature reel. */
  preview?: boolean;
}

type Frame = {
  image?: string;
  title: string;
  description: string;
  isCover?: boolean;
  /** "cta" renders a color-block placeholder (no screenshot) with a big label. */
  kind?: "image" | "cta";
  ctaLabel?: string;
  ctaBg?: "mint-pale" | "mint-soft" | "mint-deep" | "slate-ink" | "paper";
  /** Per-frame device override (e.g. a desktop admin shot inside a mobile case). */
  device?: "desktop" | "mobile";
};

function stripUrl(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

const CTA_BG: Record<NonNullable<Frame["ctaBg"]>, string> = {
  "mint-pale": "var(--mint-pale)",
  "mint-soft": "var(--mint-soft)",
  "mint-deep": "var(--mint-deep)",
  "slate-ink": "var(--slate-ink)",
  paper: "var(--paper)",
};

const CTA_FG: Record<NonNullable<Frame["ctaBg"]>, string> = {
  "mint-pale": "var(--slate-ink)",
  "mint-soft": "var(--slate-ink)",
  "mint-deep": "var(--ink)",
  "slate-ink": "var(--mint-pale)",
  paper: "var(--slate-ink)",
};

export function CaseReel({ caseData, index, size = "default", preview = false }: CaseReelProps) {
  const isLarge = size === "large";
  // Alternate sides per index in the homepage strip (even = image left,
  // odd = image right). Case-page reel ignores this (single component).
  const reversed = !isLarge && index % 2 === 1;
  const tokens = {
    clientSize: isLarge ? "var(--type-6xl)" : "var(--type-4xl)",
    titleSize: isLarge ? "var(--type-4xl)" : "var(--type-3xl)",
    descSize: isLarge ? "var(--type-lg)" : "var(--type-md)",
    counterSize: isLarge ? "var(--type-sm)" : "var(--type-xs)",
    imageCol: `md:col-span-8 ${reversed ? "md:col-start-5 md:row-start-1" : ""}`,
    copyCol: `md:col-span-4 ${reversed ? "md:col-start-1 md:row-start-1" : ""}`,
  };
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const copyFrameRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const [ratios, setRatios] = useState<Record<number, number>>({});
  const [copyHeight, setCopyHeight] = useState<number | undefined>(undefined);
  const [isMobile, setIsMobile] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const handler = () => setIsMobile(mq.matches);
    handler();
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Measure the active copy frame so the column animates to its content
  // height — short frames (e.g. "View details") don't leave a tall gap.
  useEffect(() => {
    const el = copyFrameRefs.current[active];
    if (!el) return;
    const measure = () => setCopyHeight(el.scrollHeight);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [active]);

  const features = caseData.features ?? [];
  const frameDevice = (f: Frame): "desktop" | "mobile" =>
    f.device ?? caseData.device ?? "desktop";
  const frames: Frame[] = preview
    ? caseData.thumbnail
      ? [
          {
            image: caseData.thumbnail,
            title: caseData.project,
            description: caseData.lede,
            isCover: true,
            kind: "image",
          },
          {
            kind: "cta",
            ctaLabel: "View details",
            ctaBg: caseData.cover.bg,
            title: "Open the case",
            description: "Scroll through highlighted features on the case study page.",
          },
        ]
      : []
    : [
        ...(caseData.thumbnail
          ? [
              {
                image: caseData.thumbnail,
                title: caseData.project,
                description: caseData.lede,
                isCover: true,
                kind: "image",
              } as Frame,
            ]
          : []),
        ...features.map<Frame>((f) => ({
          image: f.image,
          title: f.title,
          description: f.description,
          kind: "image",
          device: f.device,
        })),
      ];

  const total = frames.length;
  // Shorter hold in preview (homepage) so the section doesn't dominate the page.
  // Mobile case-page reels also get a shorter hold — pinning for 5+ viewports
  // is exhausting at phone scale.
  const HOLD_PER_FRAME = preview ? 0.25 : isMobile ? 0.55 : 1;

  useEffect(() => {
    if (reduced || total === 0) return;
    const container = containerRef.current;
    const stage = stageRef.current;
    if (!container || !stage) return;

    // Preview mode (homepage) doesn't lock scroll — the section scrolls past
    // normally and the displayed frame changes based on scroll progress over
    // the container's bounds. Full reels still pin.
    const trigger = preview
      ? ScrollTrigger.create({
          trigger: container,
          // Desktop fires earlier (top hits center) so the phone-frame cases
          // swap before the user scrolls past most of the section. Mobile
          // keeps the later trigger.
          start: "top 25%",
          end: "bottom center",
          scrub: 0.4,
          onUpdate: (self) => {
            const idx = Math.min(total - 1, Math.floor(self.progress * total));
            setActive((curr) => (curr === idx ? curr : idx));
          },
          invalidateOnRefresh: true,
        })
      : ScrollTrigger.create({
          trigger: container,
          start: "top top",
          end: () => `+=${window.innerHeight * HOLD_PER_FRAME * total}`,
          pin: stage,
          pinSpacing: true,
          scrub: 0.4,
          refreshPriority: 1,
          onUpdate: (self) => {
            const idx = Math.min(total - 1, Math.floor(self.progress * total));
            setActive((curr) => (curr === idx ? curr : idx));
          },
          invalidateOnRefresh: true,
        });

    // Force a refresh after mount so triggers that registered before the pin
    // spacer was inserted (or that depend on this section's height) recalc.
    const refreshId = requestAnimationFrame(() => {
      requestAnimationFrame(() => ScrollTrigger.refresh());
    });

    return () => {
      cancelAnimationFrame(refreshId);
      trigger.kill();
    };
  }, [reduced, total, isMobile, preview]);

  if (total === 0) return null;

  const counter = `${String(active + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        // Total scroll distance = (frames * hold) + 1 viewport for the pin itself.
        // pinSpacing: true means GSAP adds spacing; we only need this on the
        // container so layout calculates the right height.
      }}
      aria-label={`${caseData.client} feature reel`}
    >
      <div
        ref={stageRef}
        style={{
          // Desktop locks to one viewport so all case sections are the same
          // height and the preview scrub behaves identically across them.
          // Mobile uses minHeight so cramped content can grow.
          height: isMobile ? undefined : "100vh",
          minHeight: "100svh",
          display: "flex",
          flexDirection: "column",
          background: "var(--paper)",
          position: "relative",
          zIndex: 1,
          isolation: "isolate",
          paddingTop: "clamp(76px, 9vh, 91px)",
        }}
        className="px-(--container-x) pb-(--space-12)"
      >
        <div className="w-full max-w-(--container-max) mx-auto h-full flex flex-col">
          {/* Top meta row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-baseline">
            <div className="md:col-span-6">
              <span
                className="font-mono block"
                style={{
                  fontSize: tokens.counterSize,
                  letterSpacing: "var(--tracking-eyebrow)",
                  textTransform: "uppercase",
                  color: "var(--slate-ink)",
                }}
              >
                {String(index + 1).padStart(2, "0")} · {caseData.sector} · {caseData.year}
              </span>
              <h3
                className="display"
                style={{
                  fontSize: tokens.clientSize,
                  lineHeight: 1,
                  marginTop: "var(--space-2)",
                }}
              >
                {caseData.client}
              </h3>
            </div>
            {!preview && (
              <div className="hidden md:block md:col-span-3 md:col-start-10 md:text-right">
                <span
                  className="font-mono"
                  style={{
                    fontSize: tokens.counterSize,
                    letterSpacing: "var(--tracking-eyebrow)",
                    textTransform: "uppercase",
                    color: "var(--slate-ink)",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {counter}
                </span>
              </div>
            )}
          </div>

          {/* Stage: screenshot + copy */}
          <div
            className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8 items-center flex-1"
            style={{ marginTop: "var(--space-8)", minHeight: 0 }}
          >
            {/* Screenshot stack */}
            <div className={tokens.imageCol} style={{ width: "100%" }}>
              {/* Shared browser chrome — sits ABOVE the stage so the stage's
                  aspect-ratio = image's natural ratio with no extra height
                  budget eaten by the chrome. Collapses when the active frame
                  is mobile, so phone frames don't have a stray URL bar. */}
              {(() => {
                const activeFrame = frames[active];
                const activeDevice = activeFrame ? frameDevice(activeFrame) : "desktop";
                const showChrome = activeDevice === "desktop";
                return (
                  <div
                    aria-hidden={!showChrome}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: showChrome ? "10px 14px" : "0 14px",
                      maxHeight: showChrome ? 60 : 0,
                      opacity: showChrome ? 1 : 0,
                      overflow: "hidden",
                      transition:
                        "max-height 500ms cubic-bezier(0.22, 1, 0.36, 1), opacity 320ms cubic-bezier(0.22, 1, 0.36, 1), padding 500ms cubic-bezier(0.22, 1, 0.36, 1)",
                    }}
                  >
                    <div style={{ display: "flex", gap: 6 }}>
                      {[0, 1, 2].map((d) => (
                        <span
                          key={d}
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            background: "color-mix(in oklab, var(--slate-ink) 32%, transparent)",
                            display: "inline-block",
                          }}
                        />
                      ))}
                    </div>
                    <div
                      style={{
                        flex: 1,
                        padding: "4px 10px",
                        borderRadius: 4,
                        background: "color-mix(in oklab, var(--slate-ink) 10%, transparent)",
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        letterSpacing: "0.04em",
                        color: "var(--slate-ink)",
                        textAlign: "center",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: "min(75%, 320px)",
                        margin: "0 auto",
                      }}
                    >
                      {stripUrl(caseData.url)}
                    </div>
                  </div>
                );
              })()}

              {/* Frame stage. Aspect tracks the active frame's device:
                  - mobile: 4/5 so the phone has breathing room
                  - desktop: the natural image ratio (smoothly animated) */}
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  aspectRatio:
                    (frames[active] && frameDevice(frames[active]) === "mobile")
                      ? (isMobile ? 4 / 5 : 16 / 10)
                      : ratios[active] ?? 16 / 10,
                  overflow: "hidden",
                  background: "transparent",
                  transition: "aspect-ratio 700ms cubic-bezier(0.22, 1, 0.36, 1)",
                  perspective: 1600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {(() => {
                  const activeFrame = frames[active];
                  const activeDevice = activeFrame ? frameDevice(activeFrame) : "desktop";
                  return frames.map((f, i) => {
                  const isActive = active === i;
                  const isPast = i < active;
                  const thisDevice = frameDevice(f);
                  // Cross-device: this inactive frame's device differs from the
                  // currently active one. Skip the clip-wipe and instead rotate
                  // 90° so it reads like the phone laying down into the desktop.
                  const isCross = !isActive && thisDevice !== activeDevice;
                  const clip = isCross || isActive
                    ? "inset(0 0% 0 0%)"
                    : isPast
                    ? "inset(0 100% 0 0)"
                    : "inset(0 0 0 100%)";
                  const rotateDeg = isCross
                    ? thisDevice === "mobile"
                      ? 90
                      : -90
                    : 0;
                  // Preview (homepage) drops the zoom + blur so it reads as a
                  // simple slide/wipe with shorter timing.
                  const scale = preview
                    ? 1
                    : isActive
                      ? 1
                      : isCross
                        ? 0.86
                        : 1.04;
                  const opacity = isCross ? 0 : 1;
                  const isCta = f.kind === "cta";
                  const transitionStr = preview
                    ? "clip-path 850ms cubic-bezier(0.76, 0, 0.24, 1), -webkit-clip-path 850ms cubic-bezier(0.76, 0, 0.24, 1), transform 850ms cubic-bezier(0.22, 1, 0.36, 1), opacity 700ms cubic-bezier(0.22, 1, 0.36, 1)"
                    : "clip-path 900ms cubic-bezier(0.76, 0, 0.24, 1) 200ms, -webkit-clip-path 900ms cubic-bezier(0.76, 0, 0.24, 1) 200ms, transform 1100ms cubic-bezier(0.22, 1, 0.36, 1) 200ms, opacity 700ms cubic-bezier(0.22, 1, 0.36, 1) 200ms, filter 700ms cubic-bezier(0.22, 1, 0.36, 1) 200ms";
                  return (
                    <div
                      key={i}
                      aria-hidden={!isActive}
                      style={{
                        position: "absolute",
                        inset: 0,
                        clipPath: clip,
                        WebkitClipPath: clip,
                        opacity,
                        transform: `scale(${scale}) rotate(${rotateDeg}deg)`,
                        transformOrigin: "center center",
                        filter: preview ? "none" : isActive ? "blur(0px)" : isCross ? "blur(0px)" : "blur(2px)",
                        transition: transitionStr,
                        willChange: preview ? "clip-path, transform, opacity" : "clip-path, transform, opacity, filter",
                        zIndex: isActive ? 2 : 1,
                      }}
                    >
                      {isCta && thisDevice === "mobile" ? (
                        // Mobile CTA: render inside a phone shell to match the
                        // image frames; the screen carries the mint card.
                        <div
                          style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            height: "92%",
                            aspectRatio: "9 / 19.5",
                            background: "var(--ink)",
                            borderRadius: "clamp(24px, 3vw, 38px)",
                            padding: "clamp(6px, 0.7vw, 10px)",
                            boxShadow:
                              "0 30px 60px -20px color-mix(in oklab, var(--ink) 38%, transparent), 0 0 0 1px color-mix(in oklab, var(--ink) 18%, transparent)",
                          }}
                        >
                          <Link
                            href={`/work/${caseData.slug}`}
                            data-cursor="view"
                            className="kagu-cta-card"
                            style={{
                              position: "relative",
                              display: "flex",
                              flexDirection: "column",
                              justifyContent: "space-between",
                              width: "100%",
                              height: "100%",
                              borderRadius: "clamp(18px, 2.4vw, 30px)",
                              overflow: "hidden",
                              background: CTA_BG[f.ctaBg ?? "mint-soft"],
                              color: CTA_FG[f.ctaBg ?? "mint-soft"],
                              padding:
                                "clamp(34px, 12%, 48px) clamp(16px, 7%, 26px) clamp(20px, 8%, 30px)",
                              textDecoration: "none",
                            }}
                          >
                            {/* Dot pattern */}
                            <span
                              aria-hidden
                              style={{
                                position: "absolute",
                                inset: 0,
                                backgroundImage: `radial-gradient(circle, color-mix(in oklab, ${CTA_FG[f.ctaBg ?? "mint-soft"]} 18%, transparent) 1px, transparent 1.5px)`,
                                backgroundSize: "20px 20px",
                                opacity: 0.5,
                                pointerEvents: "none",
                              }}
                            />
                            {/* Top label */}
                            <span
                              className="font-mono"
                              style={{
                                position: "relative",
                                fontSize: "clamp(9px, 1.6%, 11px)",
                                letterSpacing: "var(--tracking-eyebrow)",
                                textTransform: "uppercase",
                                opacity: 0.7,
                                zIndex: 1,
                              }}
                            >
                              {caseData.client}
                            </span>
                            {/* Center stack */}
                            <div
                              style={{
                                position: "relative",
                                zIndex: 1,
                                display: "flex",
                                flexDirection: "column",
                                gap: "clamp(10px, 4%, 18px)",
                              }}
                            >
                              <span
                                className="display"
                                style={{
                                  fontSize: "clamp(22px, 7vw, 40px)",
                                  lineHeight: 0.95,
                                  letterSpacing: "var(--tracking-tight)",
                                  color: "inherit",
                                }}
                              >
                                {f.ctaLabel ?? "View details"}
                              </span>
                              <span
                                aria-hidden
                                className="kagu-cta-arrow"
                                style={{ display: "inline-flex", alignItems: "center" }}
                              >
                                <span
                                  style={{
                                    display: "inline-block",
                                    width: "clamp(28px, 10%, 44px)",
                                    height: 2,
                                    background: "currentColor",
                                    transition: "width 420ms cubic-bezier(0.22,1,0.36,1)",
                                  }}
                                />
                                <svg width="22" height="22" viewBox="0 0 28 28" fill="none" style={{ marginLeft: -2 }}>
                                  <path d="M14 4 L24 14 L14 24 M24 14 L4 14" stroke="currentColor" strokeWidth="2" fill="none" />
                                </svg>
                              </span>
                            </div>
                            {/* Bottom label */}
                            <span
                              className="font-mono"
                              style={{
                                position: "relative",
                                fontSize: "clamp(9px, 1.6%, 11px)",
                                letterSpacing: "var(--tracking-eyebrow)",
                                textTransform: "uppercase",
                                opacity: 0.7,
                                zIndex: 1,
                                alignSelf: "flex-end",
                              }}
                            >
                              Open case →
                            </span>
                            <style>{`
                              .kagu-cta-card:hover .kagu-cta-arrow > span:first-child { width: 56px; }
                            `}</style>
                          </Link>
                          {/* Dynamic-island pill */}
                          <span
                            aria-hidden
                            style={{
                              position: "absolute",
                              top: 16,
                              left: "50%",
                              transform: "translateX(-50%)",
                              width: "32%",
                              height: 18,
                              borderRadius: 12,
                              background: "var(--ink)",
                              zIndex: 3,
                            }}
                          />
                        </div>
                      ) : isCta ? (
                        <Link
                          href={`/work/${caseData.slug}`}
                          data-cursor="view"
                          className="kagu-cta-card"
                          style={{
                            position: "absolute",
                            inset: 0,
                            background: CTA_BG[f.ctaBg ?? "mint-soft"],
                            color: CTA_FG[f.ctaBg ?? "mint-soft"],
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            padding: "clamp(24px, 4vw, 56px)",
                            textDecoration: "none",
                            overflow: "hidden",
                          }}
                        >
                          {/* Subtle plus-grid pattern for ambient life */}
                          <span
                            aria-hidden
                            style={{
                              position: "absolute",
                              inset: 0,
                              backgroundImage: `radial-gradient(circle, color-mix(in oklab, ${CTA_FG[f.ctaBg ?? "mint-soft"]} 18%, transparent) 1px, transparent 1.5px)`,
                              backgroundSize: "28px 28px",
                              opacity: 0.5,
                              pointerEvents: "none",
                            }}
                          />
                          {/* Top row: case label + sector */}
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "baseline",
                              position: "relative",
                              zIndex: 1,
                              flexWrap: "wrap",
                              gap: 8,
                            }}
                          >
                            <span
                              className="font-mono"
                              style={{
                                fontSize: "var(--type-xs)",
                                letterSpacing: "var(--tracking-eyebrow)",
                                textTransform: "uppercase",
                                opacity: 0.7,
                              }}
                            >
                              {caseData.client}
                            </span>
                            <span
                              className="font-mono"
                              style={{
                                fontSize: "var(--type-xs)",
                                letterSpacing: "var(--tracking-eyebrow)",
                                textTransform: "uppercase",
                                opacity: 0.7,
                              }}
                            >
                              {caseData.year} · {caseData.sector}
                            </span>
                          </div>
                          {/* Center: headline with arrow */}
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "clamp(16px, 3vw, 40px)",
                              position: "relative",
                              zIndex: 1,
                              flexWrap: "wrap",
                            }}
                          >
                            <span
                              className="display"
                              style={{
                                fontSize: "clamp(48px, 8vw, 128px)",
                                lineHeight: 0.95,
                                letterSpacing: "var(--tracking-tight)",
                                color: "inherit",
                              }}
                            >
                              {f.ctaLabel ?? "View details"}
                            </span>
                            <span
                              aria-hidden
                              className="kagu-cta-arrow"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 0,
                              }}
                            >
                              <span
                                style={{
                                  display: "inline-block",
                                  width: "clamp(48px, 8vw, 120px)",
                                  height: 2,
                                  background: "currentColor",
                                  transition: "width 420ms cubic-bezier(0.22,1,0.36,1)",
                                }}
                              />
                              <svg
                                width="28"
                                height="28"
                                viewBox="0 0 28 28"
                                fill="none"
                                style={{ marginLeft: -2 }}
                              >
                                <path
                                  d="M14 4 L24 14 L14 24 M24 14 L4 14"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  fill="none"
                                />
                              </svg>
                            </span>
                          </div>
                          {/* Bottom: URL + small hint */}
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "baseline",
                              position: "relative",
                              zIndex: 1,
                              flexWrap: "wrap",
                              gap: 8,
                            }}
                          >
                            <span
                              className="font-mono"
                              style={{
                                fontSize: "var(--type-xs)",
                                letterSpacing: "var(--tracking-eyebrow)",
                                textTransform: "uppercase",
                                opacity: 0.7,
                              }}
                            >
                              {stripUrl(caseData.url)}
                            </span>
                            <span
                              className="font-mono"
                              style={{
                                fontSize: "var(--type-xs)",
                                letterSpacing: "var(--tracking-eyebrow)",
                                textTransform: "uppercase",
                                opacity: 0.7,
                              }}
                            >
                              Open case →
                            </span>
                          </div>
                          <style>{`
                            .kagu-cta-card:hover .kagu-cta-arrow > span:first-child { width: clamp(72px, 12vw, 180px); }
                          `}</style>
                        </Link>
                      ) : thisDevice === "mobile" ? (
                        f.image && (
                          <div
                            style={{
                              position: "absolute",
                              top: "50%",
                              left: "50%",
                              transform: "translate(-50%, -50%)",
                              height: isMobile ? "94%" : "calc(92% + 20px)",
                              aspectRatio: "9 / 19.5",
                              background: "var(--ink)",
                              borderRadius: "clamp(24px, 3vw, 38px)",
                              padding: "clamp(6px, 0.7vw, 10px)",
                              boxShadow:
                                "0 30px 60px -20px color-mix(in oklab, var(--ink) 38%, transparent), 0 0 0 1px color-mix(in oklab, var(--ink) 18%, transparent)",
                            }}
                          >
                            {/* Phone screen */}
                            <div
                              style={{
                                position: "relative",
                                width: "100%",
                                height: "100%",
                                borderRadius: "clamp(18px, 2.4vw, 30px)",
                                overflow: "hidden",
                                background: "#6b6b6b",
                              }}
                            >
                              {/* Image is inset from the top so the screenshot's
                                  own header isn't tucked behind the dynamic island. */}
                              <div
                                style={{
                                  position: "absolute",
                                  top: 31,
                                  left: 0,
                                  right: 0,
                                  bottom: 0,
                                }}
                              >
                                <Image
                                  src={f.image}
                                  alt={f.title}
                                  fill
                                  sizes="(max-width: 768px) 60vw, 280px"
                                  priority={i === 0}
                                  style={{
                                    objectFit: "cover",
                                    objectPosition: "top center",
                                  }}
                                />
                              </div>
                              {/* Dynamic-island style pill at the top */}
                              <span
                                aria-hidden
                                style={{
                                  position: "absolute",
                                  top: 8,
                                  left: "50%",
                                  transform: "translateX(-50%)",
                                  width: "32%",
                                  height: 18,
                                  borderRadius: 12,
                                  background: "var(--ink)",
                                  zIndex: 2,
                                }}
                              />
                            </div>
                          </div>
                        )
                      ) : (
                        f.image && (
                          // Desktop image fills the stage — stage aspect already
                          // matches the image's natural ratio, so the border
                          // sits right at the image edge with no extra padding.
                          <div
                            style={{
                              position: "absolute",
                              inset: 0,
                              border: "1px solid var(--neutral)",
                              borderRadius: 6,
                              overflow: "hidden",
                              background: "var(--paper)",
                            }}
                          >
                            <Image
                              src={f.image}
                              alt={f.title}
                              fill
                              sizes="(max-width: 768px) 100vw, 66vw"
                              priority={i === 0}
                              onLoadingComplete={(img) => {
                                if (img.naturalWidth && img.naturalHeight) {
                                  setRatios((r) =>
                                    r[i] ? r : { ...r, [i]: img.naturalWidth / img.naturalHeight },
                                  );
                                }
                              }}
                              style={{
                                objectFit: "contain",
                                objectPosition: "center",
                              }}
                            />
                          </div>
                        )
                      )}
                    </div>
                  );
                });
                })()}
              </div>
            </div>

            {/* Copy column — text slides off vertically (slot-roll feel)
                so the next image arrives just as the previous copy exits. */}
            <div
              className={`${tokens.copyCol} relative`}
              style={{
                overflow: "hidden",
                height: copyHeight,
                transition: "height 600ms cubic-bezier(0.22, 1, 0.36, 1)",
              }}
            >
              {frames.map((f, i) => {
                const isActive = active === i;
                const isPast = i < active;
                // Outgoing scrolls UP off the top; future copy waits BELOW.
                const y = isActive ? "0%" : isPast ? "-110%" : "110%";
                return (
                <div
                  key={i}
                  ref={(el) => {
                    copyFrameRefs.current[i] = el;
                  }}
                  aria-hidden={!isActive}
                  style={{
                    position: i === 0 ? "relative" : "absolute",
                    inset: i === 0 ? undefined : 0,
                    transform: `translate3d(0, ${y}, 0)`,
                    opacity: isActive ? 1 : 0,
                    transition:
                      "transform 720ms cubic-bezier(0.76, 0, 0.24, 1), opacity 420ms cubic-bezier(0.22, 1, 0.36, 1)",
                    willChange: "transform, opacity",
                    pointerEvents: isActive ? "auto" : "none",
                  }}
                >
                  <span
                    className="font-mono block"
                    style={{
                      fontSize: tokens.counterSize,
                      letterSpacing: "var(--tracking-eyebrow)",
                      textTransform: "uppercase",
                      color: "var(--slate-ink)",
                      marginBottom: "var(--space-3)",
                    }}
                  >
                    {preview ? "View details" : f.isCover ? "Overview" : `Feature ${String(i).padStart(2, "0")}`}
                  </span>
                  <h4
                    className="display"
                    style={{
                      fontSize: tokens.titleSize,
                      lineHeight: 1.05,
                      marginBottom: "var(--space-4)",
                    }}
                  >
                    {f.title}
                  </h4>
                  <p
                    style={{
                      fontSize: tokens.descSize,
                      lineHeight: 1.6,
                      color: "var(--ink)",
                    }}
                  >
                    {f.description}
                  </p>
                </div>
                );
              })}
            </div>
          </div>

          {/* Bottom progress + CTA. In preview mode the dashes are hidden
              and we only render the View details link, right-aligned. */}
          <div
            className="flex items-center justify-between"
            style={{ marginTop: "var(--space-8)" }}
          >
            {!preview ? (
              <div className="flex gap-2" aria-hidden>
                {frames.map((_, i) => (
                  <span
                    key={i}
                    style={{
                      width: active === i ? 28 : 12,
                      height: 2,
                      background:
                        active === i ? "var(--ink)" : "color-mix(in oklab, var(--ink) 25%, transparent)",
                      transition: "width 320ms cubic-bezier(0.22, 1, 0.36, 1), background 320ms",
                      display: "inline-block",
                    }}
                  />
                ))}
              </div>
            ) : (
              <span />
            )}
            {!isLarge && !preview && (
              <Link
                href={`/work/${caseData.slug}`}
                data-cursor="view"
                className="font-mono inline-flex items-center gap-3"
                style={{
                  fontSize: "var(--type-xs)",
                  letterSpacing: "var(--tracking-eyebrow)",
                  textTransform: "uppercase",
                  color: "var(--ink)",
                  borderBottom: "1px solid var(--mint-deep)",
                  paddingBottom: 6,
                }}
              >
                Read case
                <span aria-hidden style={{ width: 28, height: 1, background: "var(--mint-deep)" }} />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
