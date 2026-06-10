"use client";

/*
  ToolTile — one launcher tile on /admin/tools. The page is a workspace door,
  so each tile gets some life: a staggered entrance, a mouse-tracking mint
  glow, the bird mark drifting in as a watermark, and an arrow that takes off
  on hover. All motion respects prefers-reduced-motion via Framer's hooks.
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
  /** Pulsing status dot label, e.g. "live" */
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
        className="group relative flex min-h-56 flex-col justify-between overflow-hidden border border-neutral bg-mint-pale p-6 transition-colors duration-300 hover:border-mint-deep sm:p-7"
      >
        {/* mouse-tracking mint glow */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background:
              "radial-gradient(220px circle at var(--mx, 70%) var(--my, 30%), color-mix(in oklab, var(--mint-deep) 16%, transparent), transparent 70%)",
          }}
        />

        {/* bird watermark drifting in from the corner */}
        <span
          aria-hidden
          className="pointer-events-none absolute -right-8 -bottom-10 w-3/5 rotate-[-9deg] opacity-[0.07] transition-all duration-500 ease-out group-hover:translate-x-[-6px] group-hover:translate-y-[-4px] group-hover:rotate-[-4deg] group-hover:opacity-[0.16]"
        >
          <KaguMark style={{ width: "100%", height: "auto", color: "var(--mint-deep)" }} />
        </span>

        <div className="relative flex items-start justify-between gap-4">
          <span className="border border-neutral px-2 py-0.5 font-mono text-xs uppercase tracking-[0.18em] text-slate-ink transition-colors group-hover:border-mint-deep group-hover:text-mint-deep">
            {tool.eyebrow}
          </span>
          <span
            aria-hidden
            className="font-mono text-lg text-slate-ink transition-all duration-300 group-hover:translate-x-1.5 group-hover:-translate-y-0.5 group-hover:text-mint-deep"
          >
            ↗
          </span>
        </div>

        <div className="relative mt-8">
          <h2 className="display text-2xl text-ink transition-colors duration-300 group-hover:text-mint-deep">
            {tool.title}
          </h2>
          <p className="mt-2 max-w-[36ch] text-sm leading-relaxed text-slate-ink">
            {tool.description}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-neutral pt-4">
            {tool.status ? (
              <span className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-slate-ink">
                <span aria-hidden className="relative inline-block size-2">
                  <span className="absolute inset-0 animate-ping rounded-full bg-mint-deep/60 motion-reduce:animate-none" />
                  <span className="absolute inset-[2px] rounded-full bg-mint-deep" />
                </span>
                {tool.status}
              </span>
            ) : null}
            {tool.stats.map((s) => (
              <span
                key={s}
                className="font-mono text-xs uppercase tracking-[0.18em] text-slate-ink"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
