/*
  /work — work index, as a stack of file folders.
  Each case is a physical folder that pins on scroll (pure CSS position: sticky).
  Every folder pins to the SAME top, so all the tabs line up on one horizontal
  level; they pack left→right (next to each other) by index rather than spreading
  across the row. Clicking a tab scrolls the page to that folder's natural flow
  position (not its stuck position) so it rises to the front of the stack. The
  pile runs darkest (top) → lightest (bottom)
  through the brand sky accent; ink is picked per folder by WCAG contrast. Each
  folder holds the case copy beside a framed thumbnail (browser window for
  desktop captures, phone mockup for mobile) and a "View file" link. On phones
  the tabs tile across to fit with two-line labels and the browser frame narrows.
*/

import Link from "next/link";
import Image from "next/image";
import { getCases, type Case } from "@/lib/content";
import { TabLink } from "./TabLink";
import { WorkStackFit } from "./WorkStackFit";

export const metadata = {
    title: "Work · Kagu",
    description: "Selected work from Kagu Software.",
};

/* ----------------------- dark→light colour ramp ----------------------- */

const NAVY = "#0a1a3f"; // darkest folder (top of the pile)
const SKY = "#1f8fe0"; // brand accent (ramp midpoint)
const LIGHT = "#d9ecfc"; // lightest folder (bottom)
const DARK_INK = "#091633"; // tinted navy ink (never pure black)
const LIGHT_INK = "#eef5ff"; // tinted off-white ink (never pure white)

function hexToRgb(hex: string): [number, number, number] {
    const h = hex.replace("#", "");
    return [
        parseInt(h.slice(0, 2), 16),
        parseInt(h.slice(2, 4), 16),
        parseInt(h.slice(4, 6), 16),
    ];
}
function toHex(v: number) {
    return Math.max(0, Math.min(255, Math.round(v)))
        .toString(16)
        .padStart(2, "0");
}
function mix(a: string, b: string, t: number) {
    const A = hexToRgb(a);
    const B = hexToRgb(b);
    return `#${toHex(A[0] + (B[0] - A[0]) * t)}${toHex(
        A[1] + (B[1] - A[1]) * t
    )}${toHex(A[2] + (B[2] - A[2]) * t)}`;
}
function rgba(hex: string, a: number) {
    const [r, g, b] = hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
}
// Piecewise so the midpoint lands on the brand sky rather than a muddy blend.
function rampColor(t: number) {
    return t < 0.5 ? mix(NAVY, SKY, t / 0.5) : mix(SKY, LIGHT, (t - 0.5) / 0.5);
}
// WCAG relative luminance + contrast, so ink is chosen for legibility, not a guess.
function relLum(hex: string) {
    const lin = hexToRgb(hex).map((v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}
function contrast(a: string, b: string) {
    const hi = Math.max(relLum(a), relLum(b));
    const lo = Math.min(relLum(a), relLum(b));
    return (hi + 0.05) / (lo + 0.05);
}

/* --------------------------- framed thumbnail --------------------------- */

function Thumb({ c }: { c: Case }) {
    if (!c.thumbnail) return null;
    const alt = `${c.client} preview`;

    if (c.device === "mobile") {
        return (
            <div className="kagu-thumb kagu-thumb--phone">
                <div className="kagu-phone">
                    <div className="kagu-phone__body">
                        <span className="kagu-phone__island" aria-hidden />
                        <div className="kagu-phone__screen">
                            <Image
                                src={c.thumbnail}
                                alt={alt}
                                fill
                                sizes="(max-width: 760px) 50vw, 200px"
                                style={{ objectFit: "cover", objectPosition: "top center" }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const url = (c.url || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
    return (
        <div className="kagu-thumb kagu-thumb--browser">
            <figure className="kagu-win">
                <div className="kagu-win__bar" aria-hidden>
                    <span className="kagu-win__dots">
                        <i />
                        <i />
                        <i />
                    </span>
                    <span className="kagu-win__url">{url || c.client}</span>
                </div>
                <div className="kagu-win__screen">
                    {/* eslint-disable-next-line @next/next/no-img-element -- frame width must follow the screenshot's natural aspect; next/image fill would force a fixed-ratio crop */}
                    <img
                        src={c.thumbnail}
                        alt={alt}
                        loading="lazy"
                        decoding="async"
                    />
                </div>
            </figure>
        </div>
    );
}

export default async function WorkIndexPage() {
    const cases = await getCases();
    const n = cases.length;

    return (
        <div className="kagu-work">
            {/* Header */}
            <div className="w-full max-w-(--container-max) mx-auto px-(--container-x)">
                <header className="kagu-work__header">
                    <span className="eyebrow">Index · {n} projects</span>
                    <h1 className="kagu-work__h1 display">Work, in production.</h1>
                    <p className="kagu-work__intro">
                        A working archive. Every file is a project that shipped;
                        pull one from the stack.
                    </p>
                </header>
            </div>

            {/* Folder stack */}
            <div className="kagu-folders px-(--container-x)">
                {cases.map((c, i) => {
                    // Bias the ramp darker so fewer folders sit in the low-contrast
                    // mid-band; the extremes (navy / light sky) read best.
                    const t = n > 1 ? Math.pow(i / (n - 1), 1.25) : 0;
                    const bg = rampColor(t);
                    const ink =
                        contrast(bg, DARK_INK) >= contrast(bg, LIGHT_INK)
                            ? DARK_INK
                            : LIGHT_INK;
                    const muted = rgba(ink, 0.78);
                    const no = String(i + 1).padStart(2, "0");
                    return (
                        <article
                            key={c.slug}
                            id={`file-${c.slug}`}
                            className="kagu-folder"
                            style={
                                {
                                    "--i": String(i),
                                    "--n": String(Math.max(n, 2)),
                                    "--fl": bg,
                                    "--ft": ink,
                                    "--fm": muted,
                                    zIndex: i + 1,
                                } as React.CSSProperties
                            }
                        >
                            <TabLink
                                targetId={`file-${c.slug}`}
                                className="kagu-folder__tab"
                                ariaLabel={`Jump to file ${no}: ${c.client}`}
                            >
                                <span className="kagu-folder__tab-no">{no}</span>
                                <span className="kagu-folder__tab-name">
                                    {c.sector || c.cover.label}
                                </span>
                            </TabLink>
                            <div className="kagu-folder__body">
                                <span className="kagu-folder__ghost" aria-hidden>
                                    {no}
                                </span>
                                <div className="kagu-folder__meta">
                                    <span>File {no} / {String(n).padStart(2, "0")}</span>
                                    <span>{c.year}</span>
                                </div>
                                <div className="kagu-folder__main">
                                    <div className="kagu-folder__copy">
                                        <h2 className="kagu-folder__title display">
                                            {c.client}
                                        </h2>
                                        <p className="kagu-folder__sub">
                                            {c.project}
                                            <span className="kagu-folder__sep">/</span>
                                            {c.sector}
                                        </p>
                                        {c.lede ? (
                                            <p className="kagu-folder__lede">
                                                {c.lede}
                                            </p>
                                        ) : null}
                                        <Link
                                            href={`/work/${c.slug}`}
                                            className="kagu-folder__view"
                                            aria-label={`View file: ${c.client}`}
                                        >
                                            View file
                                            <span className="kagu-folder__arrow" aria-hidden>
                                                →
                                            </span>
                                        </Link>
                                    </div>
                                    <Thumb c={c} />
                                </div>
                            </div>
                        </article>
                    );
                })}
                {/* Trailing runway: WorkStackFit sizes this at runtime so the
                    page's last scroll position lands exactly on the final
                    folder's pin point. With no scroll left past that, the stack
                    never releases and the aligned pile locks in place. */}
                <div className="kagu-folders__runway" aria-hidden />
            </div>

            {/* Pins the document's max scroll to the moment the pile aligns. */}
            <WorkStackFit />

            <style>{`
                .kagu-work {
                    position: relative;
                    background: var(--paper);
                    padding-top: var(--space-32);
                    /* No bottom padding: it would sit *after* the sticky container
                       and steal room below the pin line, which both blocks the
                       final folder from aligning and lets the pile release. The
                       runway (sized by WorkStackFit) provides the tail instead. */
                    padding-bottom: 0;
                    min-height: 100svh;
                }
                /* faint accent glow behind the masthead for atmosphere */
                .kagu-work::before {
                    content: "";
                    position: absolute;
                    inset: 0 0 auto 0;
                    height: 60vh;
                    background: radial-gradient(120% 70% at 18% 0%,
                        color-mix(in oklab, var(--mint-deep) 16%, transparent) 0%,
                        transparent 60%);
                    pointer-events: none;
                    z-index: 0;
                }
                .kagu-work__header {
                    position: relative;
                    z-index: 1;
                    margin-bottom: var(--space-20);
                }
                .kagu-work__h1 {
                    font-size: clamp(2.25rem, 11vw, 9.875rem);
                    line-height: 0.9;
                    margin-top: var(--space-6);
                    max-width: 12ch;
                }
                .kagu-work__intro {
                    margin-top: var(--space-6);
                    max-width: 42ch;
                    font-size: var(--type-lg);
                    color: var(--slate-ink);
                    line-height: var(--leading-normal);
                }

                .kagu-folders {
                    position: relative;
                    z-index: 1;
                    max-width: 80rem; /* ~7xl */
                    margin: 0 auto;
                }
                .kagu-folder {
                    --stack-top: clamp(7.5rem, 6rem + 3.5vw, 9.5rem);
                    --tab-h: clamp(3rem, 2.6rem + 1vw, 3.6rem);
                    --tab-w: clamp(7rem, 4.5rem + 9vw, 11rem);
                    --tab-step: calc(var(--tab-w) + clamp(0.4rem, 0.2rem + 0.6vw, 0.9rem));
                    --tab-x: clamp(0.4rem, 1.4vw, 1.75rem);
                    --joint: 16px;
                    position: sticky;
                    /* every folder pins to the SAME top, so all the tabs line up on
                       one horizontal level; they pack left→right by index */
                    top: var(--stack-top);
                    /* land here when a tab anchor is clicked */
                    scroll-margin-top: var(--stack-top);
                    margin-top: var(--tab-h);
                    isolation: isolate;
                    transition: transform 0.34s var(--ease-out-quint);
                }
                /* 100px of breathing room between files while they're laid out in
                   flow (before they scroll up and stack into the pile) */
                .kagu-folder + .kagu-folder {
                    margin-top: calc(var(--tab-h) + 100px);
                }
                .kagu-folders__runway { height: 0; }

                .kagu-folder__body {
                    position: relative;
                    overflow: hidden;
                    background: var(--fl);
                    color: var(--ft);
                    border-radius: clamp(16px, 1.4vw, 26px) clamp(16px, 1.4vw, 26px) 0 0;
                    /* Fit each card within the viewport below its pin line, so the
                       whole case shows on any screen instead of running off the
                       bottom. Floor keeps it generous on tall screens; the cap
                       (--fit-h) clamps it on short ones. --stack-top is inherited
                       from .kagu-folder. */
                    --fit-gap: clamp(0.75rem, 0.4rem + 1.4vw, 1.75rem);
                    --fit-h: calc(100svh - var(--stack-top) - var(--fit-gap));
                    min-height: min(clamp(20rem, 14rem + 26vh, 40rem), var(--fit-h));
                    max-height: var(--fit-h);
                    padding: clamp(1.5rem, 0.9rem + 2.6vw, 3.5rem);
                    display: flex;
                    flex-direction: column;
                    box-shadow:
                        inset 0 1px 0 rgba(255, 255, 255, 0.18),
                        0 -14px 26px -18px rgba(0, 0, 0, 0.55),
                        0 30px 64px -46px rgba(0, 0, 0, 0.7);
                }
                .kagu-folder__body::before {
                    content: "";
                    position: absolute;
                    inset: 0;
                    border-radius: inherit;
                    pointer-events: none;
                    background:
                        linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0) 18%),
                        linear-gradient(0deg, rgba(0, 0, 0, 0.16), rgba(0, 0, 0, 0) 26%);
                }

                /* Folder tab — two narrow lines, rising above the body with
                   concave fillet joints. Distributed across the row by index. */
                .kagu-folder__tab {
                    position: absolute;
                    bottom: calc(100% - 1px);
                    left: calc(var(--tab-x) + var(--i) * var(--tab-step));
                    width: var(--tab-w);
                    min-height: var(--tab-h);
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    gap: 0.1em;
                    padding: 0.35em clamp(0.85rem, 0.5rem + 0.8vw, 1.35rem);
                    background:
                        linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0) 70%),
                        var(--fl);
                    color: var(--ft);
                    border-radius: clamp(12px, 1vw, 18px) clamp(12px, 1vw, 18px) 0 0;
                    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16);
                    font-family: var(--font-mono);
                    line-height: 1.05;
                    text-decoration: none;
                    cursor: pointer;
                    transition:
                        transform 0.24s var(--ease-out-quint),
                        box-shadow 0.24s var(--ease-out-quint);
                }
                .kagu-folder__tab:focus-visible {
                    outline: 2px solid var(--ft);
                    outline-offset: 2px;
                }
                .kagu-folder__tab-no {
                    font-size: var(--type-xs);
                    letter-spacing: var(--tracking-eyebrow);
                    opacity: 0.62;
                }
                .kagu-folder__tab-name {
                    font-size: var(--type-sm);
                    letter-spacing: 0.04em;
                    text-transform: uppercase;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .kagu-folder__tab::before,
                .kagu-folder__tab::after {
                    content: "";
                    position: absolute;
                    bottom: 0;
                    width: var(--joint);
                    height: var(--joint);
                    background: var(--fl);
                }
                .kagu-folder__tab::before {
                    left: calc(-1 * var(--joint));
                    -webkit-mask: radial-gradient(circle var(--joint) at top left, #0000 99%, #000 100%);
                            mask: radial-gradient(circle var(--joint) at top left, #0000 99%, #000 100%);
                }
                .kagu-folder__tab::after {
                    right: calc(-1 * var(--joint));
                    -webkit-mask: radial-gradient(circle var(--joint) at top right, #0000 99%, #000 100%);
                            mask: radial-gradient(circle var(--joint) at top right, #0000 99%, #000 100%);
                }

                .kagu-folder__ghost {
                    position: absolute;
                    top: -0.18em;
                    left: clamp(0.5rem, 1.5vw, 2rem);
                    font-family: var(--font-display);
                    font-size: clamp(9rem, 24vw, 21rem);
                    line-height: 1;
                    font-weight: 600;
                    letter-spacing: -0.05em;
                    color: var(--ft);
                    opacity: 0.05;
                    pointer-events: none;
                    user-select: none;
                }
                .kagu-folder__meta {
                    position: relative;
                    display: flex;
                    justify-content: space-between;
                    font-family: var(--font-mono);
                    font-size: var(--type-xs);
                    letter-spacing: var(--tracking-eyebrow);
                    text-transform: uppercase;
                    opacity: 0.8;
                }
                .kagu-folder__main {
                    position: relative;
                    margin-top: auto;
                    min-height: 0; /* allow the row to shrink inside a capped body */
                    display: flex;
                    gap: clamp(1.5rem, 4vw, 3.25rem);
                    align-items: flex-end;
                }
                .kagu-folder__copy {
                    flex: 1 1 auto;
                    min-width: 0;
                }
                .kagu-folder__title {
                    color: var(--ft);
                    font-size: clamp(2.5rem, 1.4rem + 4.4vw, 5.75rem);
                    line-height: 0.92;
                    letter-spacing: var(--tracking-display);
                }
                .kagu-folder__sub {
                    margin-top: var(--space-4);
                    font-size: var(--type-lg);
                    font-weight: 500;
                }
                .kagu-folder__sep {
                    margin: 0 0.6em;
                    opacity: 0.5;
                }
                .kagu-folder__lede {
                    margin-top: var(--space-4);
                    max-width: 48ch;
                    font-size: var(--type-base);
                    color: var(--fm);
                    line-height: var(--leading-normal);
                    display: -webkit-box;
                    -webkit-box-orient: vertical;
                    -webkit-line-clamp: 3;
                    overflow: hidden;
                }
                .kagu-folder__view {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.6em;
                    min-height: 2.75rem;
                    margin-top: var(--space-8);
                    padding: 0.6em 1.5em;
                    border: 1px solid color-mix(in oklab, var(--ft) 42%, transparent);
                    border-radius: 999px;
                    color: var(--ft);
                    font-family: var(--font-mono);
                    font-size: var(--type-sm);
                    letter-spacing: 0.04em;
                    text-transform: uppercase;
                    transition:
                        background 0.28s var(--ease-out-quint),
                        color 0.28s var(--ease-out-quint),
                        border-color 0.28s var(--ease-out-quint);
                }
                .kagu-folder__view:focus-visible {
                    outline: 2px solid var(--ft);
                    outline-offset: 3px;
                }
                .kagu-folder__arrow {
                    transition: transform 0.28s var(--ease-out-quint);
                }

                /* ---- framed thumbnails ---- */
                .kagu-thumb {
                    flex: 0 1 auto;
                    min-width: 0;
                }
                .kagu-thumb--browser {
                    display: flex;
                    justify-content: flex-end;
                }
                /* Browser window sizes to the screenshot's natural aspect ratio. */
                .kagu-win {
                    width: fit-content;
                    max-width: min(44rem, 100%);
                    margin: 0;
                    border-radius: clamp(10px, 1vw, 15px);
                    overflow: hidden;
                    background: #0e1116;
                    box-shadow:
                        0 34px 60px -28px rgba(0, 0, 0, 0.6),
                        0 0 0 1px rgba(255, 255, 255, 0.07);
                }
                .kagu-win__bar {
                    display: flex;
                    align-items: center;
                    gap: 0.45rem;
                    padding: 0.36rem 0.7rem;
                }
                .kagu-win__dots {
                    display: flex;
                    gap: 0.3rem;
                    flex: none;
                }
                .kagu-win__dots i {
                    width: 0.46rem;
                    height: 0.46rem;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.24);
                }
                .kagu-win__url {
                    flex: 1;
                    min-width: 0;
                    max-width: 20ch;
                    margin-right: 1.8rem;
                    padding: 0.18rem 0.6rem;
                    border-radius: 0.35rem;
                    background: rgba(255, 255, 255, 0.07);
                    font-family: var(--font-mono);
                    font-size: 0.66rem;
                    letter-spacing: 0.03em;
                    color: rgba(255, 255, 255, 0.55);
                    text-align: center;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .kagu-win__screen {
                    display: block;
                    line-height: 0;
                }
                .kagu-win__screen img {
                    display: block;
                    width: auto;
                    height: auto;
                    max-width: 100%;
                    max-height: clamp(16rem, 32vh, 28rem);
                }
                /* phone mockup — container on .kagu-phone, cqw styling on __body */
                .kagu-thumb--phone {
                    display: flex;
                    justify-content: center;
                }
                .kagu-phone {
                    container-type: inline-size;
                    /* Height-driven so the tall portrait mockup shrinks to fit a
                       capped card on short screens; width follows the aspect. */
                    height: clamp(11rem, 34svh, 22rem);
                    aspect-ratio: 9 / 19.5;
                    width: auto;
                    flex: 0 0 auto;
                }
                .kagu-phone__body {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    background: #0e0f13;
                    border-radius: 11cqw;
                    padding: 2.6cqw;
                    box-shadow:
                        0 34px 60px -22px rgba(0, 0, 0, 0.6),
                        0 0 0 1px rgba(255, 255, 255, 0.08);
                }
                .kagu-phone__screen {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    border-radius: 8cqw;
                    overflow: hidden;
                    background: #050608;
                }
                .kagu-phone__island {
                    position: absolute;
                    top: 4.6cqw;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 26%;
                    height: 6.5cqw;
                    border-radius: 4cqw;
                    background: #0e0f13;
                    z-index: 2;
                }

                /* Narrow screens: a row of tabs can't fit, so staircase them and
                   stack the preview above the copy. */
                @media (max-width: 760px) {
                    /* Pre-hydration / no-JS fallback only — once WorkStackFit runs
                       it sets the runway inline so the page's max scroll lands
                       exactly on the last folder's pin and the stack can't release.
                       Tall mobile bodies make that release especially violent, so
                       this keeps a reasonable tail before the script takes over. */
                    .kagu-folders__runway { height: clamp(20rem, 65svh, 40rem); }
                    /* tabs share one level here too — tile them across to fit,
                       labels wrap to two lines */
                    .kagu-folder__tab {
                        width: calc(97% / var(--n) - 0.35rem);
                        min-width: 0;
                        left: calc(1.5% + var(--i) * (97% / var(--n)));
                        padding-inline: clamp(0.3rem, 1.4vw, 0.7rem);
                        gap: 0.05em;
                    }
                    .kagu-folder__tab-no { font-size: 0.6rem; }
                    .kagu-folder__tab-name {
                        font-size: clamp(0.58rem, 2.7vw, 0.78rem);
                        letter-spacing: 0.01em;
                        white-space: normal;
                        display: -webkit-box;
                        -webkit-line-clamp: 2;
                        -webkit-box-orient: vertical;
                    }
                    .kagu-folder__main {
                        flex-direction: column;
                        align-items: stretch;
                    }
                    .kagu-thumb {
                        flex: none;
                        width: 100%;
                        margin-top: var(--space-8);
                        order: -1;
                    }
                    .kagu-thumb--browser { justify-content: center; }
                    /* slimmer browser frame so it doesn't dominate the stack */
                    .kagu-win {
                        margin-inline: auto;
                        max-width: min(20rem, 74%);
                    }
                    .kagu-win__screen img { max-height: clamp(11rem, 30vh, 16rem); }
                }

                /* Short viewports: trim the card's vertical content so the whole
                   case still fits between the pin line and the bottom of screen
                   (the body is already capped to the viewport via --fit-h). */
                @media (max-height: 760px) {
                    .kagu-folder__lede {
                        -webkit-line-clamp: 2;
                        margin-top: var(--space-2);
                    }
                    .kagu-folder__view { margin-top: var(--space-4); }
                    .kagu-win__screen img { max-height: clamp(9rem, 24vh, 14rem); }
                    .kagu-phone { height: clamp(9rem, 26svh, 14rem); }
                    .kagu-thumb { margin-top: var(--space-4); }
                }
                @media (max-height: 600px) {
                    .kagu-folder__lede { display: none; }
                    .kagu-folder__sub {
                        margin-top: var(--space-2);
                        font-size: var(--type-base);
                    }
                    .kagu-folder__title {
                        font-size: clamp(1.6rem, 1rem + 3.5vw, 3rem);
                    }
                    .kagu-folder__view { margin-top: var(--space-2); }
                    .kagu-win__screen img { max-height: clamp(6rem, 32svh, 11rem); }
                    .kagu-phone { height: clamp(6rem, 40svh, 11rem); }
                    /* Short screens are almost always landscape: keep copy and
                       thumbnail side-by-side (the stacked phone layout would push
                       the title and link off the bottom of such a shallow card). */
                    .kagu-folder__main {
                        flex-direction: row;
                        align-items: flex-end;
                        gap: clamp(1rem, 3vw, 2.5rem);
                    }
                    .kagu-thumb {
                        order: 0;
                        width: auto;
                        margin-top: 0;
                        flex: 0 1 auto;
                    }
                    .kagu-thumb--browser { justify-content: flex-end; }
                    .kagu-win { margin-inline: 0; max-width: min(28rem, 50%); }
                }

                /* anchor jumps from the tabs ease into place */
                @media (prefers-reduced-motion: no-preference) {
                    html { scroll-behavior: smooth; }
                }

                /* Hover only on real pointers, so touch can't get stuck in :hover. */
                @media (hover: hover) {
                    .kagu-folder:hover {
                        transform: translateY(-10px);
                        z-index: 999;
                    }
                    .kagu-folder__tab:hover {
                        transform: translateY(-3px);
                        box-shadow:
                            inset 0 1px 0 rgba(255, 255, 255, 0.22),
                            0 -8px 18px -12px rgba(0, 0, 0, 0.6);
                    }
                    .kagu-folder__view:hover {
                        background: var(--ft);
                        border-color: var(--ft);
                        color: var(--fl);
                    }
                    .kagu-folder__view:hover .kagu-folder__arrow {
                        transform: translateX(0.35em);
                    }
                }

                @media (prefers-reduced-motion: reduce) {
                    .kagu-folder {
                        position: relative;
                        top: auto;
                        transition: none;
                    }
                    .kagu-folder:hover { transform: none; }
                    .kagu-folder__arrow { transition: none; }
                }
            `}</style>
        </div>
    );
}
