import type { Metadata } from "next";
import Link from "next/link";
import { getStudio, getTeam, type TeamMember } from "@/lib/content";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { WordMaskReveal } from "@/components/motion/WordMaskReveal";
import { Eyebrow } from "@/components/layout/Eyebrow";
import { TeamRoster, type RosterMember } from "./TeamRoster";

const BASE_META = {
  title: "Team · Kagu",
  description:
    "The people behind Kagu — cofounders and associates building software for boutique operators.",
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

type TeamPageProps = {
  searchParams: Promise<{ member?: string }>;
};

// Per-person metadata so a shared/QR deep link previews that member by name.
export async function generateMetadata({
  searchParams,
}: TeamPageProps): Promise<Metadata> {
  const { member } = await searchParams;
  if (!member) return BASE_META;
  const found = withSlugs(await getTeam()).find((m) => m.slug === member);
  if (!found) return BASE_META;
  return {
    title: `${found.name} · Kagu`,
    description: found.bio || BASE_META.description,
  };
}

export default async function TeamPage({ searchParams }: TeamPageProps) {
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
      {/* Hero */}
      <section
        style={{ background: "var(--paper)" }}
        className="px-(--container-x) pt-(--space-32) pb-(--space-24) min-h-[55svh] flex items-end"
      >
        <div className="w-full max-w-(--container-max) mx-auto">
          <span className="eyebrow block" style={{ marginBottom: "var(--space-6)" }}>
            People · est. 2025
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
            A small team{studio.location ? ` in ${studio.location}` : ""}, building
            customer surfaces and operator-facing admins against the same database —
            and staying close enough to every project that the handover actually holds.
          </p>
        </div>
      </section>

      {/* Team — one roster; click a card to pin its bio open (and deep-link it). */}
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

      {/* Closing line → contact */}
      <section
        style={{ background: "var(--paper)" }}
        className="px-(--container-x) py-(--section-y)"
      >
        <div
          className="w-full max-w-(--container-max) mx-auto flex flex-col md:flex-row md:items-end md:justify-between gap-6"
        >
          <p
            className="display"
            style={{
              fontSize: "var(--type-4xl)",
              lineHeight: 1.1,
              color: "var(--slate-ink)",
              maxWidth: "18ch",
              letterSpacing: "var(--tracking-tight)",
            }}
          >
            We&apos;re always interested in people who build for operators.
          </p>
          <Link
            href="/contact"
            data-cursor="view"
            className="font-mono inline-flex items-center gap-3 self-start md:self-auto"
            style={{
              fontSize: "var(--type-sm)",
              letterSpacing: "var(--tracking-eyebrow)",
              textTransform: "uppercase",
              color: "var(--ink)",
              borderBottom: "1px solid var(--mint-deep)",
              paddingBottom: 6,
              whiteSpace: "nowrap",
            }}
          >
            Get in touch
            <span
              aria-hidden
              style={{ width: 28, height: 1, background: "var(--mint-deep)" }}
            />
          </Link>
        </div>
      </section>

      <SiteFooter studio={studio} />
    </>
  );
}
