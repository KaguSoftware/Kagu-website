"use client";

/*
  Drop-in for next/link on the public site. Tags the navigation so the page
  transition knows which one to play: a move to a different top-level section
  (Home, Work, Marketing, About, Contact...) is "nav-major"; anything inside the
  current section (Work to a case study and back) is "nav-minor". Browser
  back/forward and untagged navigations fall back to the minor one.
  The animations live in src/styles/view-transitions.css.
*/
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";

const section = (path: string) => path.split(/[?#]/)[0].split("/").filter(Boolean)[0] ?? "";

export function NavLink({ href, ...rest }: ComponentProps<typeof Link>) {
  const pathname = usePathname() ?? "/";
  const target = typeof href === "string" ? href : (href.pathname ?? pathname);
  const major = target.startsWith("/") && section(target) !== section(pathname);
  return <Link href={href} transitionTypes={[major ? "nav-major" : "nav-minor"]} {...rest} />;
}
