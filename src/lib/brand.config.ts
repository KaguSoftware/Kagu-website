/*
  JS mirror of CSS tokens for GSAP / Motion / TS consumers.
  Single source of truth: keep in sync with src/styles/tokens.css.
*/

// Dark grey theme + sky accent. Keys kept; mirror tokens.css (single source of truth).
export const palette = {
  mintDeep: "#1f8fe0",
  mintSoft: "#232734",
  mintPale: "#1a1d26",
  neutral: "#363b48",
  slateInk: "#a8adb8",
  paper: "#14161d",
  ink: "#eef1f5",
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
