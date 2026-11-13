import type { Metadata } from "next";
import { getStudio, getTeam, type Studio, type TeamMember } from "@/lib/content";
import { pageMetadata, webPageJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { AsciiBanner, AsciiBlock } from "@/components/ascii/AsciiBlock";
import { AsciiLogo } from "@/components/ascii/AsciiLogo";
import { spark } from "@/components/ascii/asciiArt";
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

/** Deterministic pseudo-trend (rising) from a label, for the metric sparklines. */
function trend(seed: string) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const vals: number[] = [];
  for (let i = 0; i < 28; i++) {
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    const noise = ((h >>> 0) % 1000) / 1000;
    vals.push(Math.min(1, 0.12 + (i / 27) * 0.62 + noise * 0.26));
  }
  return spark(vals);
}

async function safeStudio(): Promise<Studio | null> {
  try {
    return await getStudio();
  } catch {
    return null;
  }
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
  const [{ member }, team, studio] = await Promise.all([searchParams, getTeam(), safeStudio()]);
  const members = withSlugs(team);
  const initialOpen =
    member && members.some((m) => m.slug === member) ? member : null;
  const mission = studio?.mission || "We build software, then look after it.";
  const principles = studio?.principles ?? [];
  const metrics = (studio?.metrics ?? []).filter((m) => m.label || m.value);

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
        <h1 className="sr-only">About Kagu</h1>
        <AsciiBanner word="ABOUT" tone="shimmer" className="about-banner" />
        <p className="about-lead">We build software, then look after it.</p>
        <div className="about-logo" aria-hidden="true">
          <AsciiLogo />
        </div>
      </section>

      <section className="site-wrap about-mission">
        <p className="about-idx">01 / Mission</p>
        <blockquote>{mission}</blockquote>
      </section>

      {principles.length > 0 ? (
        <section className="site-wrap about-block">
          <p className="about-idx">02 / Principles</p>
          <ol className="about-principles">
            {principles.map((p, i) => (
              <li key={p.title + i} className="glass">
                <span className="about-n">{String(i + 1).padStart(2, "0")}</span>
                <h2>{p.title}</h2>
                <p>{p.body}</p>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {metrics.length > 0 ? (
        <section className="site-wrap about-block">
          <p className="about-idx">03 / In numbers</p>
          <ul className="about-metrics">
            {metrics.map((m) => (
              <li key={m.label + m.value} className="glass">
                <span className="about-metrics__v">{m.value}</span>
                <span className="about-metrics__l">{m.label}</span>
                <AsciiBlock art={trend(m.label + m.value)} tone="muted" className="about-metrics__spark" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="site-wrap about-team">
        <p className="about-idx">04 / People</p>
        {members.length > 0 ? (
          <TeamRoster members={members} initialOpen={initialOpen} />
        ) : (
          <div className="about-empty glass">
            <AsciiBlock
              art={["   o    o    o", "  /|\\  /|\\  /|\\", "  / \\  / \\  / \\", "~~~~~~~~~~~~~~~~~~"].join("\n")}
              tone="muted"
            />
            <p>The team page is being set up. Say hello in the meantime.</p>
          </div>
        )}
      </section>
    </>
  );
}
