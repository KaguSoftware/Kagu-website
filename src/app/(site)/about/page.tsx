import type { Metadata } from "next";
import { getTeam, type TeamMember } from "@/lib/content";
import { pageMetadata, webPageJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { KAGU_VIEWBOX, RIBBON, FOLD, WING } from "@/components/KaguMark";
import { TeamRoster, type RosterMember } from "./TeamRoster";
import "@/components/site/about/about.css";

const TITLE = "About — Kagu";
const DESCRIPTION =
  "Meet the Kagu team. We build software, then look after it.";

const BASE_META = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/about",
  lang: "en",
});

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
 * Cofounders lead, then senior associates, then associates. Each gets a
 * stable, de-duplicated slug so it has a shareable `?member=` deep link.
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
    ...BASE_META,
    title: `${found.name} · Kagu`,
    description: found.bio || DESCRIPTION,
  };
}

export default async function AboutPage({ searchParams }: AboutPageProps) {
  const [{ member }, team] = await Promise.all([searchParams, getTeam()]);
  const members = withSlugs(team);
  const initialOpen =
    member && members.some((m) => m.slug === member) ? member : null;

  return (
    <>
      <JsonLd
        data={webPageJsonLd({
          title: TITLE,
          description: DESCRIPTION,
          path: "/about",
          lang: "en",
        })}
      />

      <section className="site-wrap about-hero">
        <div className="about-hero__text">
          <h1>
            The team<span className="pop">.</span>
          </h1>
          <p className="about-lead">We build software, then look after it.</p>
        </div>
        <svg
          className="about-draw"
          viewBox={KAGU_VIEWBOX}
          aria-hidden="true"
          focusable="false"
          fill="none"
        >
          {[RIBBON, FOLD, WING].map((d, i) => (
            <path
              key={i}
              d={d}
              pathLength={1}
              className={`about-draw__p about-draw__p--${i + 1}`}
            />
          ))}
        </svg>
      </section>

      {members.length > 0 ? (
        <section className="site-wrap about-team">
          <TeamRoster members={members} initialOpen={initialOpen} />
        </section>
      ) : null}

    </>
  );
}
