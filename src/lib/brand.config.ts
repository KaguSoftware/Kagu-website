/*
  JS mirror of CSS tokens for GSAP / Motion / TS consumers.
  Single source of truth: keep in sync with src/styles/tokens.css.
*/

// Brand accent migrated mint → ice-blue. Keys kept; values mirror tokens.css.
export const palette = {
  mintDeep: "#74C4EC",
  mintSoft: "#B4DFF6",
  mintPale: "#D6EEFB",
  neutral: "#C4C4C5",
  slateInk: "#7B7689",
  paper: "#F4FAFF",
  ink: "#1A1820",
} as const;

export const ease = {
  arc: [0.6, 0.01, 0.05, 0.95] as const,
  outExpo: [0.16, 1, 0.3, 1] as const,
  outQuint: [0.22, 1, 0.36, 1] as const,
  curtain: [0.76, 0, 0.24, 1] as const,
  snap: [0.4, 0, 0.2, 1] as const,
} as const;

export const easeCss = {
  arc: "cubic-bezier(0.6, 0.01, 0.05, 0.95)",
  outExpo: "cubic-bezier(0.16, 1, 0.3, 1)",
  outQuint: "cubic-bezier(0.22, 1, 0.36, 1)",
  curtain: "cubic-bezier(0.76, 0, 0.24, 1)",
  snap: "cubic-bezier(0.4, 0, 0.2, 1)",
} as const;

export const duration = {
  instant: 0.16,
  quick: 0.28,
  base: 0.6,
  reveal: 1.0,
  mask: 1.3,
  loader: 2.2,
} as const;

export const stagger = {
  word: 0.06,
  line: 0.12,
  block: 0.2,
  list: 0.08,
} as const;

export const spring = {
  magnetic: { stiffness: 200, damping: 25, mass: 1 },
  drag: { stiffness: 180, damping: 30, mass: 1 },
} as const;

export const z = {
  base: 0,
  raised: 10,
  sticky: 20,
  nav: 30,
  overlay: 50,
  cursor: 90,
  curtain: 100,
} as const;

export type Palette = typeof palette;
export type EaseKey = keyof typeof ease;
