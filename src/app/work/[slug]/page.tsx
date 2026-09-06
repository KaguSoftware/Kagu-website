import Link from "next/link";
import { notFound } from "next/navigation";
import { getCases, getStudio } from "@/lib/content";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ViewTransition } from "@/lib/view-transition";
import { CaseCover } from "@/components/cases/CaseCover";
import { CaseReel } from "@/components/cases/CaseReel";
import { ArrowGlyph } from "@/components/ui/ArrowGlyph";
import { pageMetadata } from "@/lib/seo";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/* "Visit live" is wrong for a case whose only public link is a store listing —
   there is no site to visit. Label off the host so a case page keeps saying
   "Visit live" for every web build and nothing else has to change. */
function visitLabel(url: string): string {
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    return "Visit live";
  }
  if (host === "apps.apple.com") return "Get it on the App Store";
  if (host === "play.google.com") return "Get it on Google Play";
  return "Visit live";
}

// Static + hourly ISR; admin edits bust this instantly via revalidatePublic().
export const revalidate = 3600;

// Prebuild every case page so first visits get CDN hits, not a server render.
export async function generateStaticParams() {
  const cases = await getCases();
  return cases.map((c) => ({ slug: c.slug }));
}

/* Meta descriptions get truncated around 160 chars; a lede can run longer, so
   clip on a word boundary rather than letting the SERP cut mid-word. */
function clampDescription(text: string, max = 155): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:—-]$/, "") + "…";
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const cases = await getCases();
  const c = cases.find((x) => x.slug === slug);
  if (!c) return { title: "Case not found · Kagu" };
  // Canonical + OG/Twitter via the same helper every other indexable page
  // uses. The OG *image* is inherited from app/opengraph-image.tsx.
  return pageMetadata({
    title: `${c.client} · Kagu`,
    description: clampDescription(c.lede),
    path: `/work/${c.slug}`,
    lang: "en",
  });
}

export default async function CaseStudyPage({ params }: PageProps) {
  const { slug } = await params;
  const [cases, studio] = await Promise.all([getCases(), getStudio()]);
  const caseData = cases.find((c) => c.slug === slug);
  if (!caseData) notFound();

  const idx = cases.findIndex((c) => c.slug === slug);
  const next = cases[(idx + 1) % cases.length];

  return (
    <>
      {/* Top bar — back link only; the reel below carries the title. */}
      <section
        style={{ background: "var(--paper)", position: "relative" }}
        className="px-(--container-x) pt-(--space-12) pb-(--space-6)"
      >
        <div className="w-full max-w-(--container-max) mx-auto">
          <Link
            href="/work"
            data-cursor="nav-link"
            className="font-mono inline-flex items-center gap-3"
            style={{
              fontSize: "var(--type-xs)",
              letterSpacing: "var(--tracking-eyebrow)",
              textTransform: "uppercase",
              color: "var(--ink)",
            }}
          >
            <ArrowGlyph length={28} direction="left" />
            All work
          </Link>
        </div>
      </section>

      {/* Feature reel — sits where the static cover used to. If a case has no
          features or thumbnail yet, fall back to the color-block CaseCover. */}
      {caseData.thumbnail || (caseData.features && caseData.features.length > 0) ? (
        <CaseReel caseData={caseData} index={idx} size="large" eager />
      ) : (
        <section
          style={{ background: "var(--paper)" }}
          className="px-(--container-x) pb-(--space-12)"
        >
          <div className="w-full max-w-(--container-max) mx-auto">
            <h1
              className="display"
              style={{
                // Same guard as the "next case" title: --type-7xl's 4.5rem floor
                // is wider than a phone for long client names.
                fontSize: "clamp(2.75rem, 12vw, var(--type-7xl))",
                lineHeight: 0.9,
                maxWidth: "14ch",
                overflowWrap: "anywhere",
                marginBottom: "var(--space-12)",
                letterSpacing: "var(--tracking-tight)",
              }}
            >
              {caseData.client}
            </h1>
            <div
              className="relative"
              style={{
                aspectRatio: "16 / 9",
                overflow: "hidden",
                border: "1px solid var(--neutral)",
              }}
            >
              <ViewTransition name={`work-${caseData.slug}-cover`}>
                <CaseCover
                  url={caseData.url}
                  label={caseData.cover.label}
                  bg={caseData.cover.bg}
                  labelSize="var(--type-8xl)"
                />
              </ViewTransition>
            </div>
          </div>
        </section>
      )}

      {/* Meta strip */}
      <section
        style={{ background: "var(--paper)" }}
        className="px-(--container-x) py-(--space-16)"
      >
        <div className="w-full max-w-(--container-max) mx-auto grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-6">
          {[
            { label: "Client", value: caseData.client },
            { label: "Sector", value: caseData.sector },
            { label: "Year", value: caseData.year },
            { label: "Role", value: caseData.role },
          ].map((m) => (
            <div key={m.label} className="flex flex-col" style={{ borderTop: "1px solid var(--neutral)", paddingTop: "var(--space-4)" }}>
              <span
                className="font-mono"
                style={{
                  fontSize: "var(--type-xs)",
                  letterSpacing: "var(--tracking-eyebrow)",
                  textTransform: "uppercase",
                  color: "var(--slate-ink)",
                  marginBottom: "var(--space-2)",
                }}
              >
                {m.label}
              </span>
              <span style={{ fontSize: "var(--type-md)", color: "var(--ink)" }}>{m.value}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Body */}
      <section
        style={{ background: "var(--paper)" }}
        className="px-(--container-x) pt-(--space-12) pb-(--section-y)"
      >
        <div className="w-full max-w-(--container-max) mx-auto grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-7 md:col-start-3">
            <p
              className="display"
              style={{
                fontSize: "var(--type-3xl)",
                lineHeight: 1.15,
                color: "var(--slate-ink)",
                marginBottom: "var(--space-16)",
                letterSpacing: "var(--tracking-tight)",
              }}
            >
              {caseData.lede}
            </p>
            <div className="flex flex-col gap-(--space-8)">
              {caseData.body.map((p, i) => (
                <p
                  key={i}
                  style={{
                    fontSize: "var(--type-md)",
                    lineHeight: 1.7,
                    color: "var(--ink)",
                    maxWidth: "60ch",
                  }}
                >
                  {p}
                </p>
              ))}
            </div>

            {/* Stack */}
            <div
              style={{
                marginTop: "var(--space-16)",
                borderTop: "1px solid var(--neutral)",
                paddingTop: "var(--space-8)",
              }}
            >
              <span className="eyebrow block" style={{ marginBottom: "var(--space-4)" }}>
                Stack
              </span>
              <ul className="list-none m-0 p-0 flex flex-wrap gap-x-6 gap-y-2">
                {caseData.stack.map((s) => (
                  <li
                    key={s}
                    className="font-mono"
                    style={{
                      fontSize: "var(--type-sm)",
                      color: "var(--slate-ink)",
                    }}
                  >
                    {s}
                  </li>
                ))}
              </ul>
            </div>

            {/* Visit */}
            {caseData.url && (
              <div style={{ marginTop: "var(--space-12)" }}>
                <a
                  href={caseData.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-cursor="read"
                  className="font-mono inline-flex items-center gap-3"
                  style={{
                    fontSize: "var(--type-sm)",
                    letterSpacing: "var(--tracking-eyebrow)",
                    textTransform: "uppercase",
                    color: "var(--mint-text)",
                    borderBottom: "1px solid var(--mint-text)",
                    paddingBottom: 6,
                  }}
                >
                  {visitLabel(caseData.url)}
                  <ArrowGlyph length={28} />
                </a>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Next case */}
      <section
        style={{ background: "var(--mint-pale)" }}
        className="px-(--container-x) py-(--section-y)"
      >
        <div className="w-full max-w-(--container-max) mx-auto">
          <span className="eyebrow block" style={{ marginBottom: "var(--space-6)" }}>
            Next case
          </span>
          <Link href={`/work/${next.slug}`} data-cursor="view" className="block group">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end">
              <h2
                className="display md:col-span-9 min-w-0"
                style={{
                  // --type-7xl bottoms out at 4.5rem, which is wider than a
                  // phone for a name like "UpperDeck" — the page then scrolled
                  // sideways. Track the viewport below the breakpoint and let a
                  // long single word break rather than push past the edge.
                  fontSize: "clamp(2.75rem, 12vw, var(--type-7xl))",
                  lineHeight: 0.9,
                  color: "var(--slate-ink)",
                  overflowWrap: "anywhere",
                  maxWidth: "100%",
                }}
              >
                {next.client}
              </h2>
              <span
                className="font-mono md:col-span-3 md:text-right min-w-0"
                style={{
                  fontSize: "var(--type-sm)",
                  letterSpacing: "var(--tracking-eyebrow)",
                  textTransform: "uppercase",
                  color: "var(--ink)",
                }}
              >
                {next.project}
              </span>
            </div>
          </Link>
        </div>
      </section>

      <SiteFooter studio={studio} />
    </>
  );
}
