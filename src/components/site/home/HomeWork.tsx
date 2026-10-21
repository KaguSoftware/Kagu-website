import Link from "next/link";
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

export function HomeWork({ cases }: { cases: readonly Case[] }) {
  return (
    <section className="hsec site-wrap" aria-labelledby="home-work">
      <h2 id="home-work">Our work.</h2>
      <div className="rows">
        {cases.map((c) => (
          <Link key={c.slug} className="row" href={`/work/${c.slug}`}>
            <span className="row__name">{c.client}</span>
            <span className="row__meta">
              <small>{sector(c)}</small>
              <span>{oneLiner(c)}</span>
            </span>
            <span className="row__arr" aria-hidden="true">
              &rarr;
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
