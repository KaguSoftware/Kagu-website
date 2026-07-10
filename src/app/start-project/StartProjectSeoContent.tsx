/*
  §4.5 — server-rendered content for /start-project, below the builder.
  Answer-first sections + FAQ (mirrored into FAQPage JSON-LD) so the page's
  cluster copy exists in the raw HTML while the builder stays interactive.
*/

import {
  SeoSection,
  P,
  A,
  SeoList,
  FaqSection,
} from "@/components/seo/blocks";
import { JsonLd } from "@/components/seo/JsonLd";
import { serviceJsonLd, webPageJsonLd, type FaqItem } from "@/lib/seo";
import {
  WEBSITE_TYPES,
  formatPrice,
} from "@/components/start-project/catalog";

export const START_PROJECT_FAQS: FaqItem[] = [
  {
    q: "How do I start a project with Kagu?",
    a: "To start a project with Kagu, begin by contacting us to discuss your custom software needs and requirements. The fastest route is the package builder above: pick a starting point, add the components you need, and send the estimate over in one click. Prefer talking first? Write to us and we reply within 24 hours.",
  },
  {
    q: "What is the process of starting a project?",
    a: "The process of starting a project with Kagu involves listening to your needs, mapping out a solution, shipping the product, and handing over the final result. You see a concrete scope and price before anything is built, working software during the build, and full control of the system at handover.",
  },
  {
    q: "What kind of projects does Kagu handle?",
    a: "Kagu handles custom-built software projects for boutique operators in the hospitality and service industries, including custom websites, digital tools, and full-stack platforms. Every project pairs a customer-facing surface with an operator admin on one database, with multilingual support available in every build.",
  },
];

const TITLE = "Start a Project · Kagu";
const DESCRIPTION =
  "Begin your custom software project with Kagu, experts in boutique operator solutions.";

export function StartProjectSeoContent() {
  const cheapest = WEBSITE_TYPES.reduce((a, b) => (a.basePrice < b.basePrice ? a : b));
  const priciest = WEBSITE_TYPES.reduce((a, b) => (a.basePrice > b.basePrice ? a : b));

  return (
    <>
      <JsonLd
        data={webPageJsonLd({
          title: TITLE,
          description: DESCRIPTION,
          path: "/start-project",
          lang: "en",
        })}
      />
      <JsonLd
        data={serviceJsonLd({
          name: "Start a Project",
          description:
            "Project intake for custom software: assemble a package with a live estimate, or start with a conversation.",
          path: "/start-project",
          lang: "en",
        })}
      />

      <SeoSection index={0} eyebrow="Getting started" title="Getting started with your custom software project">
        <P>
          Starting a custom software project with Kagu takes one of two routes: assemble a
          package in the builder above and send it with a live estimate, or{" "}
          <A href="/contact">write to us</A> and start with a conversation. Both reach the same
          people — the team that builds the software is the team that replies, within 24 hours,
          in Turkish, English, Arabic, Persian or Russian.
        </P>
      </SeoSection>

      <SeoSection index={1} eyebrow="Your needs" title="Understanding your needs: how Kagu listens and maps a solution">
        <P>
          Kagu starts every project by listening to what you&apos;re trying to make easier — a
          booking flow, a paper process, an admin your team avoids — and then maps the smallest
          system that solves it. We work with boutique operators in hospitality and service, so
          the questions are concrete: who enters the data, who reads it, and what happens on a
          busy Friday night.
        </P>
        <P>
          The map comes back to you as a scope with a price and a schedule. Nothing is built
          before you&apos;ve seen and agreed to both.
        </P>
      </SeoSection>

      <SeoSection index={2} eyebrow="Process" title="The process of starting a project with Kagu">
        <P>
          The process of starting a project with Kagu has four steps: listen, map, ship, hand
          over. It is designed so you see working software early and own the result completely.
        </P>
        <SeoList
          ordered
          items={[
            <>
              <strong>Listen.</strong> We understand your operation and what slows it down.
            </>,
            <>
              <strong>Map.</strong> You receive a concrete scope, price and schedule.
            </>,
            <>
              <strong>Ship.</strong> We build on Next.js and Supabase and put it in production —
              in weeks, not quarters.
            </>,
            <>
              <strong>Hand over.</strong> Control passes fully to your team; handover is the
              moment you stop needing us.
            </>,
          ]}
        />
      </SeoSection>

      <SeoSection index={3} eyebrow="Expectations" title="What to expect: timeline, price factors and requirements">
        <P>
          Expect production software in weeks, package prices starting at{" "}
          {formatPrice(cheapest.basePrice)} for a {cheapest.label.toLowerCase()} site and{" "}
          {formatPrice(priciest.basePrice)} for {priciest.label.toLowerCase()}, and a scope agreed
          before the build starts. Prices are in Turkish Lira, VAT included, with add-ons listed
          individually — full details on the{" "}
          <A href="/custom-website-pricing">custom website pricing</A> page.
        </P>
        <P>
          What we need from you is knowledge of your own operation, not technical documents. If
          your scope includes an admin panel or payments, the{" "}
          <A href="/full-stack-platform-cost">full-stack platform cost</A> page shows how those
          components are priced.
        </P>
      </SeoSection>

      <SeoSection index={4} eyebrow="Why Kagu" title="Why choose Kagu for your boutique operator software needs">
        <P>
          Choose Kagu for vertical depth and focus: a small Istanbul studio building only for
          boutique operators, with every delivered system running in production. No awards wall,
          no unnecessary features — the projects on <A href="/work">our work page</A> are the
          argument, and <A href="/about">the people behind them</A> are who you&apos;ll talk to.
        </P>
      </SeoSection>

      <FaqSection index={5} title="Frequently asked questions" faqs={START_PROJECT_FAQS} />
    </>
  );
}
