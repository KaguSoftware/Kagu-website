import { NavLink } from "@/components/site/NavLink";
import { AsciiReveal } from "@/components/ascii/AsciiReveal";
import { notFound } from "next/navigation";
import { getCases } from "@/lib/content";
import { oneLiner } from "@/lib/productGroups";
import { pageMetadata, clampText } from "@/lib/seo";
import { AsciiBlock } from "@/components/ascii/AsciiBlock";
import { rule } from "@/components/ascii/asciiArt";
import "@/components/site/work/work.css";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Static + hourly ISR; admin edits bust this instantly via revalidatePublic().
export const revalidate = 3600;

export async function generateStaticParams() {
  const cases = await getCases();
  return cases.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const cases = await getCases();
  const c = cases.find((x) => x.slug === slug);
  if (!c) return { title: "Not found — Kagu" };
  // The OG image comes from ./opengraph-image.tsx (per-segment).
  return pageMetadata({
    title: `${c.client} — Kagu`,
    description: clampText(c.lede),
    path: `/work/${c.slug}`,
    lang: "en",
  });
}

const DIVIDER = rule(260, "-=-.");

export default async function CasePage({ params }: PageProps) {
  const { slug } = await params;
  const cases = await getCases();
  const idx = cases.findIndex((c) => c.slug === slug);
  if (idx < 0) notFound();
  const c = cases[idx];
  const next = cases[(idx + 1) % cases.length];
  const prev = cases[(idx - 1 + cases.length) % cases.length];
  const hasBoth = cases.length > 1;

  const features = (c.features ?? []).filter((f) => f.image);
  const coverSrc = c.thumbnail ?? features[0]?.image;
  const coverAlt = c.thumbnailAlt ?? `${c.client} preview`;
  const index = `${String(idx + 1).padStart(2, "0")} / ${String(cases.length).padStart(2, "0")}`;
  const spec = [
    ["Client", c.client],
    ["Sector", c.sector],
    ["Year", c.year],
    ["Role", c.role],
    ["Stack", c.stack?.join(", ")],
  ].filter(([, v]) => v);
  const paras = [c.lede, ...(c.body ?? [])].filter(Boolean);

  return (
    <article className="site-wrap">
      <NavLink href="/work" className="case-back">
        &larr; Work
      </NavLink>

      <header className="case-head">
        <p className="case-idx">Case {index}</p>
        <h1>{c.client}</h1>
        <p className="case-line">{oneLiner(c)}</p>
        {c.url && (
          <a href={c.url} target="_blank" rel="noopener noreferrer" className="case-visit">
            Visit site &#8599;
          </a>
        )}
      </header>

      {coverSrc && (
        <div className={`case-cover${c.device === "mobile" ? " case-cover--phone" : ""}`}>
          <AsciiReveal
            src={coverSrc}
            alt={coverAlt}
            sizes="(max-width: 1160px) 100vw, 1120px"
            reveal="hover"
            fit={c.device === "mobile" ? "contain" : "cover"}
            fontSize={6}
            className="case-cover__ascii"
          />
        </div>
      )}

      <div className="case-div">
        <AsciiBlock art={DIVIDER} tone="line" />
      </div>

      <div className="case-body">
        <div className="case-text">
          {paras.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        {spec.length > 0 && (
          <dl className="case-spec glass">
            {spec.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {features.length > 0 && (
        <ul className="case-grid">
          {features.map((f, i) => (
            <li key={f.image} className="case-fig">
              <div className={`case-shot${(f.device ?? c.device) === "mobile" ? " case-shot--phone" : ""}`}>
                <AsciiReveal
                  src={f.image}
                  alt={f.alt ?? f.title}
                  sizes="(max-width: 640px) 100vw, 560px"
                  reveal="view"
                  fit={(f.device ?? c.device) === "mobile" ? "contain" : "cover"}
                  fontSize={5}
                  className="case-shot__ascii"
                />
              </div>
              <span className="case-cap">
                <small>{String(i + 1).padStart(2, "0")}</small>
                {f.title}
              </span>
            </li>
          ))}
        </ul>
      )}

      <nav className={`case-nav${hasBoth ? "" : " case-nav--one"}`} aria-label="More projects">
        {hasBoth && (
          <NavLink href={`/work/${prev.slug}`} className="glass">
            <small>&larr; Previous</small>
            <span>{prev.client}</span>
          </NavLink>
        )}
        <NavLink href={`/work/${next.slug}`} className="glass">
          <small>Next project &rarr;</small>
          <span>{next.client}</span>
        </NavLink>
      </nav>
    </article>
  );
}
