import type { Metadata } from "next";
import Link from "next/link";
import { getStudio, getTeam, type TeamMember } from "@/lib/content";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { WordMaskReveal } from "@/components/motion/WordMaskReveal";
import { Eyebrow } from "@/components/layout/Eyebrow";
import { TeamRoster, type RosterMember } from "./TeamRoster";

const BASE_META = {
  title: "About · Kagu",
  description:
    "The people behind Kagu and how we work — a small studio building software for boutique operators.",
};

/** Readable, URL-safe slug from a name (e.g. "Majed Ahdab" → "majed-ahdab"). */
function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip combining accents
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

/**
 * Cofounders lead, associates follow (segment now reads from each member's
 * pill, not a section split). Each gets a stable, de-duplicated slug so it has
 * a shareable `?member=` deep link.
 */
function withSlugs(team: TeamMember[]): RosterMember[] {
  const ordered = [
    ...team.filter((m) => m.segment === "cofounder"),
    ...team.filter((m) => m.segment === "senior_associate"),
    ...team.filter((m) => m.segment === "associate"),
  ];
  const seen = new Map<string, number>();
  return ordered.map((m) => {
    const base = slugify(m.name) || m.id.slice(0, 8);
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    return { ...m, slug: n === 0 ? base : `${base}-${n + 1}` };
  });
}

type AboutPageProps = {
  searchParams: Promise<{ member?: string }>;
};

// Per-person metadata so a shared/QR deep link previews that member by name.
export async function generateMetadata({
  searchParams,
}: AboutPageProps): Promise<Metadata> {
  const { member } = await searchParams;
  if (!member) return BASE_META;
  const found = withSlugs(await getTeam()).find((m) => m.slug === member);
  if (!found) return BASE_META;
  return {
    title: `${found.name} · Kagu`,
    description: found.bio || BASE_META.description,
  };
}

export default async function AboutPage({ searchParams }: AboutPageProps) {
  const [{ member }, studio, team] = await Promise.all([
    searchParams,
    getStudio(),
    getTeam(),
  ]);
  const members = withSlugs(team);
  const initialOpen =
    member && members.some((m) => m.slug === member) ? member : null;

  return (
    <>
      {/* Hero — people-forward, the team is the first thing you meet. */}
      <section
        style={{ background: "var(--paper)" }}
        className="px-(--container-x) pt-(--space-32) pb-(--space-24) min-h-[60svh] flex items-end"
      >
        <div className="w-full max-w-(--container-max) mx-auto">
          <span className="eyebrow block" style={{ marginBottom: "var(--space-6)" }}>
            Studio · est. 2025
          </span>
          <WordMaskReveal
            as="h1"
            text="The people behind the work."
            className="display"
          />
          <p
            style={{
              marginTop: "var(--space-8)",
              maxWidth: "48ch",
              fontSize: "var(--type-lg)",
              lineHeight: 1.5,
              color: "var(--slate-ink)",
            }}
          >
            A small studio{studio.location ? ` in ${studio.location}` : ""}, building
            customer surfaces and operator-facing admins against the same database —
            and staying close enough to every project that the handover actually holds.
          </p>
        </div>
      </section>

      {/* 01 — Team. One roster; click a card to pin its bio open (and deep-link it). */}
      {members.length > 0 ? (
        <section
          style={{ background: "var(--paper)" }}
          className="px-(--container-x) py-(--section-y)"
        >
          <div className="w-full max-w-(--container-max) mx-auto">
            <Eyebrow number="01">The team</Eyebrow>
            <TeamRoster members={members} initialOpen={initialOpen} />
          </div>
        </section>
      ) : null}

      {/* 02 — The studio: mission + facts */}
      <section
        style={{ background: "var(--mint-pale)" }}
        className="px-(--container-x) py-(--section-y)"
      >
        <div className="w-full max-w-(--container-max) mx-auto">
          <Eyebrow number="02">The studio</Eyebrow>
          <div
            className="grid grid-cols-1 md:grid-cols-12 gap-8"
            style={{ marginTop: "var(--space-12)" }}
          >
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
                <Fact label="Founded">{studio.founded}</Fact>
                <Fact label="Based">{studio.location}</Fact>
                <Fact label="Stack">Next.js 16 · Supabase · Vercel</Fact>
                <Fact label="Languages">Turkish · English</Fact>
              </dl>
            </aside>
          </div>
        </div>
      </section>

      {/* 03 — Principles */}
      <section
        style={{ background: "var(--paper)" }}
        className="px-(--container-x) py-(--section-y)"
      >
        <div className="w-full max-w-(--container-max) mx-auto">
          <Eyebrow number="03">Principles</Eyebrow>
          <h2
            className="display"
            style={{
              fontSize: "var(--type-6xl)",
              lineHeight: 0.95,
              margin: "var(--space-8) 0 var(--space-24)",
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

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
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
        {label}
      </dt>
      <dd style={{ fontSize: "var(--type-lg)", color: "var(--ink)" }}>{children}</dd>
    </div>
  );
}
