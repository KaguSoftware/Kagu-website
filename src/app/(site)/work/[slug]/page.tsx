import { NavLink } from "@/components/site/NavLink";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getCases } from "@/lib/content";
import { oneLiner } from "@/lib/productGroups";
import { pageMetadata, clampText } from "@/lib/seo";
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

export default async function CasePage({ params }: PageProps) {
  const { slug } = await params;
  const cases = await getCases();
  const idx = cases.findIndex((c) => c.slug === slug);
  if (idx < 0) notFound();
  const c = cases[idx];
  const next = cases[(idx + 1) % cases.length];

  const features = (c.features ?? []).filter((f) => f.image);
  const coverSrc = c.thumbnail ?? features[0]?.image;
  const coverAlt = c.thumbnailAlt ?? `${c.client} preview`;
  const meta = [c.sector, c.year].filter(Boolean).join(" · ");

  return (
    <article className="site-wrap">
      <NavLink href="/work" className="case-back">
        ← Work
      </NavLink>

      <header className="case-head">
        {meta && <p className="case-meta">{meta}</p>}
        <h1>{c.client}</h1>
        <p className="case-line">{oneLiner(c)}</p>
        {c.url && (
          <a href={c.url} target="_blank" rel="noopener noreferrer" className="case-visit">
            Visit site ↗
          </a>
        )}
      </header>

      {coverSrc && (
        <div className={`case-cover${c.device === "mobile" ? " case-cover--phone" : ""}`}>
          <Image src={coverSrc} alt={coverAlt} fill priority sizes="(max-width: 1160px) 100vw, 1120px" />
        </div>
      )}

      {features.length > 0 && (
        <ul className="case-grid">
          {features.map((f) => (
            <li key={f.image} className="case-fig">
              <div className={`case-shot${(f.device ?? c.device) === "mobile" ? " case-shot--phone" : ""}`}>
                <Image src={f.image} alt={f.alt ?? f.title} fill sizes="(max-width: 640px) 100vw, 560px" />
              </div>
              <span className="case-cap">{f.title}</span>
            </li>
          ))}
        </ul>
      )}

      <NavLink href={`/work/${next.slug}`} className="case-next">
        <small>Next project</small>
        <span>{next.client}</span>
      </NavLink>
    </article>
  );
}
