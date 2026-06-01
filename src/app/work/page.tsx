/*
  /work — work index.
  Full grid of all cases. Asymmetric, hairlines, mono-led.
  Reuses Case cover treatment from SelectedWorkSection but in denser grid form.
*/

import Link from "next/link";
import Image from "next/image";
import { cases } from "@/data/cases";
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
                            const isWide = i % 3 === 0;
                            const colClass = isWide
                                ? "md:col-span-8"
                                : i % 3 === 1
                                ? "md:col-span-5 md:col-start-1"
                                : "md:col-span-6 md:col-start-7";
                            const offset =
                                i % 3 === 1 ? "md:mt-(--space-16)" : "";
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
                                                aspectRatio: isWide
                                                    ? "16 / 10"
                                                    : "4 / 5",
                                                background:
                                                    COVER_BG[c.cover.bg] ??
                                                    "var(--paper)",
                                                overflow: "hidden",
                                                border: "1px solid var(--neutral)",
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
                                                                    COVER_BG[
                                                                        c.cover
                                                                            .bg
                                                                    ] ??
                                                                    "var(--paper)",
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
                                                                    height: "70%",
                                                                    aspectRatio:
                                                                        "9 / 19.5",
                                                                    background:
                                                                        "var(--ink)",
                                                                    borderRadius:
                                                                        "clamp(24px, 3vw, 38px)",
                                                                    padding:
                                                                        "clamp(6px, 0.7vw, 10px)",
                                                                    boxShadow:
                                                                        "0 30px 60px -20px color-mix(in oklab, var(--ink) 38%, transparent), 0 0 0 1px color-mix(in oklab, var(--ink) 18%, transparent)",
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
                                                                            "#6b6b6b",
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
                                                                                "var(--ink)",
                                                                            zIndex: 2,
                                                                        }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : c.thumbnail ? (
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
