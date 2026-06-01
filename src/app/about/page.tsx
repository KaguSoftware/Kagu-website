import Link from "next/link";
import { getStudio } from "@/lib/content";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { WordMaskReveal } from "@/components/motion/WordMaskReveal";

export async function generateMetadata() {
  const studio = await getStudio();
  return {
    title: "About · Kagu",
    description: studio.mission,
  };
}

export default async function AboutPage() {
  const studio = await getStudio();
  return (
    <>
      <section
        style={{ background: "var(--paper)" }}
        className="px-(--container-x) pt-(--space-32) pb-(--space-24) min-h-[60dvh] flex items-end"
      >
        <div className="w-full max-w-(--container-max) mx-auto">
          <span className="eyebrow block" style={{ marginBottom: "var(--space-6)" }}>
            Studio · est. 2025
          </span>
          <WordMaskReveal
            as="h1"
            text="A small studio for boutique operators."
            className="display"
          />
        </div>
      </section>

      {/* Mission + studio facts */}
      <section
        style={{ background: "var(--paper)" }}
        className="px-(--container-x) py-(--section-y)"
      >
        <div className="w-full max-w-(--container-max) mx-auto grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-7">
            <p
              className="display"
              style={{
                fontSize: "var(--type-3xl)",
                lineHeight: 1.15,
                color: "var(--slate-ink)",
                marginBottom: "var(--space-12)",
                letterSpacing: "var(--tracking-tight)",
                maxWidth: "26ch",
              }}
            >
              {studio.mission}
            </p>
            <p
              style={{
                fontSize: "var(--type-md)",
                lineHeight: 1.7,
                color: "var(--ink)",
                maxWidth: "58ch",
                marginBottom: "var(--space-6)",
              }}
            >
              We work in hospitality, tourism, and operator-facing software,
              verticals where the test of a system is whether the team uses it
              on Friday night, not whether it photographs well on Monday morning.
            </p>
            <p
              style={{
                fontSize: "var(--type-md)",
                lineHeight: 1.7,
                color: "var(--ink)",
                maxWidth: "58ch",
              }}
            >
              We build a customer-facing surface and an operator-facing admin
              against the same database. Production goes live in weeks, not
              quarters. The handover is the moment we stop being needed, and
              the moment Kagu is most useful.
            </p>
          </div>
          <aside className="md:col-span-4 md:col-start-9">
            <dl
              style={{
                borderTop: "1px solid var(--neutral)",
                paddingTop: "var(--space-6)",
                display: "grid",
                gap: "var(--space-5)",
              }}
            >
              <div>
                <dt
                  className="font-mono"
                  style={{
                    fontSize: "var(--type-xs)",
                    letterSpacing: "var(--tracking-eyebrow)",
                    textTransform: "uppercase",
                    color: "var(--slate-ink)",
                    marginBottom: 4,
                  }}
                >
                  Founded
                </dt>
                <dd style={{ fontSize: "var(--type-lg)", color: "var(--ink)" }}>
                  {studio.founded}
                </dd>
              </div>
              <div>
                <dt
                  className="font-mono"
                  style={{
                    fontSize: "var(--type-xs)",
                    letterSpacing: "var(--tracking-eyebrow)",
                    textTransform: "uppercase",
                    color: "var(--slate-ink)",
                    marginBottom: 4,
                  }}
                >
                  Based
                </dt>
                <dd style={{ fontSize: "var(--type-lg)", color: "var(--ink)" }}>
                  {studio.location}
                </dd>
              </div>
              <div>
                <dt
                  className="font-mono"
                  style={{
                    fontSize: "var(--type-xs)",
                    letterSpacing: "var(--tracking-eyebrow)",
                    textTransform: "uppercase",
                    color: "var(--slate-ink)",
                    marginBottom: 4,
                  }}
                >
                  Stack
                </dt>
                <dd style={{ fontSize: "var(--type-lg)", color: "var(--ink)" }}>
                  Next.js 16 · Supabase · Vercel
                </dd>
              </div>
              <div>
                <dt
                  className="font-mono"
                  style={{
                    fontSize: "var(--type-xs)",
                    letterSpacing: "var(--tracking-eyebrow)",
                    textTransform: "uppercase",
                    color: "var(--slate-ink)",
                    marginBottom: 4,
                  }}
                >
                  Languages
                </dt>
                <dd style={{ fontSize: "var(--type-lg)", color: "var(--ink)" }}>
                  Turkish · English
                </dd>
              </div>
            </dl>
          </aside>
        </div>
      </section>

      {/* Principles */}
      <section
        style={{ background: "var(--mint-pale)" }}
        className="px-(--container-x) py-(--section-y)"
      >
        <div className="w-full max-w-(--container-max) mx-auto">
          <span className="eyebrow block" style={{ marginBottom: "var(--space-8)" }}>
            Principles
          </span>
          <h2
            className="display"
            style={{
              fontSize: "var(--type-6xl)",
              lineHeight: 0.95,
              marginBottom: "var(--space-24)",
              maxWidth: "14ch",
            }}
          >
            How we work.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-(--space-16)">
            {studio.principles.map((p, i) => (
              <article
                key={p.title}
                style={{
                  borderTop: "1px solid var(--neutral)",
                  paddingTop: "var(--space-6)",
                }}
              >
                <span
                  className="font-mono block"
                  style={{
                    fontSize: "var(--type-xs)",
                    color: "var(--mint-deep)",
                    letterSpacing: "var(--tracking-eyebrow)",
                    textTransform: "uppercase",
                    marginBottom: "var(--space-4)",
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3
                  className="display"
                  style={{
                    fontSize: "var(--type-2xl)",
                    lineHeight: 1.05,
                    marginBottom: "var(--space-4)",
                  }}
                >
                  {p.title}
                </h3>
                <p
                  style={{
                    fontSize: "var(--type-md)",
                    lineHeight: 1.6,
                    color: "var(--ink)",
                    maxWidth: "44ch",
                  }}
                >
                  {p.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        style={{ background: "var(--paper)" }}
        className="px-(--container-x) py-(--section-y)"
      >
        <div className="w-full max-w-(--container-max) mx-auto">
          <p
            className="display"
            style={{
              fontSize: "var(--type-5xl)",
              lineHeight: 0.95,
              color: "var(--slate-ink)",
              maxWidth: "16ch",
              marginBottom: "var(--space-12)",
            }}
          >
            Tell us about the shift you&apos;re trying to make easier.
          </p>
          <Link
            href="/contact"
            data-cursor="view"
            className="inline-flex items-center gap-3"
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "var(--type-md)",
              letterSpacing: "var(--tracking-eyebrow)",
              textTransform: "uppercase",
              color: "var(--ink)",
              background: "var(--mint-deep)",
              padding: "20px 28px",
              minHeight: 56,
              border: "1px solid var(--ink)",
            }}
          >
            Start a project
            <span aria-hidden style={{ width: 24, height: 1, background: "var(--ink)" }} />
          </Link>
        </div>
      </section>

      <SiteFooter studio={studio} />
    </>
  );
}
