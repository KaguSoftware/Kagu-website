"use client";

/*
  ToolTile — one launcher tile on /admin/tools. A staggered entrance, a quiet
  mouse-tracking glow, the outline bird mark as a faint watermark, and an arrow
  that nudges on hover. Motion respects prefers-reduced-motion.
*/

import { useRef } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { KaguMark } from "@/components/KaguMark";

export type Tool = {
  href: string;
  eyebrow: string;
  title: string;
  description: string;
  stats: string[];
  /** Status dot label, e.g. "live" */
  status?: string;
};

export function ToolTile({ tool, index }: { tool: Tool; index: number }) {
  const reduced = useReducedMotion() ?? false;
  const ref = useRef<HTMLAnchorElement>(null);

  // Mouse-tracking spotlight: write coords to CSS vars, let CSS paint.
  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el || reduced) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.12 + index * 0.12, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link
        ref={ref}
        href={tool.href}
        onMouseMove={onMove}
        className="group relative flex min-h-56 flex-col justify-between overflow-hidden rounded-[var(--radius-ctl)] border border-[var(--line)] bg-[var(--card)] p-6 transition-colors duration-300 hover:border-[var(--line-strong)] sm:p-7"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background:
              "radial-gradient(240px circle at var(--mx, 70%) var(--my, 30%), color-mix(in srgb, var(--accent) 10%, transparent), transparent 70%)",
          }}
        />

        <span
          aria-hidden
          className="pointer-events-none absolute -right-8 -bottom-10 w-3/5 rotate-[-9deg] text-[var(--ink)] opacity-[0.05] transition-all duration-500 ease-out group-hover:translate-x-[-6px] group-hover:translate-y-[-4px] group-hover:rotate-[-4deg] group-hover:opacity-[0.1]"
        >
          <KaguMark variant="outline" style={{ width: "100%", height: "auto" }} />
        </span>

        <div className="relative flex items-start justify-between gap-4">
          <span className="eyebrow">{tool.eyebrow}</span>
          <span
            aria-hidden
            className="text-lg text-[var(--muted)] transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-1 group-hover:text-[var(--ink)]"
          >
            ↗
          </span>
        </div>

        <div className="relative mt-8">
          <h2 className="display text-2xl text-[var(--ink)]">{tool.title}</h2>
          <p className="mt-2 max-w-[36ch] text-sm leading-relaxed text-[var(--muted)]">
            {tool.description}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-[var(--line)] pt-4">
            {tool.status ? (
              <span className="inline-flex items-center gap-2 text-xs text-[var(--ok-ink)]">
                <span aria-hidden className="relative inline-block size-2">
                  <span className="absolute inset-0 animate-ping rounded-full bg-[var(--ok)] opacity-50 motion-reduce:animate-none" />
                  <span className="absolute inset-[2px] rounded-full bg-[var(--ok)]" />
                </span>
                {tool.status}
              </span>
            ) : null}
            {tool.stats.map((s) => (
              <span key={s} className="text-xs text-[var(--muted)]">
                {s}
              </span>
            ))}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
