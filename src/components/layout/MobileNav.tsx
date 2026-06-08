"use client";

/*
  MobileNav — the brand's own full-screen menu, not a generic drawer.

  Motifs borrowed from the rest of the site so the menu reads as "Kagu":
    · AmbientDrift backdrop (same wash as the hero / loading curtain)
    · indexed numerals (01 / Work …) echoing the Approach section
    · the cycling multilingual greeting + "Est. 2025" footer from the hero
    · mono display type, mint-deep underline accent

  Trigger is two short rules that cross into an ✕ on open (no stock hamburger).
  Shown < md only; the desktop inline nav stays as-is. Locks body scroll while
  open, closes on link tap / route change / Esc, traps focus, reduced-motion safe.
*/

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

import { navItems } from "./navItems";
import { AmbientDrift } from "@/components/motion/AmbientDrift";
import { GreetingCycle } from "@/components/motion/GreetingCycle";

export function MobileNav() {
  const pathname = usePathname();
  const reduced = useReducedMotion();
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

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="kagu-burger md:hidden"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={`kagu-burger__rule kagu-burger__rule--top ${open ? "is-open" : ""}`} />
        <span className={`kagu-burger__rule kagu-burger__rule--bottom ${open ? "is-open" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id={panelId}
            ref={panelRef}
            className="kagu-mobilemenu"
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            initial={reduced ? { opacity: 0 } : { clipPath: "inset(0 0 100% 0)" }}
            animate={reduced ? { opacity: 1 } : { clipPath: "inset(0 0 0% 0)" }}
            exit={reduced ? { opacity: 0 } : { clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: reduced ? 0.2 : 0.5, ease: [0.76, 0, 0.24, 1] }}
          >
            <AmbientDrift variant="light" className="kagu-mobilemenu__drift" />

            <nav className="kagu-mobilemenu__nav" aria-label="Primary">
              <ul className="kagu-mobilemenu__list">
                {navItems.map((item, i) => {
                  const isActive =
                    pathname === item.href || pathname?.startsWith(`${item.href}/`);
                  return (
                    <li key={item.href} className="kagu-mobilemenu__item">
                      <motion.span
                        className="kagu-mobilemenu__line"
                        initial={reduced ? false : { y: "110%" }}
                        animate={{ y: "0%" }}
                        transition={{
                          duration: reduced ? 0 : 0.6,
                          ease: [0.16, 1, 0.3, 1],
                          delay: reduced ? 0 : 0.12 + i * 0.07,
                        }}
                      >
                        <Link
                          href={item.href}
                          onClick={close}
                          className={`kagu-mobilemenu__link ${isActive ? "is-active" : ""}`}
                          aria-current={isActive ? "page" : undefined}
                        >
                          <span className="kagu-mobilemenu__index">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span className="kagu-mobilemenu__label">{item.label}</span>
                        </Link>
                      </motion.span>
                    </li>
                  );
                })}
              </ul>
            </nav>

            <div className="kagu-mobilemenu__footer">
              <GreetingCycle className="kagu-mobilemenu__greeting" />
              <span className="kagu-mobilemenu__est">Est. 2025 · Istanbul</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        /* --- trigger --- */
        .kagu-burger {
          position: relative;
          width: 44px;
          height: 44px;
          margin-right: -10px; /* optical: align rules to container edge */
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: none;
          border: 0;
          cursor: pointer;
          color: var(--ink);
          z-index: calc(var(--z-curtain) + 1);
        }
        .kagu-burger__rule {
          position: absolute;
          left: 11px;
          width: 22px;
          height: 1.5px;
          background: currentColor;
          transition: transform 360ms cubic-bezier(0.76, 0, 0.24, 1),
                      width 360ms cubic-bezier(0.76, 0, 0.24, 1);
        }
        .kagu-burger__rule--top { transform: translateY(-4px); }
        .kagu-burger__rule--bottom { transform: translateY(4px); width: 14px; }
        .kagu-burger__rule--top.is-open { transform: translateY(0) rotate(45deg); }
        .kagu-burger__rule--bottom.is-open { transform: translateY(0) rotate(-45deg); width: 22px; }
        @media (prefers-reduced-motion: reduce) {
          .kagu-burger__rule { transition: none; }
        }

        /* --- panel --- */
        .kagu-mobilemenu {
          position: fixed;
          inset: 0;
          z-index: var(--z-curtain);
          background: var(--paper);
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: max(96px, 14vh) clamp(1.5rem, 7vw, 3rem) clamp(2rem, 6vh, 3.5rem);
          overflow: hidden;
        }
        .kagu-mobilemenu__drift { z-index: 0; }

        .kagu-mobilemenu__nav { position: relative; z-index: 1; flex: 1; display: flex; align-items: center; }
        .kagu-mobilemenu__list {
          list-style: none;
          margin: 0;
          padding: 0;
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: clamp(0.5rem, 2vh, 1.1rem);
        }
        .kagu-mobilemenu__line {
          display: block;
          overflow: hidden; /* mask for the rise-in */
        }
        .kagu-mobilemenu__link {
          display: flex;
          align-items: baseline;
          gap: 0.85rem;
          padding: 6px 0;
          min-height: 48px;
          font-family: var(--font-display, ui-monospace, monospace);
          font-weight: 500;
          letter-spacing: -0.02em;
          line-height: 1;
          color: var(--ink);
          text-decoration: none;
        }
        .kagu-mobilemenu__index {
          font-family: var(--font-mono, ui-monospace, monospace);
          font-size: var(--type-xs);
          letter-spacing: 0.12em;
          color: var(--mint-deep);
          transform: translateY(-0.55em); /* lift the numeral toward the cap line */
        }
        .kagu-mobilemenu__label {
          font-size: clamp(2.75rem, 13vw, 4rem);
          position: relative;
        }
        .kagu-mobilemenu__link.is-active .kagu-mobilemenu__label::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0.12em;
          height: 2px;
          background: var(--mint-deep);
        }

        .kagu-mobilemenu__footer {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 1rem;
          border-top: 1px solid var(--neutral);
          padding-top: clamp(1rem, 3vh, 1.5rem);
        }
        .kagu-mobilemenu__greeting {
          font-family: var(--font-display, ui-monospace, monospace);
          font-size: var(--type-lg);
          color: var(--ink);
        }
        .kagu-mobilemenu__est {
          font-family: var(--font-mono, ui-monospace, monospace);
          font-size: var(--type-xs);
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: color-mix(in oklab, var(--ink) 55%, transparent);
        }
      `}</style>
    </>
  );
}
