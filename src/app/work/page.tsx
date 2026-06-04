/*
  /work — work index.
  Full grid of all cases. Asymmetric, hairlines, mono-led.
  Reuses Case cover treatment from SelectedWorkSection but in denser grid form.
*/

import Link from "next/link";
import Image from "next/image";
import { getCases } from "@/lib/content";
import { ViewTransition } from "@/lib/view-transition";
import { MaskSweep, type SweepDirection } from "@/components/motion/MaskSweep";
import { CursorTrailPreview } from "@/components/motion/CursorTrailPreview";
import { CaseCover } from "@/components/cases/CaseCover";

const COVER_BG: Record<string, string> = {
    "mint-pale": "var(--mint-pale)",
    "mint-soft": "var(--mint-soft)",
    "mint-deep": "var(--mint-deep)",
    "slate-ink": "var(--slate-ink)",
    paper: "var(--paper)",
};

export const metadata = {
    title: "Work · Kagu",
    description: "Selected work from Kagu Software.",
};

export default async function WorkIndexPage() {
    const cases = await getCases();
    const previews = cases.map((c) => ({
        slug: c.slug,
        bg: c.cover.bg,
        label: c.cover.label,
    }));

    return (
        <div
            style={{ background: "var(--paper)" }}
            className="px-(--container-x) pt-(--space-32) pb-(--section-y) min-h-dvh"
        >
            <div className="w-full max-w-(--container-max) mx-auto">
                {/* Header */}
                <header className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-(--space-32) items-end">
                    <div className="md:col-span-9">
                        <span className="eyebrow">
                            Index · {cases.length} projects
                        </span>
                        <h1
                            className="display"
                            style={{
                                fontSize: "var(--type-7xl)",
                                lineHeight: 0.9,
                                marginTop: "var(--space-6)",
                                maxWidth: "12ch",
                            }}
                        >
                            Work, in production.
                        </h1>
                    </div>
                </header>

                {/* Grid */}
                <CursorTrailPreview previews={previews}>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-x-8 gap-y-(--space-32)">
                        {cases.map((c, i) => {
                            const slot = i % 3;
                            // Phone-device cases float the phone mockup (no
                            // bordered card box) like the homepage; desktop cases
                            // keep the framed cover. Every case still uses the same
                            // slot-based landscape footprint so rows stay even.
                            const isPhoneCard =
                                c.device === "mobile" && !!c.thumbnail;
                            const isWide = slot === 0;
                            const colClass =
                                slot === 0
                                    ? "md:col-span-8"
                                    : slot === 1
                                    ? "md:col-span-5 md:col-start-1"
                                    : "md:col-span-6 md:col-start-7";
                            const offset =
                                slot === 1 ? "md:mt-(--space-16)" : "";
                            const aspect = isWide ? "16 / 10" : "4 / 5";
                            // Wide cards: top sweep (arrival). Others alternate L/R.
                            const sweepDir: SweepDirection = isWide
                                ? "top"
                                : i % 2 === 0
                                ? "right"
                                : "left";
                            return (
                                <article
                                    key={c.slug}
                                    className={`${colClass} ${offset}`}
                                >
                                    <Link
                                        href={`/work/${c.slug}`}
                                        data-cursor="view"
                                        data-trail-preview={c.slug}
                                        className="group block"
                                    >
                                        <div
                                            className="relative"
                                            style={{
                                                aspectRatio: aspect,
                                                // Phone cards float (no box/border)
                                                // so the bezel shadow shows; desktop
                                                // cards keep the framed cover.
                                                background: isPhoneCard
                                                    ? "transparent"
                                                    : COVER_BG[c.cover.bg] ??
                                                      "var(--paper)",
                                                overflow: isPhoneCard
                                                    ? "visible"
                                                    : "hidden",
                                                border: isPhoneCard
                                                    ? "none"
                                                    : "1px solid var(--neutral)",
                                            }}
                                        >
                                            <MaskSweep
                                                direction={sweepDir}
                                                className="absolute inset-0"
                                            >
                                                <ViewTransition
                                                    name={`work-${c.slug}-cover`}
                                                >
                                                    {c.thumbnail &&
                                                    c.device === "mobile" ? (
                                                        // Phone frame for mobile-device cases — matches the
                                                        // homepage / case-page CaseReel treatment.
                                                        <div
                                                            style={{
                                                                position:
                                                                    "absolute",
                                                                inset: 0,
                                                                background:
                                                                    "transparent",
                                                                display: "flex",
                                                                alignItems:
                                                                    "center",
                                                                justifyContent:
                                                                    "center",
                                                            }}
                                                        >
                                                            <div
                                                                style={{
                                                                    position:
                                                                        "relative",
                                                                    // Smaller than the card so it reads like the
                                                                    // homepage phone and the bezel shadow has room
                                                                    // to show (the card no longer clips it).
                                                                    height: "84%",
                                                                    aspectRatio:
                                                                        "9 / 19.5",
                                                                    // Fixed near-black phone bezel — not a theme
                                                                    // token, so it never inverts with the palette.
                                                                    background:
                                                                        "#0e0f13",
                                                                    borderRadius:
                                                                        "clamp(24px, 3vw, 38px)",
                                                                    padding:
                                                                        "clamp(6px, 0.7vw, 10px)",
                                                                    boxShadow:
                                                                        "0 30px 60px -20px rgba(0,0,0,0.55), 0 0 0 1px color-mix(in oklab, var(--ink) 14%, transparent)",
                                                                }}
                                                            >
                                                                <div
                                                                    style={{
                                                                        position:
                                                                            "relative",
                                                                        width: "100%",
                                                                        height: "100%",
                                                                        borderRadius:
                                                                            "clamp(18px, 2.4vw, 30px)",
                                                                        overflow:
                                                                            "hidden",
                                                                        background:
                                                                            "var(--mint-pale)",
                                                                    }}
                                                                >
                                                                    <div
                                                                        style={{
                                                                            position:
                                                                                "absolute",
                                                                            top: 31,
                                                                            left: 0,
                                                                            right: 0,
                                                                            bottom: 0,
                                                                        }}
                                                                    >
                                                                        <Image
                                                                            src={
                                                                                c.thumbnail
                                                                            }
                                                                            alt={`${c.client} preview`}
                                                                            fill
                                                                            sizes="(max-width: 768px) 50vw, 200px"
                                                                            style={{
                                                                                objectFit:
                                                                                    "cover",
                                                                                objectPosition:
                                                                                    "top center",
                                                                            }}
                                                                        />
                                                                    </div>
                                                                    {/* Dynamic-island pill */}
                                                                    <span
                                                                        aria-hidden
                                                                        style={{
                                                                            position:
                                                                                "absolute",
                                                                            top: 8,
                                                                            left: "50%",
                                                                            transform:
                                                                                "translateX(-50%)",
                                                                            width: "32%",
                                                                            height: 18,
                                                                            borderRadius: 12,
                                                                            background:
                                                                                "#0e0f13",
                                                                            zIndex: 2,
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : c.thumbnail ? (
                                                        // Desktop thumbnail in a browser-chrome frame so the
                                                        // screenshot reads as a website, matching the homepage /
                                                        // case-page reel treatment.
                                                        <div
                                                            style={{
                                                                position:
                                                                    "absolute",
                                                                inset: 0,
                                                                background:
                                                                    COVER_BG[
                                                                        c.cover
                                                                            .bg
                                                                    ] ??
                                                                    "var(--paper)",
                                                                display: "flex",
                                                                flexDirection:
                                                                    "column",
                                                            }}
                                                        >
                                                            {/* Browser chrome row */}
                                                            <div
                                                                aria-hidden
                                                                style={{
                                                                    display:
                                                                        "flex",
                                                                    alignItems:
                                                                        "center",
                                                                    gap: 10,
                                                                    padding:
                                                                        "9px 12px",
                                                                    flex: "0 0 auto",
                                                                }}
                                                            >
                                                                <div
                                                                    style={{
                                                                        display:
                                                                            "flex",
                                                                        gap: 5,
                                                                    }}
                                                                >
                                                                    {[0, 1, 2].map(
                                                                        (d) => (
                                                                            <span
                                                                                key={
                                                                                    d
                                                                                }
                                                                                style={{
                                                                                    width: 7,
                                                                                    height: 7,
                                                                                    borderRadius: 4,
                                                                                    background:
                                                                                        "color-mix(in oklab, var(--slate-ink) 32%, transparent)",
                                                                                }}
                                                                            />
                                                                        ),
                                                                    )}
                                                                </div>
                                                                <div
                                                                    style={{
                                                                        flex: 1,
                                                                        padding:
                                                                            "3px 8px",
                                                                        borderRadius: 4,
                                                                        background:
                                                                            "color-mix(in oklab, var(--slate-ink) 10%, transparent)",
                                                                        fontFamily:
                                                                            "var(--font-mono)",
                                                                        fontSize: 10,
                                                                        letterSpacing:
                                                                            "0.04em",
                                                                        color: "var(--slate-ink)",
                                                                        textAlign:
                                                                            "center",
                                                                        whiteSpace:
                                                                            "nowrap",
                                                                        overflow:
                                                                            "hidden",
                                                                        textOverflow:
                                                                            "ellipsis",
                                                                        maxWidth:
                                                                            "min(70%, 260px)",
                                                                        margin: "0 auto",
                                                                    }}
                                                                >
                                                                    {c.url
                                                                        ? c.url
                                                                              .replace(
                                                                                  /^https?:\/\//,
                                                                                  "",
                                                                              )
                                                                              .replace(
                                                                                  /\/$/,
                                                                                  "",
                                                                              )
                                                                        : c.client}
                                                                </div>
                                                            </div>
                                                            {/* Screenshot */}
                                                            <div
                                                                style={{
                                                                    position:
                                                                        "relative",
                                                                    flex: 1,
                                                                    minHeight: 0,
                                                                    overflow:
                                                                        "hidden",
                                                                }}
                                                            >
                                                                <Image
                                                                    src={
                                                                        c.thumbnail
                                                                    }
                                                                    alt={`${c.client} preview`}
                                                                    fill
                                                                    sizes="(max-width: 768px) 100vw, 50vw"
                                                                    style={{
                                                                        objectFit:
                                                                            "cover",
                                                                        objectPosition:
                                                                            "top center",
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <CaseCover
                                                            url={c.url}
                                                            label={
                                                                c.cover.label
                                                            }
                                                            bg={c.cover.bg}
                                                            labelSize={
                                                                isWide
                                                                    ? "var(--type-5xl)"
                                                                    : "var(--type-3xl)"
                                                            }
                                                            noChrome={!isWide}
                                                        />
                                                    )}
                                                </ViewTransition>
                                            </MaskSweep>
                                            <div
                                                aria-hidden
                                                className="kagu-work-wash"
                                                style={{
                                                    position: "absolute",
                                                    inset: 0,
                                                    background:
                                                        "var(--mint-deep)",
                                                    mixBlendMode: "multiply",
                                                    opacity: 0,
                                                    transition:
                                                        "opacity 320ms cubic-bezier(0.6,0.01,0.05,0.95)",
                                                    zIndex: 2,
                                                }}
                                            />
                                        </div>
                                        <div
                                            style={{
                                                marginTop: "var(--space-5)",
                                                display: "grid",
                                                gridTemplateColumns: "1fr auto",
                                                alignItems: "baseline",
                                                gap: "var(--space-4)",
                                            }}
                                        >
                                            <h2
                                                className="display"
                                                style={{
                                                    fontSize: "var(--type-2xl)",
                                                    lineHeight: 1.05,
                                                }}
                                            >
                                                {c.client}
                                            </h2>
                                            <span
                                                className="font-mono"
                                                style={{
                                                    fontSize: "var(--type-xs)",
                                                    letterSpacing:
                                                        "var(--tracking-eyebrow)",
                                                    textTransform: "uppercase",
                                                    color: "var(--slate-ink)",
                                                }}
                                            >
                                                {c.year}
                                            </span>
                                        </div>
                                        <p
                                            style={{
                                                fontSize: "var(--type-sm)",
                                                color: "var(--slate-ink)",
                                                marginTop: "var(--space-2)",
                                            }}
                                        >
                                            {c.project} · {c.sector}
                                        </p>
                                    </Link>
                                    <style>{`
                  a:hover .kagu-work-wash,
                  a:focus-visible .kagu-work-wash { opacity: 0.2; }
                `}</style>
                                </article>
                            );
                        })}
                    </div>
                </CursorTrailPreview>
            </div>
        </div>
    );
}
