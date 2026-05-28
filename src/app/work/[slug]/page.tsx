import Link from "next/link";
import { notFound } from "next/navigation";
import { cases, getCase } from "@/data/cases";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { ViewTransition } from "@/lib/view-transition";
import { CaseCover } from "@/components/cases/CaseCover";
import { CaseReel } from "@/components/cases/CaseReel";

export function generateStaticParams() {
  return cases.map((c) => ({ slug: c.slug }));
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const c = getCase(slug);
  if (!c) return { title: "Case not found · Kagu" };
  return {
    title: `${c.client} · Kagu`,
    description: c.lede,
  };
}

export default async function CaseStudyPage({ params }: PageProps) {
  const { slug } = await params;
  const caseData = getCase(slug);
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
            <span aria-hidden style={{ width: 28, height: 1, background: "currentColor" }} />
            All work
          </Link>
        </div>
      </section>

      {/* Feature reel — sits where the static cover used to. If a case has no
          features or thumbnail yet, fall back to the color-block CaseCover. */}
      {caseData.thumbnail || (caseData.features && caseData.features.length > 0) ? (
        <CaseReel caseData={caseData} index={idx} size="large" />
      ) : (
        <section
          style={{ background: "var(--paper)" }}
          className="px-(--container-x) pb-(--space-12)"
        >
          <div className="w-full max-w-(--container-max) mx-auto">
            <h1
              className="display"
              style={{
                fontSize: "var(--type-7xl)",
                lineHeight: 0.9,
                maxWidth: "14ch",
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
                    color: "var(--ink)",
                    borderBottom: "1px solid var(--mint-deep)",
                    paddingBottom: 6,
                  }}
                >
                  Visit live
                  <span aria-hidden style={{ width: 28, height: 1, background: "var(--mint-deep)" }} />
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
                className="display md:col-span-9"
                style={{
                  fontSize: "var(--type-7xl)",
                  lineHeight: 0.9,
                  color: "var(--slate-ink)",
                }}
              >
                {next.client}
              </h2>
              <span
                className="font-mono md:col-span-3 md:text-right"
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

      <SiteFooter />
    </>
  );
}
