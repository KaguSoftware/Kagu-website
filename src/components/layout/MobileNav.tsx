"use client";

import { forwardRef, useEffect, useId, useRef, type RefObject } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { menuItems, FALLBACK_EMAIL } from "./navItems";

/*
  Full-screen cream menu sheet + the 2-line button that morphs to an X.
  Scroll lock = html{overflow:hidden}; `scrollbar-gutter: stable` (site.css)
  keeps the layout from shifting. Escape closes, Tab is trapped between the
  button and the sheet links, focus returns to the button on Escape.
  Styles: src/styles/mobile-nav.css.
*/

export const MENU_ID = "site-menu";

export const MenuButton = forwardRef<
  HTMLButtonElement,
  { open: boolean; onToggle: () => void }
>(function MenuButton({ open, onToggle }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className="site-menu-btn"
      aria-label={open ? "Close menu" : "Open menu"}
      aria-expanded={open}
      aria-controls={MENU_ID}
      onClick={onToggle}
    >
      <i />
      <i />
    </button>
  );
});

export function MobileNav({
  open,
  onClose,
  triggerRef,
}: {
  open: boolean;
  onClose: () => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
}) {
  const pathname = usePathname();
  const sheetRef = useRef<HTMLDivElement>(null);
  const labelId = useId();
  const email = FALLBACK_EMAIL;

  // Scroll lock (no layout shift thanks to scrollbar-gutter: stable).
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = prev;
    };
  }, [open]);

  // Escape + focus trap + initial focus.
  useEffect(() => {
    if (!open) return;
    const sheet = sheetRef.current;
    const trigger = triggerRef.current;
    sheet?.querySelector<HTMLElement>("a[href]")?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        trigger?.focus();
        return;
      }
      if (e.key !== "Tab" || !sheet) return;
      const items = [
        ...(trigger ? [trigger] : []),
        ...Array.from(sheet.querySelectorAll<HTMLElement>("a[href]")),
      ];
      if (!items.length) return;
      const idx = items.indexOf(document.activeElement as HTMLElement);
      if (e.shiftKey && idx <= 0) {
        e.preventDefault();
        items[items.length - 1].focus();
      } else if (!e.shiftKey && (idx === items.length - 1 || idx === -1)) {
        e.preventDefault();
        items[0].focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, triggerRef]);

  // If the viewport grows past the mobile breakpoint, drop the menu.
  useEffect(() => {
    if (!open) return;
    const mq = window.matchMedia("(min-width: 761px)");
    const onChange = () => {
      if (mq.matches) onClose();
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [open, onClose]);

  return (
    <div
      id={MENU_ID}
      ref={sheetRef}
      className={`site-sheet${open ? " is-open" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelId}
      inert={!open}
    >
      <span id={labelId} className="site-sr">
        Site menu
      </span>
      <nav aria-label="Menu" className="site-sheet__nav">
        {menuItems.map((item) => {
          const active = !item.href.includes("#") && pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="site-sheet__foot">
        <a href={`mailto:${email}`}>{email}</a>
        <span>Istanbul</span>
      </div>
    </div>
  );
}
