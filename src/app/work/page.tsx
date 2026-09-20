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

import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getCases, type Case } from "@/lib/content";
import { publicImageSize } from "@/lib/imageSize";
import { rampColor, inkFor, rgba } from "@/lib/caseRamp";
import { pageMetadata, webPageJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { FileCard } from "@/components/cases/FileCard";
import { WorkStackFit } from "./WorkStackFit";

const TITLE = "Work — Software Built for Boutique Operators · Kagu";
const DESCRIPTION =
    "Shipped projects from Kagu: custom websites, admin systems and full-stack platforms for boutique operators in hospitality and service — all in production.";

export const metadata: Metadata = pageMetadata({
    title: TITLE,
    description: DESCRIPTION,
    path: "/work",
    lang: "en",
});

// Static + hourly ISR; admin edits bust this instantly via revalidatePublic().
export const revalidate = 3600;

/* --------------------------- framed thumbnail --------------------------- */

async function Thumb({ c }: { c: Case }) {
    if (!c.thumbnail) return null;
    const alt = c.thumbnailAlt ?? `${c.client} preview`;

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
    // Local /public screenshots: probe the intrinsic size so next/image can
    // keep the natural aspect (width/height props + auto sizing) while the
    // optimizer serves a resized WebP/AVIF instead of the raw PNG.
    const dims = await publicImageSize(c.thumbnail);
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
                    {dims ? (
                        <Image
                            src={c.thumbnail}
                            alt={alt}
                            width={dims.width}
                            height={dims.height}
                            sizes="(max-width: 760px) 74vw, 44rem"
                            loading="lazy"
                            style={{ width: "auto", height: "auto" }}
                        />
                    ) : (
                        // eslint-disable-next-line @next/next/no-img-element -- remote thumbnail with unknown dimensions; frame width must follow the screenshot's natural aspect
                        <img
                            src={c.thumbnail}
                            alt={alt}
                            loading="lazy"
                            decoding="async"
                        />
                    )}
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
            <JsonLd
                data={webPageJsonLd({
                    title: TITLE,
                    description: DESCRIPTION,
                    path: "/work",
                    lang: "en",
                })}
            />
            {/* Header */}
            <div className="w-full max-w-(--container-max) mx-auto px-(--container-x)">
                <header className="kagu-work__header">
                    <span className="eyebrow">Index · {n} projects</span>
                    <h1 className="kagu-work__h1 display">Work, in production.</h1>
                    <p className="kagu-work__intro">
                        A working archive. Every file is a project that shipped;
                        pull one from the stack.
                    </p>
                    <p className="kagu-work__intro">
                        Each project here is custom-built software for a boutique
                        operator in hospitality or services: a customer-facing
                        website and an operator-facing admin, built against the
                        same database and running in production. The stack is
                        Next.js and Supabase, and every build ships with the
                        languages the operator&apos;s customers actually speak.
                        If you want the same for your own operation, see{" "}
                        <Link href="/custom-website-pricing" className="kagu-work__intro-link">
                            custom website pricing
                        </Link>
                        , read how our{" "}
                        <Link href="/admin-systems" className="kagu-work__intro-link">
                            admin systems for boutique operators
                        </Link>{" "}
                        work, or{" "}
                        <Link href="/start-project" className="kagu-work__intro-link">
                            start a project
                        </Link>{" "}
                        and get an instant estimate.
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
                    const ink = inkFor(bg);
                    const muted = rgba(ink, 0.78);
                    return (
                        <FileCard
                            key={c.slug}
                            id={`file-${c.slug}`}
                            index={i}
                            count={n}
                            mode="pinned"
                            tabLabel={c.sector || c.cover.label}
                            tabTarget={{
                                targetId: `file-${c.slug}`,
                                ariaLabel: `Jump to file ${String(i + 1).padStart(2, "0")}: ${c.client}`,
                            }}
                            meta={c.year}
                            title={c.client}
                            subtitle={[c.project, c.sector]}
                            lede={c.lede}
                            link={{
                                href: `/work/${c.slug}`,
                                label: "View file",
                                ariaLabel: `View file: ${c.client}`,
                            }}
                            thumb={<Thumb c={c} />}
                            colors={{ fill: bg, ink: ink, muted: muted }}
                            style={{ zIndex: i + 1 }}
                        />
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
                .kagu-work__intro + .kagu-work__intro {
                    margin-top: var(--space-4);
                    max-width: 58ch;
                    font-size: var(--type-base);
                }
                .kagu-work__intro-link {
                    color: var(--mint-text);
                    border-bottom: 1px solid var(--mint-text);
                }

                .kagu-folders {
                    position: relative;
                    z-index: 1;
                    max-width: 80rem; /* ~7xl */
                    margin: 0 auto;
                }
                /* Everything about the card itself — the tab grid, the sticky
                   geometry, the inter-card spacing, the short-viewport trims and
                   the reduced-motion fallback — lives in src/styles/file-card.css
                   and is shared with /marketing's client pile. What stays here is
                   this page's own pile: the container and the runway. */
                .kagu-folders__runway { height: 0; }

                @media (max-width: 760px) {
                    /* Pre-hydration / no-JS fallback only — once WorkStackFit runs
                       it sets the runway inline so the page's max scroll lands
                       exactly on the last folder's pin and the stack can't release.
                       Tall mobile bodies make that release especially violent, so
                       this keeps a reasonable tail before the script takes over. */
                    .kagu-folders__runway { height: clamp(20rem, 65svh, 40rem); }
                }

                /* anchor jumps from the tabs ease into place */
                @media (prefers-reduced-motion: no-preference) {
                    html { scroll-behavior: smooth; }
                }
            `}</style>
        </div>
    );
}
