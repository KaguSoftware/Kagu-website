/*
  /work — work index, as a stack of file folders.
  Each case is a physical folder that pins on scroll (pure CSS position: sticky)
  and piles up so every tab stays readable. The pile runs darkest (top) → lightest
  (bottom) through the brand sky accent; ink is picked per folder by WCAG contrast.
  Each folder holds the case copy beside a framed thumbnail (browser window for
  desktop captures, phone mockup for mobile ones) and a "View file" link.
*/

import Link from "next/link";
import Image from "next/image";
import { getCases, type Case } from "@/lib/content";

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
                    <span className="kagu-phone__island" aria-hidden />
                    <div className="kagu-phone__screen">
                        <Image
                            src={c.thumbnail}
                            alt={alt}
                            fill
                            sizes="(max-width: 760px) 60vw, 240px"
                            style={{ objectFit: "cover", objectPosition: "top center" }}
                        />
                    </div>
                </div>
            </div>
        );
    }

    const url = (c.url || "").replace(/^https?:\/\//, "").replace(/\/$/, "");
    return (
        <div className="kagu-thumb kagu-thumb--browser">
            <div className="kagu-win">
                <div className="kagu-win__bar" aria-hidden>
                    <span className="kagu-win__dots">
                        <i />
                        <i />
                        <i />
                    </span>
                    <span className="kagu-win__url">{url || c.client}</span>
                </div>
                <div className="kagu-win__screen">
                    <Image
                        src={c.thumbnail}
                        alt={alt}
                        fill
                        sizes="(max-width: 760px) 100vw, 460px"
                        style={{ objectFit: "cover", objectPosition: "top center" }}
                    />
                </div>
            </div>
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
                    const hasThumb = !!c.thumbnail;
                    return (
                        <article
                            key={c.slug}
                            className="kagu-folder"
                            data-pos={String(i % 4)}
                            data-thumb={hasThumb ? "1" : "0"}
                            style={
                                {
                                    "--i": String(i),
                                    "--fl": bg,
                                    "--ft": ink,
                                    "--fm": muted,
                                    zIndex: i + 1,
                                } as React.CSSProperties
                            }
                        >
                            <span className="kagu-folder__tab">
                                <span className="kagu-folder__tab-dot" aria-hidden />
                                {c.sector || c.cover.label}
                            </span>
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
            </div>

            <style>{`
                .kagu-work {
                    position: relative;
                    background: var(--paper);
                    padding-top: var(--space-32);
                    padding-bottom: var(--section-y);
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
                    --stack-top: clamp(6.5rem, 5.5rem + 3vw, 8.5rem);
                    --reveal: clamp(3rem, 2.6rem + 1.2vw, 3.75rem);
                    --tab-h: clamp(2.5rem, 2.2rem + 1vw, 3rem);
                    --joint: 16px;
                    position: sticky;
                    top: calc(var(--stack-top) + var(--i) * var(--reveal));
                    margin-top: var(--tab-h);
                    isolation: isolate;
                    transition: transform 0.34s var(--ease-out-quint);
                }

                .kagu-folder__body {
                    position: relative;
                    overflow: hidden;
                    background: var(--fl);
                    color: var(--ft);
                    border-radius: clamp(16px, 1.4vw, 26px) clamp(16px, 1.4vw, 26px) 0 0;
                    min-height: clamp(26rem, 18rem + 32vh, 44rem);
                    padding: clamp(1.75rem, 1rem + 3vw, 3.5rem);
                    display: flex;
                    flex-direction: column;
                    /* lit top edge + seam shadow up onto the folder behind + ambient */
                    box-shadow:
                        inset 0 1px 0 rgba(255, 255, 255, 0.18),
                        0 -14px 26px -18px rgba(0, 0, 0, 0.55),
                        0 30px 64px -46px rgba(0, 0, 0, 0.7);
                }
                /* paper light: white sheen down from the top, grounded shade at base */
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

                /* Folder tab — rises above the body with concave fillet joints. */
                .kagu-folder__tab {
                    position: absolute;
                    bottom: calc(100% - 1px);
                    left: 5%;
                    height: var(--tab-h);
                    max-width: min(62vw, 18rem);
                    display: inline-flex;
                    align-items: center;
                    gap: 0.6em;
                    padding: 0 clamp(1rem, 0.6rem + 1vw, 1.7rem);
                    background:
                        linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0) 70%),
                        var(--fl);
                    color: var(--ft);
                    border-radius: clamp(12px, 1vw, 18px) clamp(12px, 1vw, 18px) 0 0;
                    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.16);
                    font-family: var(--font-mono);
                    font-size: var(--type-sm);
                    letter-spacing: 0.06em;
                    text-transform: uppercase;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                /* cycle tab x so adjacent tabs in the pile never line up */
                .kagu-folder[data-pos="1"] .kagu-folder__tab { left: 30%; }
                .kagu-folder[data-pos="2"] .kagu-folder__tab { left: 53%; }
                .kagu-folder[data-pos="3"] .kagu-folder__tab { left: 74%; }
                @media (max-width: 680px) {
                    .kagu-folder[data-pos="2"] .kagu-folder__tab { left: 38%; }
                    .kagu-folder[data-pos="3"] .kagu-folder__tab { left: 50%; }
                }
                .kagu-folder__tab-dot {
                    flex: none;
                    width: 0.5em;
                    height: 0.5em;
                    border-radius: 999px;
                    background: currentColor;
                    opacity: 0.55;
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
                /* copy beside thumbnail, both pinned to the folder's lower edge */
                .kagu-folder__main {
                    position: relative;
                    margin-top: auto;
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
                    min-height: 2.75rem; /* 44px touch target */
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
                    flex: 0 0 clamp(15rem, 40%, 28rem);
                    min-width: 0;
                }
                .kagu-win {
                    container-type: inline-size;
                    border-radius: clamp(10px, 1vw, 16px);
                    overflow: hidden;
                    background: #0e1116;
                    box-shadow:
                        0 34px 60px -28px rgba(0, 0, 0, 0.6),
                        0 0 0 1px rgba(255, 255, 255, 0.07);
                }
                .kagu-win__bar {
                    display: flex;
                    align-items: center;
                    gap: 1.3cqw;
                    padding: 1.5cqw 1.9cqw;
                }
                .kagu-win__dots {
                    display: flex;
                    gap: 0.8cqw;
                    flex: none;
                }
                .kagu-win__dots i {
                    width: 1cqw;
                    height: 1cqw;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.24);
                }
                .kagu-win__url {
                    flex: 1;
                    margin-right: 5cqw; /* balance the dots so the url reads centred */
                    padding: 0.6cqw 1.4cqw;
                    border-radius: 0.7cqw;
                    background: rgba(255, 255, 255, 0.07);
                    font-family: var(--font-mono);
                    font-size: 1.6cqw;
                    letter-spacing: 0.03em;
                    color: rgba(255, 255, 255, 0.55);
                    text-align: center;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .kagu-win__screen {
                    position: relative;
                    aspect-ratio: 16 / 10;
                    background: #0e1116;
                }
                /* phone mockup */
                .kagu-thumb--phone {
                    display: flex;
                    justify-content: center;
                }
                .kagu-phone {
                    container-type: inline-size;
                    position: relative;
                    width: 100%;
                    max-width: 14rem;
                    aspect-ratio: 9 / 19.5;
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
                    top: 4.4cqw;
                    left: 50%;
                    transform: translateX(-50%);
                    width: 26%;
                    height: 7cqw;
                    border-radius: 4cqw;
                    background: #0e0f13;
                    z-index: 2;
                }

                @media (max-width: 760px) {
                    .kagu-folder__main {
                        flex-direction: column;
                        align-items: stretch;
                    }
                    .kagu-thumb {
                        flex: none;
                        width: 100%;
                        margin-top: var(--space-8);
                        order: -1; /* preview leads on narrow screens */
                    }
                    .kagu-thumb--phone .kagu-phone { max-width: 12rem; }
                }

                /* Hover only on real pointers, so touch can't get stuck in :hover. */
                @media (hover: hover) {
                    .kagu-folder:hover {
                        transform: translateY(-10px);
                        z-index: 999;
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
