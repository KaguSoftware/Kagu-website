"use client";

/*
  Live browser-frame preview for the package builder. Pure CSS/JSX skeleton —
  the chrome idiom (window dots + URL pill) follows CaseCover.tsx, but the
  body is a live wireframe that reacts to every selection:

  - each zone (navbar/hero/footer) renders the chosen style variant; the
    "custom" variant repaints the zone with an animated gradient.
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
  type ThemeChoice,
  type ZoneChoices,
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
const HAIRLINE = "var(--spv-hairline)";

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
        // Stubs inside gradient zones lighten to read on the color;
        // otherwise the theme wrapper's --spv-stub flows through.
        ["--spv-stub" as string]: gradient ? "rgba(238, 241, 245, 0.55)" : undefined,
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

const variantFade = {
  initial: { opacity: 0, y: 5 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -5 },
  transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] as const },
};

/* ------------------------------------------------------------------ */
/* Navbar styles                                                       */
/* ------------------------------------------------------------------ */

function NavLinks() {
  return (
    <div style={{ display: "flex", gap: 10 }}>
      <Stub w={30} h={5} />
      <Stub w={24} h={5} />
      <Stub w={34} h={5} />
    </div>
  );
}

function NavLogo() {
  return (
    <Stub
      w={20}
      h={20}
      r={5}
      style={{
        background:
          "linear-gradient(135deg, var(--spv-accent), var(--spv-accent-2))",
      }}
    />
  );
}

function IconSlot({ icons, light }: { icons: string[]; light: boolean }) {
  return (
    <div
      style={{
        marginLeft: "auto",
        display: "flex",
        alignItems: "center",
        gap: 9,
        color: light ? "var(--ink)" : "var(--spv-muted)",
      }}
    >
      <AnimatePresence>
        {icons.map((icon) => (
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
  );
}

function NavbarBody({
  variant,
  icons,
  gradient,
}: {
  variant: string;
  icons: string[];
  gradient: boolean;
}) {
  if (variant === "pills") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px" }}>
        <NavLogo />
        <span style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <span
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              padding: "7px 18px",
              borderRadius: 999,
              border: `1px solid ${HAIRLINE}`,
              background: "var(--spv-card)",
            }}
          >
            <Stub w={28} h={5} />
            <Stub w={22} h={5} />
            <Stub w={32} h={5} />
          </span>
        </span>
        <IconSlot icons={icons} light={gradient} />
      </div>
    );
  }
  if (variant === "floating") {
    return (
      <div style={{ padding: "8px 14px 6px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "8px 16px",
            borderRadius: 999,
            border: `1px solid ${HAIRLINE}`,
            background: "var(--spv-card)",
            boxShadow: "0 8px 20px -10px rgba(0, 0, 0, 0.55)",
          }}
        >
          <NavLogo />
          <span style={{ flex: 1, display: "flex", justifyContent: "center" }}>
            <NavLinks />
          </span>
          <IconSlot icons={icons} light={gradient} />
        </div>
      </div>
    );
  }
  // standard + custom share the classic layout (custom adds the gradient)
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px" }}>
      <NavLogo />
      <NavLinks />
      <IconSlot icons={icons} light={gradient} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Hero styles                                                         */
/* ------------------------------------------------------------------ */

function HeroBody({ variant, gradient }: { variant: string; gradient: boolean }) {
  const cta = (
    <Stub
      w={74}
      h={20}
      r={3}
      style={{
        marginTop: 8,
        background: gradient
          ? "rgba(238, 241, 245, 0.9)"
          : "color-mix(in oklab, var(--spv-accent-2) 85%, transparent)",
      }}
    />
  );

  if (variant === "centered") {
    return (
      <div
        className="spv-cms-target spv-floaty"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 9,
          padding: "30px 16px 28px",
        }}
      >
        <Stub w="46%" h={13} />
        <Stub w="30%" h={13} />
        <Stub w="52%" h={6} style={{ marginTop: 3 }} />
        {cta}
      </div>
    );
  }
  if (variant === "split") {
    return (
      <div
        className="spv-cms-target spv-floaty"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 14,
          alignItems: "center",
          padding: "22px 16px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 9 }}>
          <Stub w="86%" h={13} />
          <Stub w="60%" h={13} />
          <Stub w="92%" h={6} style={{ marginTop: 3 }} />
          {cta}
        </div>
        <Stub h={88} r={4} style={{ width: "100%" }} />
      </div>
    );
  }
  // standard + custom: editorial left
  return (
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
      {cta}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Footer styles                                                       */
/* ------------------------------------------------------------------ */

function FooterBody({ variant }: { variant: string }) {
  if (variant === "minimal") {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
        <Stub
          w={16}
          h={16}
          r={4}
          style={{ background: "color-mix(in oklab, var(--spv-accent) 70%, transparent)" }}
        />
        <span style={{ flex: 1 }} />
        <Stub w={28} h={4} />
        <Stub w={34} h={4} />
        <Stub w={24} h={4} />
      </div>
    );
  }
  if (variant === "cta") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "18px 16px 14px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 7, flex: 1 }}>
            <Stub w="52%" h={11} />
            <Stub w="34%" h={11} />
          </div>
          <Stub
            w={70}
            h={22}
            r={3}
            style={{ background: "color-mix(in oklab, var(--spv-accent-2) 85%, transparent)" }}
          />
        </div>
        <div
          style={{
            display: "flex",
            gap: 12,
            borderTop: `1px solid ${HAIRLINE}`,
            paddingTop: 10,
          }}
        >
          <Stub w={24} h={4} />
          <Stub w={30} h={4} />
          <Stub w={22} h={4} />
        </div>
      </div>
    );
  }
  // columns + custom
  return (
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
  );
}

/* ------------------------------------------------------------------ */
/* The page wireframe — rendered once normally, twice for the          */
/* half-and-half "both themes" split.                                  */
/* ------------------------------------------------------------------ */

function PreviewPage({
  typeId,
  zoneChoices,
  navIcons,
  sections,
  chatStyles,
  reduced,
}: {
  typeId: WebsiteTypeId;
  zoneChoices: ZoneChoices;
  navIcons: string[];
  sections: ReadonlySet<string>;
  chatStyles: string[];
  reduced: boolean;
}) {
  const navGradient = zoneChoices.navbar === "custom";
  const heroGradient = zoneChoices.hero === "custom";
  const footGradient = zoneChoices.footer === "custom";

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        minHeight: "100%",
        background: "var(--spv-page)",
      }}
    >
      {/* Navbar zone */}
      <Zone
        gradient={navGradient}
        reduced={reduced}
        style={{
          borderBottom:
            zoneChoices.navbar === "floating" ? "none" : `1px solid ${HAIRLINE}`,
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={zoneChoices.navbar} {...variantFade}>
            <NavbarBody
              variant={zoneChoices.navbar}
              icons={navIcons}
              gradient={navGradient}
            />
          </motion.div>
        </AnimatePresence>
      </Zone>

      {/* Hero zone */}
      <Zone gradient={heroGradient} reduced={reduced}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={zoneChoices.hero} {...variantFade}>
            <HeroBody variant={zoneChoices.hero} gradient={heroGradient} />
          </motion.div>
        </AnimatePresence>
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
        gradient={footGradient}
        reduced={reduced}
        style={{
          borderTop: `1px solid ${HAIRLINE}`,
          marginTop: "auto",
        }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={zoneChoices.footer} {...variantFade}>
            <FooterBody variant={zoneChoices.footer} />
          </motion.div>
        </AnimatePresence>
      </Zone>

      {/* Chat bubbles — sticky bottom-right; WhatsApp stacks above the AI one */}
      <AnimatePresence>
        {chatStyles.map((style, i) => (
          <motion.div
            key={style}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            transition={
              reduced
                ? { duration: 0 }
                : { type: "spring", stiffness: 380, damping: 22 }
            }
            className={!reduced && i === 0 ? "spv-pulse" : undefined}
            style={{
              position: "absolute",
              right: 14,
              bottom: 14 + i * 48,
              width: 40,
              height: 40,
              borderRadius: 999,
              background: style === "whatsapp" ? "#1faa55" : "var(--spv-accent-2)",
              color: "#eef1f5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow:
                style === "whatsapp"
                  ? "0 6px 18px -6px rgba(31, 170, 85, 0.7)"
                  : "0 6px 18px -6px color-mix(in oklab, var(--spv-accent-2) 70%, transparent)",
            }}
          >
            <ChatGlyph />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Frame                                                               */
/* ------------------------------------------------------------------ */

export function BuilderPreview({
  typeId,
  selected,
  zoneChoices,
  theme,
  accent,
  accent2,
  accent3,
}: {
  typeId: WebsiteTypeId;
  selected: ReadonlySet<string>;
  zoneChoices: ZoneChoices;
  theme: ThemeChoice;
  accent: string;
  accent2: string;
  accent3: string;
}) {
  const reduced = useReducedMotion() ?? false;
  const type = getWebsiteType(typeId);
  const active = featuresForType(typeId).filter((f) => selected.has(f.id));

  const navIcons: string[] = [];
  const badges: string[] = [];
  const sections = new Set<string>();
  const chatStyles: string[] = [];
  let cms = false;
  let ambient = false;

  for (const f of active) {
    const e = f.effect;
    if (e.kind === "nav-icon") navIcons.push(e.icon);
    else if (e.kind === "chat-bubble") chatStyles.push(e.style);
    else if (e.kind === "section") sections.add(e.section);
    else if (e.kind === "chrome-badge") badges.push(e.label);
    else if (e.kind === "cms-outline") cms = true;
    else if (e.kind === "ambient-motion") ambient = true;
  }
  if (typeId === "ecommerce") navIcons.push("cart"); // store always has a cart
  if (theme === "both") navIcons.push("theme"); // the toggle visitors will get

  const pageProps = { typeId, zoneChoices, navIcons, sections, chatStyles, reduced };

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
        ["--spv-accent" as string]: accent,
        ["--spv-accent-2" as string]: accent2,
        ["--spv-accent-3" as string]: accent3,
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
                  border: "1px solid var(--spv-accent-3)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  color: "var(--spv-accent-3)",
                  whiteSpace: "nowrap",
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 3,
                    background: "var(--spv-accent-3)",
                  }}
                />
                {label}
              </motion.span>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Page viewport — themed; "both" overlays a light copy on the right half */}
      <div style={{ position: "relative" }}>
        <div className={theme === "light" ? "spv-theme-light" : "spv-theme-dark"}>
          <PreviewPage {...pageProps} />
        </div>
        {theme === "both" && (
          <div
            aria-hidden
            className="spv-theme-light"
            style={{
              position: "absolute",
              inset: 0,
              clipPath: "inset(0 0 0 50%)",
              borderLeft: "1px solid var(--neutral)",
            }}
          >
            <PreviewPage {...pageProps} />
          </div>
        )}
      </div>

      <style>{`
        .spv-theme-dark {
          --spv-page: transparent;
          --spv-stub: color-mix(in oklab, var(--slate-ink) 26%, transparent);
          --spv-hairline: color-mix(in oklab, var(--neutral) 70%, transparent);
          --spv-card: color-mix(in oklab, var(--mint-soft) 60%, transparent);
          --spv-muted: var(--slate-ink);
        }
        .spv-theme-light {
          --spv-page: #eef0ec;
          --spv-stub: rgba(24, 28, 36, 0.22);
          --spv-hairline: rgba(24, 28, 36, 0.14);
          --spv-card: rgba(255, 255, 255, 0.8);
          --spv-muted: rgba(24, 28, 36, 0.6);
        }
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
          outline: 1px dashed var(--spv-accent);
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
          border: 1px solid var(--spv-accent);
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
