/* Single source of truth for primary navigation — shared by the desktop
   header nav and the mobile full-screen menu. */
export const navItems = [
  { href: "/work", label: "Work" },
  { href: "/about", label: "About" },
  { href: "/team", label: "Team" },
  { href: "/start-project", label: "Start" },
  { href: "/contact", label: "Contact" },
] as const;
