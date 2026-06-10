"use client";

/*
  Live browser-frame preview for the package builder. Pure CSS/JSX skeleton —
  the chrome idiom (window dots + URL pill) follows CaseCover.tsx, but the
  body is a live wireframe that reacts to every selection:

  - zone-gradient features repaint their zone (navbar/hero/footer) with an
    animated gradient; stubs inside lighten via the --spv-stub custom prop.
  - nav-icon features pop icons into the preview navbar's right slot.
  - chat-bubble mounts a sticky mint circle bottom-right of the viewport.
  - section features append wireframe sections (blog/booking/analytics).
  - chrome-badge renders a chip next to the URL pill; cms-outline dashes the
    editable blocks; ambient-motion floats the content gently.
*/

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import {
  featuresForType,
  getWebsiteType,
  type PreviewZone,
  type WebsiteTypeId,
} from "./catalog";
import {
  AnalyticsSection,
  BlogSection,
  BookingSection,
  ChatGlyph,
  NavGlyph,
  Stub,
  TypeBody,
} from "./previewSections";

const CHROME_FG = "var(--slate-ink)";

/** One zone of the preview page. Gradient state swaps fill + stub color. */
function Zone({
  gradient,
  reduced,
  style,
  children,
}: {
  gradient: boolean;
  reduced: boolean;
  style?: React.CSSProperties;
  children: ReactNode;
}) {
  return (
    <div
      className={gradient && !reduced ? "spv-gradient" : undefined}
      style={{
        position: "relative",
        transition: "background 480ms var(--ease-out-quint)",
        background: gradient
          ? reduced
            ? "linear-gradient(120deg, #1f8fe0, #7c5cff, #2dd4bf)"
            : undefined
          : undefined,
        // Stubs inside gradient zones lighten to read on the color.
        ["--spv-stub" as string]: gradient
          ? "rgba(238, 241, 245, 0.55)"
          : "color-mix(in oklab, var(--slate-ink) 26%, transparent)",
        ...style,
      }}
    >
      {gradient ? (
        <span
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background: "color-mix(in oklab, var(--paper) 30%, transparent)",
            pointerEvents: "none",
          }}
        />
      ) : null}
      <div style={{ position: "relative" }}>{children}</div>
    </div>
  );
}

const popIn = {
  initial: { opacity: 0, scale: 0.5 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.5 },
  transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
};

const sectionIn = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: "auto" },
  exit: { opacity: 0, height: 0 },
  transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] as const },
};

export function BuilderPreview({
  typeId,
  selected,
}: {
  typeId: WebsiteTypeId;
  selected: ReadonlySet<string>;
}) {
  const reduced = useReducedMotion() ?? false;
  const type = getWebsiteType(typeId);
  const active = featuresForType(typeId).filter((f) => selected.has(f.id));

  const gradients = new Set<PreviewZone>();
  const navIcons: string[] = [];
  const badges: string[] = [];
  const sections = new Set<string>();
  let chat = false;
  let cms = false;
  let ambient = false;

  for (const f of active) {
    const e = f.effect;
    if (e.kind === "zone-gradient") gradients.add(e.zone);
    else if (e.kind === "nav-icon") navIcons.push(e.icon);
    else if (e.kind === "chat-bubble") chat = true;
    else if (e.kind === "section") sections.add(e.section);
    else if (e.kind === "chrome-badge") badges.push(e.label);
    else if (e.kind === "cms-outline") cms = true;
    else if (e.kind === "ambient-motion") ambient = true;
  }
  if (typeId === "ecommerce") navIcons.push("cart"); // store always has a cart

  return (
    <div
      className={[
        "spv-frame",
        cms ? "spv-cms" : "",
        ambient && !reduced ? "spv-ambient" : "",
      ].join(" ")}
      style={{
        border: "1px solid var(--neutral)",
        borderRadius: 8,
        background: "var(--mint-pale)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
      aria-label="Live preview of your package"
    >
      {/* Browser chrome */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "12px 16px",
          borderBottom: `1px solid color-mix(in oklab, ${CHROME_FG} 24%, transparent)`,
        }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                background: `color-mix(in oklab, ${CHROME_FG} 35%, transparent)`,
                display: "inline-block",
              }}
            />
          ))}
        </div>
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            minWidth: 0,
          }}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={typeId}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25 }}
              style={{
                padding: "5px 14px",
                borderRadius: 4,
                background: `color-mix(in oklab, ${CHROME_FG} 12%, transparent)`,
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                letterSpacing: "0.04em",
                color: CHROME_FG,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {type?.previewUrl}
            </motion.span>
          </AnimatePresence>
          <AnimatePresence>
            {badges.map((label) => (
              <motion.span
                key={label}
                {...popIn}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "3px 8px",
                  borderRadius: 999,
                  border: "1px solid var(--mint-deep)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  color: "var(--mint-deep)",
                  whiteSpace: "nowrap",
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 3,
                    background: "var(--mint-deep)",
                  }}
                />
                {label}
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Page viewport */}
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          ["--spv-stub" as string]:
            "color-mix(in oklab, var(--slate-ink) 26%, transparent)",
        }}
      >
        {/* Navbar zone */}
        <Zone
          gradient={gradients.has("navbar")}
          reduced={reduced}
          style={{
            borderBottom: "1px solid color-mix(in oklab, var(--neutral) 70%, transparent)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "11px 16px",
            }}
          >
            <Stub w={20} h={20} r={5} style={{ background: "color-mix(in oklab, var(--mint-deep) 75%, transparent)" }} />
            <div style={{ display: "flex", gap: 10 }}>
              <Stub w={30} h={5} />
              <Stub w={24} h={5} />
              <Stub w={34} h={5} />
            </div>
            {/* Feature icon slot */}
            <div
              style={{
                marginLeft: "auto",
                display: "flex",
                alignItems: "center",
                gap: 9,
                color: gradients.has("navbar") ? "var(--ink)" : "var(--slate-ink)",
              }}
            >
              <AnimatePresence>
                {navIcons.map((icon) => (
                  <motion.span
                    key={icon}
                    {...popIn}
                    style={{ display: "inline-flex", alignItems: "center" }}
                    title={icon}
                  >
                    <NavGlyph icon={icon} />
                  </motion.span>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </Zone>

        {/* Hero zone */}
        <Zone gradient={gradients.has("hero")} reduced={reduced}>
          <div
            className="spv-cms-target spv-floaty"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 9,
              padding: "26px 16px 24px",
            }}
          >
            <Stub w="58%" h={13} />
            <Stub w="40%" h={13} />
            <Stub w="64%" h={6} style={{ marginTop: 3 }} />
            <Stub
              w={74}
              h={20}
              r={3}
              style={{
                marginTop: 8,
                background: gradients.has("hero")
                  ? "rgba(238, 241, 245, 0.9)"
                  : "color-mix(in oklab, var(--mint-deep) 80%, transparent)",
              }}
            />
          </div>
        </Zone>

        {/* Per-type content + conditional sections */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "14px 16px" }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={typeId}
              className="spv-floaty"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <TypeBody typeId={typeId} />
            </motion.div>
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {sections.has("blog") && (
              <motion.div key="blog" {...sectionIn} style={{ overflow: "hidden" }}>
                <BlogSection />
              </motion.div>
            )}
            {sections.has("booking") && (
              <motion.div key="booking" {...sectionIn} style={{ overflow: "hidden" }}>
                <BookingSection />
              </motion.div>
            )}
            {sections.has("analytics") && (
              <motion.div key="analytics" {...sectionIn} style={{ overflow: "hidden" }}>
                <AnalyticsSection />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer zone */}
        <Zone
          gradient={gradients.has("footer")}
          reduced={reduced}
          style={{
            borderTop: "1px solid color-mix(in oklab, var(--neutral) 70%, transparent)",
            marginTop: "auto",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 14,
              padding: "16px 16px 20px",
            }}
          >
            {[0, 1, 2].map((col) => (
              <div key={col} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Stub w="42%" h={6} />
                <Stub w="64%" h={4} />
                <Stub w="52%" h={4} />
              </div>
            ))}
          </div>
        </Zone>

        {/* Chatbot bubble — sticky bottom-right of the viewport */}
        <AnimatePresence>
          {chat && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0 }}
              transition={
                reduced
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 380, damping: 22 }
              }
              className={reduced ? undefined : "spv-pulse"}
              style={{
                position: "absolute",
                right: 14,
                bottom: 14,
                width: 40,
                height: 40,
                borderRadius: 999,
                background: "var(--mint-deep)",
                color: "var(--ink)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 6px 18px -6px color-mix(in oklab, var(--mint-deep) 70%, transparent)",
              }}
            >
              <ChatGlyph />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        .spv-gradient {
          background: linear-gradient(120deg, #1f8fe0, #7c5cff, #2dd4bf, #1f8fe0);
          background-size: 300% 300%;
          animation: spv-gradient-pan 9s linear infinite;
        }
        @keyframes spv-gradient-pan {
          0% { background-position: 0% 50%; }
          100% { background-position: 300% 50%; }
        }
        .spv-cms .spv-cms-target {
          outline: 1px dashed var(--mint-deep);
          outline-offset: 3px;
          border-radius: 4px;
        }
        .spv-ambient .spv-floaty {
          animation: spv-float 5s ease-in-out infinite;
        }
        @keyframes spv-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .spv-bar {
          transform-origin: bottom;
          animation: spv-bar-grow 600ms var(--ease-out-quint) backwards;
        }
        @keyframes spv-bar-grow {
          from { transform: scaleY(0); }
          to { transform: scaleY(1); }
        }
        .spv-pulse::after {
          content: "";
          position: absolute;
          inset: -3px;
          border-radius: 999px;
          border: 1px solid var(--mint-deep);
          animation: spv-pulse 3s ease-out infinite;
        }
        @keyframes spv-pulse {
          0% { opacity: 0.8; transform: scale(0.9); }
          70%, 100% { opacity: 0; transform: scale(1.35); }
        }
        @media (prefers-reduced-motion: reduce) {
          .spv-gradient, .spv-floaty, .spv-bar, .spv-pulse::after {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
