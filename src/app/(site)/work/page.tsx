import type { Metadata } from "next";
import { NavLink } from "@/components/site/NavLink";
import Image from "next/image";
import { getCases } from "@/lib/content";
import { groups, caseGroup, oneLiner } from "@/lib/productGroups";
import { GroupHead } from "@/components/site/work/GroupHead";
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

export default async function WorkPage() {
  const cases = await getCases();

  return (
    <>
      <header className="site-wrap work-head">
        <h1>Work</h1>
      </header>

      <div className="site-wrap">
        {groups.map((g) => {
          const items = cases.filter((c) => caseGroup[c.slug] === g.id);
          return (
            <section key={g.id} className="work-group" aria-labelledby={`g-${g.id}`}>
              <GroupHead group={g} />

              {items.length > 0 ? (
                <div className="work-projects">
                  {items.map((c) => (
                    <NavLink key={c.slug} href={`/work/${c.slug}`} className="work-proj">
                      <div className={`work-thumb${c.device === "mobile" ? " work-thumb--phone" : ""}`}>
                        {c.thumbnail && (
                          <Image
                            src={c.thumbnail}
                            alt={c.thumbnailAlt ?? `${c.client} preview`}
                            fill
                            sizes="(max-width: 860px) 100vw, 400px"
                          />
                        )}
                      </div>
                      <div>
                        <h3>{c.client}</h3>
                        <p>{oneLiner(c)}</p>
                      </div>
                    </NavLink>
                  ))}
                </div>
              ) : (
                <p className="work-empty">{g.emptyNote ?? ""}</p>
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
