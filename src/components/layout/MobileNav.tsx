"use client";

/*
  MobileNav — "Ink-blot" full-screen menu.

  Tapping the corner burger floods the screen with a mint-tinted ink-blot: a
  clip-path circle expands from the button's corner until it covers the viewport,
  then huge nav words rise + fade in one by one (refined overshoot, no cartoon
  bounce). The active route gets a drawn-in underline; a small contact CTA +
  cycling index sit at the foot. Closing collapses the blot back into the corner.

  Kagu-styled: dark surface tokens, mono display type, mint-deep accents.
  Shown < md only; the desktop inline nav stays as-is. Locks body scroll while
  open, closes on link tap / route change / Esc, traps focus, reduced-motion safe.

  Static styles live in src/styles/mobile-nav.css (imported via globals.css).
*/

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { Logo } from "@/components/Logo";
import { navItems } from "./navItems";
import { HomeLink } from "@/components/ui/HomeLink";

// Refined easing — fast, confident, no bounce.
const EASE_BLOT = [0.16, 1, 0.3, 1] as const; // expo-out
const EASE_WORD = [0.22, 1, 0.36, 1] as const; // out-quint

// The blot originates at the burger (top-right corner) and must grow to cover
// the far (bottom-left) corner — that radius is the viewport diagonal at 150%.
const CLIP_CLOSED = "circle(0% at calc(100% - 32px) 36px)";
const CLIP_OPEN = "circle(150% at calc(100% - 32px) 36px)";

export function MobileNav() {
  const pathname = usePathname();
  const reduced = useReducedMotion() ?? false;
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => setOpen(false), []);

  // Close whenever the route changes — covers browser back/forward as well as
  // link taps. Mirrors the set-state-in-effect convention used by PreloadCurtain.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while open; restore on close/unmount.
  useEffect(() => {
    if (!open) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prev;
    };
  }, [open]);

  // Esc to close + focus management (move focus into panel, restore to trigger).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const first = panelRef.current?.querySelector<HTMLElement>("a[href]");
    first?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      triggerRef.current?.focus();
    };
  }, [open]);

  // Ink-blot flood. Under reduced motion: plain fade, no clip animation.
  const blotInitial = reduced ? { opacity: 0 } : { clipPath: CLIP_CLOSED, opacity: 1 };
  const blotAnimate = reduced ? { opacity: 1 } : { clipPath: CLIP_OPEN, opacity: 1 };
  const blotExit = reduced ? { opacity: 0 } : { clipPath: CLIP_CLOSED, opacity: 1 };
  const blotTransition = reduced
    ? { duration: 0.2 }
    : { duration: 0.7, ease: EASE_BLOT };

  // Stagger the words in after the blot has begun flooding.
  const listVariants = {
    closed: {},
    open: reduced
      ? {}
      : { transition: { staggerChildren: 0.07, delayChildren: 0.22 } },
    exit: reduced
      ? {}
      : { transition: { staggerChildren: 0.04, staggerDirection: -1 } },
  };
  const itemVariants = reduced
    ? { closed: {}, open: {}, exit: {} }
    : {
        closed: { y: "120%", opacity: 0, rotate: 2 },
        open: {
          y: "0%",
          opacity: 1,
          rotate: 0,
          transition: { duration: 0.7, ease: EASE_WORD },
        },
        exit: {
          y: "60%",
          opacity: 0,
          transition: { duration: 0.3, ease: EASE_WORD },
        },
      };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            id={panelId}
            ref={panelRef}
            className="kagu-blot"
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            initial={blotInitial}
            animate={blotAnimate}
            exit={blotExit}
            transition={blotTransition}
          >
            {/* Faint dot-grid texture so the flooded field isn't a flat fill. */}
            <span aria-hidden className="kagu-blot__grid" />

            {/* Brand — back to home. */}
            <motion.div
              className="kagu-blot__brand"
              initial={reduced ? false : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.5, ease: EASE_WORD, delay: reduced ? 0 : 0.28 }}
            >
              <HomeLink onClick={close} className="kagu-blot__logo">
                <Logo size={30} />
              </HomeLink>
            </motion.div>

            <motion.nav
              className="kagu-blot__nav"
              aria-label="Primary"
              variants={listVariants}
              initial="closed"
              animate="open"
              exit="exit"
            >
              <ul className="kagu-blot__list">
                {navItems.map((item, i) => {
                  const isActive =
                    pathname === item.href || pathname?.startsWith(`${item.href}/`);
                  return (
                    <li key={item.href} className="kagu-blot__item">
                      {/* overflow-hidden mask so the word rises out of nothing */}
                      <span className="kagu-blot__mask">
                        <motion.span className="kagu-blot__word" variants={itemVariants}>
                          <Link
                            href={item.href}
                            onClick={close}
                            className={`kagu-blot__link ${isActive ? "is-active" : ""}`}
                            aria-current={isActive ? "page" : undefined}
                          >
                            <span className="kagu-blot__index">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <span className="kagu-blot__label">{item.label}</span>
                          </Link>
                        </motion.span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </motion.nav>

            <motion.div
              className="kagu-blot__footer"
              initial={reduced ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: 8 }}
              transition={{ duration: 0.5, ease: EASE_WORD, delay: reduced ? 0 : 0.5 }}
            >
              <Link href="/start-project" onClick={close} className="kagu-blot__contact">
                <span className="kagu-blot__contact-label">Start a project</span>
                <span aria-hidden className="kagu-blot__contact-arrow">→</span>
              </Link>
              <span className="kagu-blot__est">Est. 2025 · Istanbul</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Persistent logo blob — top-left frosted chip, mirrors the burger.
          Hidden while the menu is open (the flooded panel has its own brand). */}
      <HomeLink
        className={`kagu-blot__home ${open ? "is-hidden" : ""}`}
        tabIndex={open ? -1 : undefined}
        aria-hidden={open ? "true" : undefined}
      >
        <Logo wordmarkOnly size={26} />
      </HomeLink>

      <button
        ref={triggerRef}
        type="button"
        className="kagu-blot__burger"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={`kagu-blot__rule kagu-blot__rule--top ${open ? "is-open" : ""}`} />
        <span className={`kagu-blot__rule kagu-blot__rule--bottom ${open ? "is-open" : ""}`} />
      </button>
    </>
  );
}
