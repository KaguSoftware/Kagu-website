/* Single source of truth for primary navigation — shared by the desktop
   header, the mobile full-screen menu and the footer. */
export const navItems = [
  { href: "/work", label: "Work" },
  { href: "/marketing", label: "Marketing" },
  { href: "/about", label: "About" },
] as const;

/** The pill CTA in the header (desktop) and the "Contact" row in the menu. */
export const contactHref = "/about#contact";

/** Rows in the full-screen mobile menu. */
export const menuItems = [
  { href: "/", label: "Home" },
  { href: "/work", label: "Work" },
  { href: "/marketing", label: "Marketing" },
  { href: contactHref, label: "Contact" },
] as const;

export const FALLBACK_EMAIL = "contact@kagusoftware.com";
