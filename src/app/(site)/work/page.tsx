import type { Metadata } from "next";
import { NavLink } from "@/components/site/NavLink";
import { getCases } from "@/lib/content";
import { groups, caseGroup, oneLiner } from "@/lib/productGroups";
import { GroupHead } from "@/components/site/work/GroupHead";
import { AsciiBanner, AsciiBlock } from "@/components/ascii/AsciiBlock";
import Image from "next/image";
import { frame, rule } from "@/components/ascii/asciiArt";
import { pageMetadata } from "@/lib/seo";
import "@/components/site/work/work.css";

export const metadata: Metadata = pageMetadata({
  title: "Work — Kagu",
  description: "Apps, platforms and smart helpers we have built. See what we made.",
  path: "/work",
  lang: "en",
});

// Static + hourly ISR; admin edits bust this instantly via revalidatePublic().
export const revalidate = 3600;

const SKETCH = frame(
  [
    "",
    "      .-\"\"\"\"-.        .-\"\"\"\"-.",
    "     /  .--.  \\      /  .--.  \\",
    "    |  ( oo )  |    |  ( oo )  |",
    "     \\  '--'  /      \\  '--'  /",
    "      '-.__.-'        '-.__.-'",
    "   " + rule(30, "~-"),
    "   waiting for the first project",
    "",
  ],
  { title: "studio sketch", style: "round", pad: 4 },
);

export default async function WorkPage() {
  const cases = await getCases();
  const sheet = cases
    .map((c) => ({ c, src: c.thumbnail ?? c.features?.find((f) => f.image)?.image }))
    .filter((x): x is { c: (typeof cases)[number]; src: string } => Boolean(x.src));

  return (
    <>
      <header className="site-wrap work-open">
        <h1 className="sr-only">Work</h1>
        <div className="work-open__row">
          <AsciiBanner word="WORK" tone="shimmer" />
          <p className="work-open__lede">
            Apps, platforms and smart helpers. <strong>Things we made, and still look after.</strong>
          </p>
        </div>
        {sheet.length > 0 && (
          <ul className="work-sheet" aria-label="Selected work">
            {sheet.map(({ c, src }) => (
              <li key={c.slug}>
                <NavLink href={`/work/${c.slug}`} className="work-sheet__tile">
                  <span className="work-sheet__img">
                    <Image src={src} alt="" fill sizes="(max-width: 700px) 50vw, 220px" style={{ objectFit: c.device === "mobile" ? "contain" : "cover" }} />
                  </span>
                  <span className="work-sheet__cap">{c.client}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        )}
      </header>

      <div className="site-wrap">
        {groups.map((g, gi) => {
          const items = cases.filter((c) => caseGroup[c.slug] === g.id);
          return (
            <section key={g.id} className="work-group" aria-labelledby={`g-${g.id}`}>
              <GroupHead group={g} index={gi} />

              {items.length > 0 ? (
                <div className="work-projects">
                  {items.map((c, i) => (
                    <NavLink key={c.slug} href={`/work/${c.slug}`} className="work-proj glass">
                      <div className={`work-thumb${c.device === "mobile" ? " work-thumb--phone" : ""}`}>
                        {c.thumbnail && (
                          <Image
                            src={c.thumbnail}
                            alt={c.thumbnailAlt ?? `${c.client} preview`}
                            fill
                            sizes="(max-width: 860px) 100vw, 400px"
                            className="work-thumb__ascii"
                            style={{ objectFit: c.device === "mobile" ? "contain" : "cover" }}
                          />
                        )}
                      </div>
                      <div className="work-proj__body">
                        <span className="work-proj__n">{String(i + 1).padStart(2, "0")}</span>
                        <h3>{c.client}</h3>
                        <p>{oneLiner(c)}</p>
                      </div>
                    </NavLink>
                  ))}
                </div>
              ) : (
                <div className="work-empty glass">
                  <AsciiBlock art={SKETCH} tone="muted" />
                  <p>{g.emptyNote || "New work lands here soon."}</p>
                </div>
              )}
            </section>
          );
        })}

        <p className="work-also">We also design.</p>

        <section className="work-cta">
          <h2>Got an idea?</h2>
          <NavLink href="/contact" className="site-btn">
            Let&apos;s talk
          </NavLink>
        </section>
      </div>
    </>
  );
}
