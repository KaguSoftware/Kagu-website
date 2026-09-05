/*
  FileCard — the folder card shared by /work and /marketing.

  One card is a folder: a tab rising off a coloured body, a "File nn / nn" meta
  line, a ghost index watermark, a copy column (title, tags, lede, link) and a
  framed thumbnail beside it. Styles live in src/styles/file-card.css.

  Layout mode is the caller's call:
    mode="pinned"  /work and /marketing — part of a sticky pile, every card
                   pinning to the same top so the tabs line up in one row.
                   The pile's own script equalises the heights: WorkStackFit,
                   ClientStackFit.
    mode="flow"    Ordinary flow: natural height, one left-anchored tab, no
                   pin. No page uses it at the moment — it is what a card
                   standing on its own, outside a pile, would get.

  Server component — TabLink is the only client piece and only appears when the
  tab is a scroll-to anchor.
*/

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { TabLink } from "@/components/ui/TabLink";

export interface FileCardLink {
    href: string;
    /** Visible label; the arrow is appended. */
    label: string;
    ariaLabel?: string;
    /** Renders a plain anchor with rel/target instead of a next/link. */
    external?: boolean;
}

export interface FileCardProps {
    /** 0-based position in the set — drives the number, tab column and ramp. */
    index: number;
    /** How many cards in the set ("File 01 / 05"). */
    count: number;
    mode: "pinned" | "flow";
    /** Short uppercase label on the tab (a sector on /work). */
    tabLabel: string;
    /** Turns the tab into a scroll-to anchor for the pile; omit for a static tab. */
    tabTarget?: { targetId: string; ariaLabel: string };
    /** Right-hand side of the meta line (a year on /work). Omitted when absent. */
    meta?: string;
    title: string;
    /** Subline segments, joined by the "/" separator. */
    subtitle: readonly string[];
    lede?: string;
    link?: FileCardLink;
    /** Framed preview — a browser window, a phone mockup or a monogram plate. */
    thumb?: ReactNode;
    /** Surface fill, ink and muted ink, from src/lib/caseRamp.ts. */
    colors: { fill: string; ink: string; muted: string };
    id?: string;
    /** Extra custom properties (the pile passes its own z-index). */
    style?: CSSProperties;
}

export function FileCard({
    index,
    count,
    mode,
    tabLabel,
    tabTarget,
    meta,
    title,
    subtitle,
    lede,
    link,
    thumb,
    colors,
    id,
    style,
}: FileCardProps) {
    const no = String(index + 1).padStart(2, "0");
    const total = String(count).padStart(2, "0");

    const tabInner = (
        <>
            <span className="kagu-folder__tab-no">{no}</span>
            <span className="kagu-folder__tab-name">{tabLabel}</span>
        </>
    );

    const arrow = (
        <span className="kagu-folder__arrow" aria-hidden>
            →
        </span>
    );

    return (
        <article
            id={id}
            className={`kagu-folder kagu-folder--${mode}`}
            style={
                {
                    "--i": String(index),
                    // The tab grid divides by --n, so a lone card still needs 2.
                    "--n": String(Math.max(count, 2)),
                    "--fl": colors.fill,
                    "--ft": colors.ink,
                    "--fm": colors.muted,
                    ...style,
                } as CSSProperties
            }
        >
            {tabTarget ? (
                <TabLink
                    targetId={tabTarget.targetId}
                    className="kagu-folder__tab"
                    ariaLabel={tabTarget.ariaLabel}
                >
                    {tabInner}
                </TabLink>
            ) : (
                <span className="kagu-folder__tab">{tabInner}</span>
            )}

            <div className="kagu-folder__body">
                <span className="kagu-folder__ghost" aria-hidden>
                    {no}
                </span>
                <div className="kagu-folder__meta">
                    <span>
                        File {no} / {total}
                    </span>
                    {meta ? <span>{meta}</span> : null}
                </div>
                <div className="kagu-folder__main">
                    <div className="kagu-folder__copy">
                        <h2 className="kagu-folder__title display">{title}</h2>
                        <p className="kagu-folder__sub">
                            {subtitle.map((part, i) => (
                                <span key={`${i}-${part}`}>
                                    {i > 0 ? (
                                        <span className="kagu-folder__sep">/</span>
                                    ) : null}
                                    {part}
                                </span>
                            ))}
                        </p>
                        {lede ? <p className="kagu-folder__lede">{lede}</p> : null}
                        {link ? (
                            link.external ? (
                                <a
                                    href={link.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="kagu-folder__view"
                                    aria-label={link.ariaLabel}
                                >
                                    {link.label}
                                    {arrow}
                                </a>
                            ) : (
                                <Link
                                    href={link.href}
                                    className="kagu-folder__view"
                                    aria-label={link.ariaLabel}
                                >
                                    {link.label}
                                    {arrow}
                                </Link>
                            )
                        ) : null}
                    </div>
                    {thumb}
                </div>
            </div>
        </article>
    );
}
