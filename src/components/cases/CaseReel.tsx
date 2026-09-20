"use client";

/*
  CaseReel — pinned, scroll-paced feature reel for a case study.
  The stage pins; screenshots cross-fade through the case's features
  while the copy column swaps title + description in sync.

  Frame 0 is the optional thumbnail (used as the establishing shot
  with the case lede). Frames 1..N are the features.

  Pin/scrub via CSS `position: sticky` + Framer Motion useScroll: a tall
  container provides the scroll travel, the stage sticks to the top, and
  scrollYProgress drives the active frame index.
*/

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useScroll, useMotionValueEvent, useReducedMotion } from "motion/react";
import type { Case } from "@/lib/content";
import { ArrowGlyph } from "@/components/ui/ArrowGlyph";

interface CaseReelProps {
  caseData: Case;
  index: number;
  /** "large" gives a centerpiece treatment for case-study pages. */
  size?: "default" | "large";
  /** Preview mode: a single pinned frame with the thumbnail + lede + "View details" CTA.
   *  Used on the homepage so visitors get the pin/scroll feel without seeing the full feature reel. */
  preview?: boolean;
  /** Preload the first frame's image (next/image priority). Only for reels
   *  that sit above the fold — on the case page the reel IS the hero, but on
   *  the homepage the strip is ~4000px down and each preload would compete
   *  with the hero's fonts/CSS on the critical path (measured +1s LCP). */
  eager?: boolean;
}

type Frame = {
  image?: string;
  title: string;
  description: string;
  /** Alt text describing the screenshot. Falls back to `title`. */
  alt?: string;
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

// CTA-card type, sized against the card's own box (see the Link below). Each
// value takes the smaller of a width- and a height-share, so a short, wide card
// (phone: ~335x210) shrinks the type instead of clipping it while a full-width
// desktop card still lands on the old 128px headline.
const CTA_LABEL_SIZE = "clamp(22px, min(9cqw, 15cqh), 128px)";
const CTA_META_SIZE = "clamp(11px, min(2.2cqw, 3.6cqh), 14px)";
const CTA_ARROW_SIZE = "clamp(16px, min(5cqw, 8cqh), 28px)";

const CTA_FG: Record<NonNullable<Frame["ctaBg"]>, string> = {
  "mint-pale": "var(--slate-ink)",
  "mint-soft": "var(--slate-ink)",
  "mint-deep": "var(--ink)",
  "slate-ink": "var(--mint-pale)",
  paper: "var(--slate-ink)",
};

export function CaseReel({
  caseData,
  index,
  size = "default",
  preview = false,
  eager = false,
}: CaseReelProps) {
  const isLarge = size === "large";
  // The reel carries the case title, so on a case-study page (size="large")
  // it owns the page's <h1> — that page renders no other one. In the homepage
  // strip the reel sits under the section's <h2>, so it stays an <h3> there;
  // promoting it would give the homepage five competing <h1>s.
  const ClientHeading = isLarge ? "h1" : "h3";
  // Alternate sides per index in the homepage strip (even = image left,
  // odd = image right). Case-page reel ignores this (single component).
  const reversed = !isLarge && index % 2 === 1;
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const copyFrameRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const [ratios, setRatios] = useState<Record<number, number>>({});
  const [copyHeight, setCopyHeight] = useState<number | undefined>(undefined);
  const [isMobile, setIsMobile] = useState(false);
  const reduced = useReducedMotion();
  // Timestamp until which active-frame updates are suppressed. Set whenever the
  // mobile browser chrome slides (a height-only viewport resize): that re-maps
  // scrollYProgress against a new viewport and would otherwise flip the frame
  // mid-collapse, reading as a stutter. See the resize effect below.
  const suppressFrameUntilRef = useRef(0);

  // The case-page reel pins (locks scroll) while the stage stacks into a
  // single column on mobile: image on top, copy below. At desktop type sizes
  // the copy falls below the fold while pinned, so dial the large-reel type
  // down on phones so title + description stay on screen.
  const tokens = {
    clientSize: isLarge ? (isMobile ? "var(--type-3xl)" : "var(--type-6xl)") : "var(--type-4xl)",
    titleSize: isLarge ? (isMobile ? "var(--type-2xl)" : "var(--type-4xl)") : "var(--type-3xl)",
    descSize: isLarge ? (isMobile ? "var(--type-base)" : "var(--type-lg)") : "var(--type-md)",
    counterSize: isLarge ? "var(--type-sm)" : "var(--type-xs)",
    imageCol: `md:col-span-8 ${reversed ? "md:col-start-5 md:row-start-1" : ""}`,
    copyCol: `md:col-span-4 ${reversed ? "md:col-start-1 md:row-start-1" : ""}`,
  };

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const handler = () => setIsMobile(mq.matches);
    handler();
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // The mobile browser's address/tool bar shows & hides on scroll, which fires
  // a resize that only changes the viewport HEIGHT. That alone re-maps the
  // scroll progress and flips the active frame, so the cross-fade stutters
  // while the bar animates. Detect a height-only resize (width unchanged) and
  // freeze frame updates for the length of the bar animation. A real orientation
  // change moves the width too, so it falls through and re-syncs normally.
  useEffect(() => {
    let lastW = window.innerWidth;
    const onResize = () => {
      const w = window.innerWidth;
      if (w === lastW) suppressFrameUntilRef.current = performance.now() + 450;
      lastW = w;
    };
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
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
            alt: caseData.thumbnailAlt,
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
                alt: caseData.thumbnailAlt,
                isCover: true,
                kind: "image",
              } as Frame,
            ]
          : []),
        ...features.map<Frame>((f) => ({
          image: f.image,
          title: f.title,
          description: f.description,
          alt: f.alt,
          kind: "image",
          device: f.device,
        })),
      ];

  const total = frames.length;
  // Shorter hold in preview (homepage) so the section doesn't dominate the page.
  // Mobile case-page reels also get a shorter hold — pinning for 5+ viewports
  // is exhausting at phone scale.
  const HOLD_PER_FRAME = preview ? 0.25 : isMobile ? 0.55 : 1;

  // Drive the active frame from scroll progress over the container.
  //   - preview (homepage): no pin. offset ["start 0.75","end 0.5"] ≈ the old
  //     ScrollTrigger start "top 25%" / end "bottom center".
  //   - full reel: the stage sticks (CSS) inside a tall container; offset
  //     ["start start","end end"] ≈ the old pin start "top top" + scrub travel.
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: preview ? ["start 0.75", "end 0.5"] : ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    if (reduced || total === 0) return;
    // Ignore the scroll-progress jump caused by the browser chrome sliding.
    if (performance.now() < suppressFrameUntilRef.current) return;
    const idx = Math.min(total - 1, Math.max(0, Math.floor(p * total)));
    setActive((curr) => (curr === idx ? curr : idx));
  });

  if (total === 0) return null;

  const counter = `${String(active + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;

  // Aspect of the frame stage (the box every cross-fading layer fills).
  //   - mobile frames: a portrait-ish box so the phone has room.
  //   - desktop image frames: the screenshot's natural ratio.
  //   - the CTA ("View details") has no image of its own, so it inherits the
  //     nearest preceding screenshot ratio (the cover). That keeps it the SAME
  //     height as the frame it replaces instead of snapping to a short default
  //     and cramping the card.
  const stageAspect = (() => {
    const f = frames[active];
    if (!f) return 16 / 10;
    if (frameDevice(f) === "mobile") return isMobile ? 4 / 5 : 16 / 10;
    if (ratios[active]) return ratios[active];
    // CTA / not-yet-loaded: inherit the nearest preceding screenshot ratio, but
    // never let the card go wider/shorter than 16/10 (smaller number = taller),
    // so the "View details" card always keeps at least full height.
    for (let i = active - 1; i >= 0; i--) {
      if (ratios[i]) return Math.min(ratios[i], 16 / 10);
    }
    return 16 / 10;
  })();

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        // Full reels need explicit scroll travel now that GSAP pinSpacing is
        // gone: the sticky stage occupies 1 viewport (+1) and each frame holds
        // for HOLD_PER_FRAME viewports. Preview doesn't pin, so it sizes to its
        // content.
        height: preview ? undefined : `${(HOLD_PER_FRAME * total + 1) * 100}vh`,
      }}
      aria-label={`${caseData.client} feature reel`}
    >
      <div
        ref={stageRef}
        style={{
          // Floor at a viewport, then GROW: the stage is at least 100svh (so
          // the frame fills the screen normally) but height:auto lets it get
          // taller on short screens — heading + frame + copy + progress all
          // fit and the page scrolls instead of crushing the frame to nothing.
          // Preview (homepage) stays content-sized on desktop (no pin).
          height: preview && !isMobile ? "auto" : undefined,
          minHeight: preview && !isMobile ? 0 : "100svh",
          display: "flex",
          flexDirection: "column",
          background: "var(--paper)",
          position: preview ? "relative" : "sticky",
          top: preview ? undefined : 0,
          zIndex: 1,
          isolation: "isolate",
          paddingTop: "clamp(76px, 9vh, 91px)",
          paddingBottom: isMobile ? "var(--space-6)" : "var(--space-12)",
        }}
        className="px-(--container-x)"
      >
        <div className="w-full max-w-(--container-max) mx-auto flex-1 min-h-0 flex flex-col">
          {/* Top meta row */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-baseline">
            <div className="md:col-span-6">
              {/* Eyebrow (index · sector · year) shows on the homepage strip
                  only; the details-page scroll-lock locks the title alone. */}
              {!isLarge && (
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
              )}
              <ClientHeading
                className="display"
                style={{
                  fontSize: tokens.clientSize,
                  lineHeight: 1,
                  marginTop: isLarge ? 0 : "var(--space-2)",
                  // Lock the title to a single line on the desktop details reel.
                  whiteSpace: isLarge && !isMobile ? "nowrap" : undefined,
                }}
              >
                {caseData.client}
              </ClientHeading>
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
            className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 items-center flex-1"
            style={{
              marginTop: isMobile ? "var(--space-4)" : "var(--space-8)",
              minHeight: 0,
              // Mobile: image row flexes/shrinks, copy row keeps its natural
              // height so it always stays on screen while the stage is pinned.
              ...(isMobile ? { gridTemplateRows: "minmax(0, 1fr) auto" } : {}),
            }}
          >
            {/* Screenshot stack */}
            <div
              className={tokens.imageCol}
              style={{
                width: "100%",
                ...(isMobile
                  ? {
                      height: "100%",
                      minHeight: 0,
                      alignSelf: "stretch",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                    }
                  : {}),
              }}
            >
              {/* Shared browser chrome — sits ABOVE the stage so the stage's
                  aspect-ratio = image's natural ratio with no extra height
                  budget eaten by the chrome. Collapses when the active frame
                  is mobile, so phone frames don't have a stray URL bar. */}
              {(() => {
                const activeFrame = frames[active];
                const activeDevice = activeFrame ? frameDevice(activeFrame) : "desktop";
                const showChrome = activeDevice === "desktop";
                return (
                  // Query container = full frame width. The chrome is sized in
                  // cqw so the dots, URL pill and padding scale with the desktop
                  // frame instead of sitting at a fixed px size on small screens.
                  <div style={{ containerType: "inline-size" }}>
                  <div
                    aria-hidden={!showChrome}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1.5cqw",
                      padding: showChrome ? "1.25cqw 1.75cqw" : "0 1.75cqw",
                      maxHeight: showChrome ? 60 : 0,
                      opacity: showChrome ? 1 : 0,
                      overflow: "hidden",
                      transition:
                        "max-height 500ms cubic-bezier(0.22, 1, 0.36, 1), opacity 320ms cubic-bezier(0.22, 1, 0.36, 1), padding 500ms cubic-bezier(0.22, 1, 0.36, 1)",
                    }}
                  >
                    <div style={{ display: "flex", gap: "0.75cqw" }}>
                      {[0, 1, 2].map((d) => (
                        <span
                          key={d}
                          style={{
                            width: "1cqw",
                            height: "1cqw",
                            borderRadius: "0.5cqw",
                            background: "color-mix(in oklab, var(--slate-ink) 32%, transparent)",
                            display: "inline-block",
                          }}
                        />
                      ))}
                    </div>
                    <div
                      style={{
                        flex: 1,
                        padding: "0.5cqw 1.25cqw",
                        borderRadius: "0.5cqw",
                        background: "color-mix(in oklab, var(--slate-ink) 10%, transparent)",
                        fontFamily: "var(--font-mono)",
                        fontSize: "max(0.75rem, 1.4cqw)",
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
                  aspectRatio: stageAspect,
                  // On mobile, ONLY phone frames flex-shrink the row (the tall
                  // mockup is height-driven and must scale down to fit). Desktop
                  // frames keep their aspect-ratio height so the landscape
                  // screenshot fills the frame instead of letterboxing into a
                  // too-tall, flex-stretched box.
                  ...(isMobile &&
                  frames[active] &&
                  frameDevice(frames[active]) === "mobile"
                    ? {
                        // Grow to fill, but never shrink below a legible floor —
                        // when space is tight the stage grows (height:auto) to
                        // absorb this instead of the phone collapsing.
                        flex: "1 1 0",
                        minHeight: "clamp(300px, 52svh, 480px)",
                        maxHeight: "100%",
                      }
                    : {}),
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
                        // image frames; the screen carries the mint card. Sizing
                        // wrapper is the query container so the shell scales as
                        // one unit (everything authored in cqw).
                        <div
                          style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            height: "92%",
                            aspectRatio: "9 / 19.5",
                            containerType: "size",
                          }}
                        >
                        <div
                          style={{
                            position: "relative",
                            width: "100%",
                            height: "100%",
                            boxSizing: "border-box",
                            // Fixed near-black phone bezel — not theme-tokened.
                            background: "#0e0f13",
                            borderRadius: "11cqw",
                            padding: "2.6cqw",
                            boxShadow:
                              "0 30px 60px -20px rgba(0,0,0,0.55), 0 0 0 1px color-mix(in oklab, var(--ink) 14%, transparent)",
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
                              borderRadius: "9cqw",
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
                                fontSize: "12px",
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
                                  // cqw = 1% of the phone shell, not the
                                  // viewport: 7vw overshot the ~150px screen on
                                  // a large phone and the label clipped.
                                  fontSize: "clamp(14px, 19cqw, 40px)",
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
                                <svg
                                  viewBox="0 0 28 28"
                                  fill="none"
                                  style={{
                                    marginLeft: -2,
                                    flexShrink: 0,
                                    width: "min(9cqw, 22px)",
                                    height: "min(9cqw, 22px)",
                                  }}
                                >
                                  <path d="M14 4 L24 14 L14 24 M24 14 L4 14" stroke="currentColor" strokeWidth="2" fill="none" />
                                </svg>
                              </span>
                            </div>
                            {/* Bottom label */}
                            <span
                              className="font-mono"
                              style={{
                                position: "relative",
                                fontSize: "12px",
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
                              top: "5cqw",
                              left: "50%",
                              transform: "translateX(-50%)",
                              width: "26%",
                              height: "7.5cqw",
                              borderRadius: "4cqw",
                              background: "#0e0f13",
                              zIndex: 3,
                            }}
                          />
                        </div>
                        </div>
                      ) : isCta ? (
                        // Everything inside is sized against the CARD, not the
                        // viewport: at phone width the stage is only ~210px tall,
                        // and viewport-based type (8vw headline + a 28px arrow +
                        // two meta rows) overran that and was eaten by
                        // overflow:hidden, so the arrow and the URL row simply
                        // vanished. container-type:size exposes the card box as
                        // cqw/cqh, and every size below is min(width-share,
                        // height-share) so content can never outgrow the card in
                        // either axis.
                        <Link
                          href={`/work/${caseData.slug}`}
                          data-cursor="view"
                          className="kagu-cta-card"
                          style={{
                            position: "absolute",
                            inset: 0,
                            containerType: "size",
                            background: CTA_BG[f.ctaBg ?? "mint-soft"],
                            color: CTA_FG[f.ctaBg ?? "mint-soft"],
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            gap: "min(2cqw, 3cqh)",
                            padding: "clamp(14px, min(4cqw, 6.5cqh), 56px)",
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
                              flexShrink: 0,
                              gap: "min(1.5cqw, 8px)",
                            }}
                          >
                            <span
                              className="font-mono"
                              style={{
                                fontSize: CTA_META_SIZE,
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
                                fontSize: CTA_META_SIZE,
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
                              gap: "clamp(10px, min(3cqw, 5cqh), 40px)",
                              position: "relative",
                              zIndex: 1,
                              flexWrap: "wrap",
                              minHeight: 0,
                            }}
                          >
                            <span
                              className="display"
                              style={{
                                fontSize: CTA_LABEL_SIZE,
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
                                  width: "clamp(28px, min(8cqw, 13cqh), 120px)",
                                  height: 2,
                                  background: "currentColor",
                                  transition: "width 420ms cubic-bezier(0.22,1,0.36,1)",
                                }}
                              />
                              <svg
                                viewBox="0 0 28 28"
                                fill="none"
                                style={{
                                  marginLeft: -2,
                                  flexShrink: 0,
                                  width: CTA_ARROW_SIZE,
                                  height: CTA_ARROW_SIZE,
                                }}
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
                              flexShrink: 0,
                              gap: "min(1.5cqw, 8px)",
                            }}
                          >
                            <span
                              className="font-mono"
                              style={{
                                fontSize: CTA_META_SIZE,
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
                                fontSize: CTA_META_SIZE,
                                letterSpacing: "var(--tracking-eyebrow)",
                                textTransform: "uppercase",
                                opacity: 0.7,
                              }}
                            >
                              Open case →
                            </span>
                          </div>
                          <style>{`
                            .kagu-cta-card:hover .kagu-cta-arrow > span:first-child { width: clamp(40px, min(12cqw, 19cqh), 180px); }
                          `}</style>
                        </Link>
                      ) : thisDevice === "mobile" ? (
                        f.image && (
                          // Sizing wrapper = the query container. The phone is
                          // authored entirely in cqw (1cqw = 1% of the phone's
                          // own width) so the bezel, radii, island and image
                          // inset all scale as ONE unit — only the container
                          // resizes, the internal ratios never change.
                          <div
                            style={{
                              position: "absolute",
                              top: "50%",
                              left: "50%",
                              transform: "translate(-50%, -50%)",
                              height: isMobile ? "94%" : "calc(92% + 20px)",
                              aspectRatio: "9 / 19.5",
                              containerType: "size",
                            }}
                          >
                            <div
                              style={{
                                width: "100%",
                                height: "100%",
                                boxSizing: "border-box",
                                // Phone body stays a fixed near-black bezel — not a
                                // theme token, so it never inverts with the palette.
                                background: "#0e0f13",
                                borderRadius: "11cqw",
                                padding: "2.6cqw",
                                boxShadow:
                                  "0 30px 60px -20px rgba(0,0,0,0.55), 0 0 0 1px color-mix(in oklab, var(--ink) 14%, transparent)",
                              }}
                            >
                            {/* Phone screen */}
                            <div
                              style={{
                                position: "relative",
                                width: "100%",
                                height: "100%",
                                borderRadius: "9cqw",
                                overflow: "hidden",
                                background: "var(--mint-pale)",
                              }}
                            >
                              {/* Image is inset from the top so the screenshot's
                                  own header isn't tucked behind the dynamic island. */}
                              <div
                                style={{
                                  position: "absolute",
                                  top: "10cqw",
                                  left: 0,
                                  right: 0,
                                  bottom: 0,
                                }}
                              >
                                <Image
                                  src={f.image}
                                  alt={f.alt ?? f.title}
                                  fill
                                  sizes="(max-width: 768px) 45vw, 280px"
                                  priority={eager && i === 0}
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
                                  top: "2.6cqw",
                                  left: "50%",
                                  transform: "translateX(-50%)",
                                  width: "26%",
                                  height: "7.5cqw",
                                  borderRadius: "4cqw",
                                  background: "#0e0f13",
                                  zIndex: 2,
                                }}
                              />
                            </div>
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
                              alt={f.alt ?? f.title}
                              fill
                              sizes="(max-width: 768px) 100vw, 66vw"
                              priority={eager && i === 0}
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
                    {/* Number features from 01. `i` is the frame index, and the
                        cover frame only occupies index 0 when the case has a
                        thumbnail — without one the first feature sat at i=0 and
                        read "Feature 00". Count from the first feature instead. */}
                    {preview
                      ? "View details"
                      : f.isCover
                        ? "Overview"
                        : `Feature ${String(caseData.thumbnail ? i : i + 1).padStart(2, "0")}`}
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
            style={{ marginTop: isMobile ? "var(--space-4)" : "var(--space-8)" }}
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
                  color: "var(--mint-text)",
                  borderBottom: "1px solid var(--mint-text)",
                  paddingBottom: 6,
                }}
              >
                Read case
                <ArrowGlyph length={28} />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
