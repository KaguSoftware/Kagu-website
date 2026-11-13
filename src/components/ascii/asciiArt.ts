/*
  ASCII art toolkit. Pure strings, safe on server and client.
  - bigText("WORK")  → block-letter banner in plain ASCII (# face, : shadow)
  - frame(lines, { title }) → +- title -+ box around lines
  - rule(n, pattern) → divider strings
  - KAGU_WORDMARK → fixed brand art
*/

/* 5×5 pixel font. '#' = on. Width varies per glyph. */
const FONT: Record<string, string[]> = {
  A: [" ### ", "#   #", "#####", "#   #", "#   #"],
  B: ["#### ", "#   #", "#### ", "#   #", "#### "],
  C: [" ####", "#    ", "#    ", "#    ", " ####"],
  D: ["#### ", "#   #", "#   #", "#   #", "#### "],
  E: ["#####", "#    ", "#### ", "#    ", "#####"],
  F: ["#####", "#    ", "#### ", "#    ", "#    "],
  G: [" ####", "#    ", "#  ##", "#   #", " ####"],
  H: ["#   #", "#   #", "#####", "#   #", "#   #"],
  I: ["###", " # ", " # ", " # ", "###"],
  J: ["  ###", "   # ", "   # ", "#  # ", " ##  "],
  K: ["#   #", "#  # ", "###  ", "#  # ", "#   #"],
  L: ["#    ", "#    ", "#    ", "#    ", "#####"],
  M: ["#   #", "## ##", "# # #", "#   #", "#   #"],
  N: ["#   #", "##  #", "# # #", "#  ##", "#   #"],
  O: [" ### ", "#   #", "#   #", "#   #", " ### "],
  P: ["#### ", "#   #", "#### ", "#    ", "#    "],
  Q: [" ### ", "#   #", "# # #", "#  # ", " ## #"],
  R: ["#### ", "#   #", "#### ", "#  # ", "#   #"],
  S: [" ####", "#    ", " ### ", "    #", "#### "],
  T: ["#####", "  #  ", "  #  ", "  #  ", "  #  "],
  U: ["#   #", "#   #", "#   #", "#   #", " ### "],
  V: ["#   #", "#   #", "#   #", " # # ", "  #  "],
  W: ["#   #", "#   #", "# # #", "## ##", "#   #"],
  X: ["#   #", " # # ", "  #  ", " # # ", "#   #"],
  Y: ["#   #", " # # ", "  #  ", "  #  ", "  #  "],
  Z: ["#####", "   # ", "  #  ", " #   ", "#####"],
  "0": [" ### ", "#  ##", "# # #", "##  #", " ### "],
  "1": [" # ", "## ", " # ", " # ", "###"],
  "2": [" ### ", "#   #", "  ## ", " #   ", "#####"],
  "3": ["#### ", "    #", " ### ", "    #", "#### "],
  "4": ["#   #", "#   #", "#####", "    #", "    #"],
  "5": ["#####", "#    ", "#### ", "    #", "#### "],
  "6": [" ### ", "#    ", "#### ", "#   #", " ### "],
  "7": ["#####", "    #", "   # ", "  #  ", "  #  "],
  "8": [" ### ", "#   #", " ### ", "#   #", " ### "],
  "9": [" ### ", "#   #", " ####", "    #", " ### "],
  " ": ["  ", "  ", "  ", "  ", "  "],
  "-": ["    ", "    ", "####", "    ", "    "],
  ".": [" ", " ", " ", " ", "#"],
  "!": ["#", "#", "#", " ", "#"],
  "?": [" ### ", "#   #", "  ## ", "     ", "  #  "],
  "/": ["    #", "   # ", "  #  ", " #   ", "#    "],
  "&": [" ##  ", "#  # ", " ## #", "#  # ", " ## #"],
  "+": ["   ", " # ", "###", " # ", "   "],
};

const FOLD: Record<string, string> = {
  Ç: "C", Ğ: "G", İ: "I", Ö: "O", Ş: "S", Ü: "U", Â: "A", Î: "I", Û: "U",
};

/** Pixel rows for a word, before shading. */
export function bigTextPixels(word: string): boolean[][] {
  const glyphs = Array.from(word.toLocaleUpperCase("tr"))
    .map((c) => FOLD[c] ?? c)
    .map((c) => FONT[c] ?? FONT[" "]);
  const rows: boolean[][] = [[], [], [], [], []];
  glyphs.forEach((g, gi) => {
    for (let r = 0; r < 5; r++) {
      for (const px of g[r]) rows[r].push(px === "#");
      if (gi < glyphs.length - 1) rows[r].push(false);
    }
  });
  return rows;
}

/**
 * Block-letter banner in plain ASCII (every monospace font has these glyphs at
 * the same width, unlike block elements). Each pixel is two characters wide so
 * letters look square; a : shadow sits one pixel down-right.
 */
export function bigText(
  word: string,
  opts: { shadow?: boolean; on?: string; shade?: string; layer?: "both" | "face" | "shadow" } = {},
): string {
  const { shadow = true, on = "#", shade = ":", layer = "both" } = opts;
  const px = bigTextPixels(word);
  const h = px.length;
  const w = px[0]?.length ?? 0;
  const extra = shadow || layer !== "both" ? 1 : 0;
  const drawFace = layer !== "shadow";
  const drawShade = layer === "shadow" || (layer === "both" && shadow);
  const out: string[] = [];
  for (let y = 0; y < h + extra; y++) {
    let line = "";
    for (let x = 0; x < w + extra; x++) {
      const isOn = px[y]?.[x] ?? false;
      const isShade = !isOn && (px[y - 1]?.[x - 1] ?? false);
      line += isOn && drawFace ? on + on : isShade && drawShade ? shade + shade : "  ";
    }
    out.push(line.replace(/\s+$/, ""));
  }
  // keep every layer the same height so stacked layers line up
  return out.join("\n");
}

type FrameStyle = "single" | "double" | "round" | "heavy" | "ascii";
/*
  Plain ASCII only. next/font ships JetBrains Mono subset to latin, so box-drawing
  glyphs fall back to another monospace with a different advance width and the
  right-hand edge of a box drifts. These glyphs line up in every font.
*/
const BOX: Record<FrameStyle, [string, string, string, string, string, string]> = {
  //        tl   tr   bl   br   h    v
  single: ["+", "+", "+", "+", "-", "|"],
  double: ["#", "#", "#", "#", "=", "|"],
  round: [".", ".", "'", "'", "-", "|"],
  heavy: ["+", "+", "+", "+", "=", "|"],
  ascii: ["+", "+", "+", "+", "-", "|"],
};

const len = (s: string) => Array.from(s).length;

/** Draws a box around lines of text. Width = longest line + padding. */
export function frame(
  input: string | string[],
  opts: { title?: string; style?: FrameStyle; pad?: number; width?: number } = {},
): string {
  const { title, style = "single", pad = 1 } = opts;
  const lines = Array.isArray(input) ? input : input.split("\n");
  const [tl, tr, bl, br, h, v] = BOX[style];
  const inner = Math.max(
    opts.width ?? 0,
    ...lines.map((l) => len(l) + pad * 2),
    title ? len(title) + 4 : 0,
  );
  const sp = " ".repeat(pad);
  const top = title
    ? `${tl}${h} ${title} ${h.repeat(Math.max(0, inner - len(title) - 3))}${tr}`
    : `${tl}${h.repeat(inner)}${tr}`;
  const body = lines.map(
    (l) => `${v}${sp}${l}${" ".repeat(Math.max(0, inner - len(l) - pad * 2))}${sp}${v}`,
  );
  return [top, ...body, `${bl}${h.repeat(inner)}${br}`].join("\n");
}

/** Repeats a pattern to exactly n characters. */
export function rule(n: number, pattern = "-"): string {
  const p = Array.from(pattern);
  let s = "";
  for (let i = 0; i < n; i++) s += p[i % p.length];
  return s;
}

/** Tiny sparkline from numbers in 0..1. */
export function spark(values: number[]): string {
  const bars = "_.,:-=+*#"; // ASCII ramp, same width in every font
  return values.map((v) => bars[Math.max(0, Math.min(8, Math.round(v * 8)))]).join("");
}

export const KAGU_WORDMARK = bigText("KAGU");
