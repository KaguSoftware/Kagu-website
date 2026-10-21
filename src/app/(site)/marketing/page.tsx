import type { Metadata } from "next";
import Link from "next/link";
import { KaguMark } from "@/components/KaguMark";
import { pageMetadata, webPageJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import "@/components/site/marketing/marketing.css";

const TITLE = "Marketing — Kagu";
const DESCRIPTION =
  "Marketing from Kagu. Google, social and ads, kept simple.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/marketing",
  lang: "en",
});

const ITEMS = [
  { title: "Google", line: "Show up first.", piece: "ribbon" },
  { title: "Social", line: "Look good there.", piece: "fold" },
  { title: "Ads", line: "That pay off.", piece: "wing" },
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
        <h1>Marketing</h1>
        <p>Get found.</p>
      </section>

      <div className="site-wrap">
        <ul className="mk-items">
          {ITEMS.map((i) => (
            <li key={i.title} className="mk-item">
              <KaguMark variant="outline" piece={i.piece} className="mk-icon" />
              <h2>{i.title}</h2>
              <p>{i.line}</p>
            </li>
          ))}
        </ul>
      </div>

      <section className="site-wrap mk-close">
        <h2>Got an idea?</h2>
        <Link href="/about?topic=marketing#contact" className="site-btn">
          Let&apos;s talk
        </Link>
      </section>
    </>
  );
}
