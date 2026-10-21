import type { Metadata } from "next";
import { NavLink } from "@/components/site/NavLink";
import { KAGU_VIEWBOX, RIBBON, FOLD, WING } from "@/components/KaguMark";
import { GroupIcon } from "@/components/site/work/GroupIcon";
import { pageMetadata, webPageJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import "@/components/site/work/work.css";
import "@/components/site/marketing/marketing.css";

const TITLE = "Marketing — Kagu";
const DESCRIPTION = "Marketing from Kagu. Google, social and ads, kept simple.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/marketing",
  lang: "en",
});

const SERVICES = [
  {
    id: "google",
    title: "Google",
    line: "Show up first.",
    piece: "ribbon",
    items: [
      {
        name: "Search",
        text: "Your site shows up when people look for what you do.",
      },
      { name: "Maps", text: "Your business listing set up and kept fresh." },
      { name: "Reviews", text: "Easy ways to ask happy customers to say so." },
      {
        name: "Speed",
        text: "A fast site, so people stay and Google notices.",
      },
    ],
  },
  {
    id: "social",
    title: "Social",
    line: "Look good there.",
    piece: "fold",
    items: [
      {
        name: "Posts",
        text: "Photos, short videos and stories that look like you.",
      },
      {
        name: "Steady rhythm",
        text: "A calm plan, so you show up every week.",
      },
      { name: "Your look", text: "One style across every profile." },
      {
        name: "Replies",
        text: "Comments and messages answered kindly and fast.",
      },
    ],
  },
  {
    id: "ads",
    title: "Ads",
    line: "That pay off.",
    piece: "wing",
    items: [
      {
        name: "Google and Meta",
        text: "Ads on the places your customers already are.",
      },
      {
        name: "Landing pages",
        text: "A page made for one job, so visits turn into messages.",
      },
      {
        name: "Watching the spend",
        text: "We cut what does not work and keep what does.",
      },
      {
        name: "Plain reports",
        text: "What you spent, what you got, in words.",
      },
    ],
  },
] as const;

const STEPS = [
  { title: "Talk", text: "Tell us what you sell and who buys it." },
  { title: "Plan", text: "We pick what is worth doing and what is not." },
  { title: "Run", text: "We do the work and show you what happened." },
] as const;

export default function MarketingPage() {
  return (
    <>
      <JsonLd
        data={webPageJsonLd({
          title: TITLE,
          description: DESCRIPTION,
          path: "/marketing",
          lang: "en",
        })}
      />

      <section className="site-wrap mk-hero">
        <div className="mk-hero__text">
          <h1>Marketing</h1>
          <p>Get found.</p>
          <NavLink href="/contact?topic=marketing" className="site-btn">
            Let&apos;s talk
          </NavLink>
        </div>
        <svg
          className="mk-draw"
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
              className={`mk-draw__p mk-draw__p--${i + 1}`}
            />
          ))}
        </svg>
      </section>

      <div className="site-wrap">
        {SERVICES.map((s) => (
          <section key={s.id} className="mk-svc" aria-labelledby={`mk-${s.id}`}>
            <div className="mk-svc__head">
              <GroupIcon piece={s.piece} className="mk-svc__ic" />
              <h2 id={`mk-${s.id}`}>{s.title}</h2>
              <p>{s.line}</p>
            </div>
            <ul className="mk-svc__list">
              {s.items.map((it) => (
                <li key={it.name}>
                  <span className="mk-svc__name">{it.name}</span>
                  <span className="mk-svc__text">{it.text}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section className="mk-steps" aria-labelledby="mk-steps-h">
          <h2 id="mk-steps-h">How it goes</h2>
          <ol className="mk-steps__list">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <span className="mk-steps__n" aria-hidden="true">
                  {i + 1}
                </span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mk-with">
          <p>We build the site too, so it all fits together.</p>
          <NavLink href="/work" className="mk-with__link">
            See our work <span aria-hidden="true">&rarr;</span>
          </NavLink>
        </section>

        <section className="mk-close">
          <h2>Got an idea?</h2>
          <NavLink href="/contact?topic=marketing" className="site-btn">
            Let&apos;s talk
          </NavLink>
        </section>
      </div>
    </>
  );
}
