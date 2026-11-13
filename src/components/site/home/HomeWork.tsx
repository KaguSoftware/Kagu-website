import { AsciiReveal } from "@/components/ascii/AsciiReveal";
import { NavLink } from "@/components/site/NavLink";
import { AsciiBlock } from "@/components/ascii/AsciiBlock";
import { frame, rule } from "@/components/ascii/asciiArt";
import type { Case } from "@/lib/content";
import "./home.css";

const ONE_LINERS: Record<string, string> = {
  "sabrina-turizm": "Tours, booked online.",
  upperdeck: "A menu you order from.",
  genbuzz: "AI writes the paperwork.",
  "vize-makinesi": "Visa rules, made simple.",
  four: "Our own iPhone app.",
};

function oneLiner(c: Case): string {
  if (ONE_LINERS[c.slug]) return ONE_LINERS[c.slug];
  const first = (c.lede ?? "").split(/(?<=[.!?])\s/)[0] ?? "";
  const words = first
    .replace(/[.!?]+$/, "")
    .split(/\s+/)
    .filter(Boolean);
  return words.length
    ? words.slice(0, 6).join(" ") + (words.length > 6 ? "…" : ".")
    : "";
}

function sector(c: Case): string {
  return (c.sector ?? "").split("·")[0].trim();
}

/* empty state: a wireframe of a project page, waiting for content (plain ASCII only) */
const EMPTY_ART = frame(
  [
    "kagu / next project",
    rule(44, "-"),
    "  .----------------.   ########## ####",
    "  |  .-------.     |   ######## ######",
    "  |  | ::::: |  o  |   ::::::::::: ::",
    "  |  | ::::: |     |   ::::::::: ::::",
    "  |  '-------'     |",
    "  |   ~~~  ~~~  ~  |   [ ........... ]",
    "  '----------------'",
    rule(44, ". "),
  ],
  { title: "preview", style: "round" },
);

export function HomeWork({ cases }: { cases: readonly Case[] }) {
  return (
    <section className="hsec site-wrap" aria-labelledby="home-work">
      <header className="hwork__head">
        <p className="hlabel">
          <span>01</span> Selected work
        </p>
        <h2 id="home-work">Things we&rsquo;ve built</h2>
      </header>

      {cases.length === 0 ? (
        <div className="hwork__empty">
          <AsciiBlock art={EMPTY_ART} tone="muted" size="clamp(8px, 1.5vw, 13px)" />
          <p>New projects land here soon.</p>
        </div>
      ) : (
        <div className="rows">
          {cases.map((c, i) => (
            <NavLink key={c.slug} className="row" href={`/work/${c.slug}`}>
              <span className="row__num" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="row__name">{c.client}</span>
              <span className="row__meta">
                <small>{sector(c)}</small>
                <span>{oneLiner(c)}</span>
              </span>
              <span className="row__thumb">
                {c.thumbnail && (
                  <AsciiReveal
                    src={c.thumbnail}
                    alt=""
                    sizes="(max-width: 760px) 120px, 300px"
                    reveal="hover"
                    fit={c.device === "mobile" ? "contain" : "cover"}
                    fontSize={4}
                    className="row__ascii"
                  />
                )}
              </span>
              <span className="row__arr" aria-hidden="true">
                &rarr;
              </span>
            </NavLink>
          ))}
        </div>
      )}
    </section>
  );
}
