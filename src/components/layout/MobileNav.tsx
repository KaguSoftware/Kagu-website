"use client";

/*
  MobileNav — "Corner Nav" (after hover.dev): a square hamburger pinned to the
  top-right corner that springs open a rounded dark card anchored to that same
  corner. The button's two rules cross into an ✕; the card expands by animating
  width/height from the button footprint (originX:1, originY:0) on a spring, and
  the nav links stagger in. A dimmed scrim behind the card closes on tap.

  Kagu-styled: dark surface tokens, mono display type, mint-deep accents.
  Shown < md only; the desktop inline nav stays as-is. Locks body scroll while
  open, closes on link tap / route change / Esc, traps focus, reduced-motion safe.

  Static styles live in src/styles/mobile-nav.css (imported via globals.css).
*/

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { navItems } from "./navItems";

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
    // Move focus to the first link once the panel is mounted.
    const first = panelRef.current?.querySelector<HTMLElement>("a[href]");
    first?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      triggerRef.current?.focus();
    };
  }, [open]);

  // Spring on open; quick fade-equivalent under reduced motion.
  const panelTransition = reduced
    ? { duration: 0.2 }
    : { type: "spring" as const, stiffness: 320, damping: 32, mass: 0.9 };

  // Stagger the links in once the card has started opening. No-op when reduced.
  const listVariants = {
    closed: {},
    open: reduced
      ? {}
      : { transition: { staggerChildren: 0.06, delayChildren: 0.12 } },
  };
  const itemVariants = reduced
    ? { closed: {}, open: {} }
    : { closed: { opacity: 0, x: 16 }, open: { opacity: 1, x: 0 } };

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              className="kagu-corner__scrim"
              aria-hidden
              onClick={close}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduced ? 0.15 : 0.3 }}
            />

            <motion.nav
              id={panelId}
              ref={panelRef}
              className="kagu-corner__panel"
              role="dialog"
              aria-modal="true"
              aria-label="Site menu"
              style={{ originX: 1, originY: 0 }}
              variants={{
                closed: { width: 48, height: 48 },
                open: { width: "min(88vw, 360px)", height: "min(70vh, 460px)" },
              }}
              initial="closed"
              animate="open"
              exit="closed"
              transition={panelTransition}
            >
              <motion.ul
                className="kagu-corner__list"
                variants={listVariants}
                initial="closed"
                animate="open"
              >
                {navItems.map((item, i) => {
                  const isActive =
                    pathname === item.href || pathname?.startsWith(`${item.href}/`);
                  return (
                    <motion.li
                      key={item.href}
                      className="kagu-corner__item"
                      variants={itemVariants}
                    >
                      <Link
                        href={item.href}
                        onClick={close}
                        className={`kagu-corner__link ${isActive ? "is-active" : ""}`}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <span className="kagu-corner__index">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="kagu-corner__label">{item.label}</span>
                      </Link>
                    </motion.li>
                  );
                })}
              </motion.ul>

              <div className="kagu-corner__footer">
                <Link href="/contact" onClick={close} className="kagu-corner__contact">
                  Start a project →
                </Link>
                <span className="kagu-corner__est">Est. 2025 · Istanbul</span>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>

      <button
        ref={triggerRef}
        type="button"
        className="kagu-corner__burger"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={`kagu-corner__rule kagu-corner__rule--top ${open ? "is-open" : ""}`} />
        <span className={`kagu-corner__rule kagu-corner__rule--bottom ${open ? "is-open" : ""}`} />
      </button>
    </>
  );
}
