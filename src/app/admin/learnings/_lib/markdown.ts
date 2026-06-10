/* Shared markdown helpers — server-safe (no React, no hooks). */

/** Slugify heading text into an anchor id. Must produce identical output for
    the rendered heading (Markdown.tsx) and the TOC extraction below. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[`*_~[\]()]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export type TocEntry = { depth: 2 | 3; text: string; id: string };

/** Extract ##/### headings for a table of contents, skipping fenced code. */
export function extractToc(markdown: string): TocEntry[] {
  const entries: TocEntry[] = [];
  let inFence = false;
  for (const line of markdown.split("\n")) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = line.match(/^(#{2,3})\s+(.+?)\s*#*\s*$/);
    if (!m) continue;
    // Strip inline markdown (code ticks, emphasis, link syntax) for display.
    const text = m[2].replace(/`([^`]*)`/g, "$1").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
    entries.push({ depth: m[1].length as 2 | 3, text, id: slugify(text) });
  }
  return entries;
}

/** Words-per-minute estimate shown on cards and article headers. */
export function readingTime(markdown: string): string {
  const words = markdown.split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 200))} min read`;
}
