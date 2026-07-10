/*
  EN counterpart of /custom-website-fiyati (§4.2) — same cluster, English,
  cross-referenced via hreflang. Prices come from the start-project catalog.
*/

import type { Metadata } from "next";
import { SiteFooter } from "@/components/layout/SiteFooter";
import {
  SeoHero,
  SeoSection,
  P,
  A,
  SeoList,
  PriceTable,
  FaqSection,
  CtaBand,
} from "@/components/seo/blocks";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  pageMetadata,
  serviceJsonLd,
  webPageJsonLd,
  breadcrumbJsonLd,
  type FaqItem,
} from "@/lib/seo";
import {
  WEBSITE_TYPES,
  FEATURES,
  formatPrice,
  BRANDING_PRICE,
} from "@/components/start-project/catalog";

const PATH = "/custom-website-pricing";
const TR_PATH = "/custom-website-fiyati";
const TITLE = "Custom Website Pricing · Kagu";
const DESCRIPTION =
  "Custom website pricing with real numbers: package prices, the design process, and what drives cost. Built by Kagu for boutique operators and small teams.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  lang: "en",
  enPath: PATH,
  trPath: TR_PATH,
});

const FAQS: FaqItem[] = [
  {
    q: "How much does a custom website cost?",
    a: "A custom website from Kagu starts at 30,000 ₺ for a portfolio site and 80,000 ₺ for an e-commerce store, with the final price set by scope. Add-ons like booking, multi-language support or an admin panel are priced individually. The project builder shows a live total as you pick options.",
  },
  {
    q: "How is a custom website built?",
    a: "A custom website is designed and developed by a specialist team, and Kagu delivers it in four steps: we listen to what you need, map the solution, build it on Next.js and Supabase, and ship it to production. The design starts from your actual workflow, never from a template.",
  },
  {
    q: "How long does a custom website take?",
    a: "The timeline depends on project complexity, but Kagu ships production websites in weeks, not quarters. Once the scope is agreed you receive a concrete schedule together with the quote, and you see working software throughout the build rather than at the end.",
  },
];

export default function CustomWebsitePricingPage() {
  const [portfolio, service, restaurant, ecommerce] = [
    WEBSITE_TYPES.find((t) => t.id === "portfolio")!,
    WEBSITE_TYPES.find((t) => t.id === "service")!,
    WEBSITE_TYPES.find((t) => t.id === "restaurant")!,
    WEBSITE_TYPES.find((t) => t.id === "ecommerce")!,
  ];
  const feature = (id: string) => FEATURES.find((f) => f.id === id)!;

  return (
    <>
      <JsonLd
        data={webPageJsonLd({ title: TITLE, description: DESCRIPTION, path: PATH, lang: "en" })}
      />
      <JsonLd
        data={serviceJsonLd({
          name: "Custom Website",
          description:
            "Custom-designed websites for boutique operators and small teams, built on Next.js and Supabase.",
          path: PATH,
          lang: "en",
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Kagu", path: "/" },
          { name: "Custom Website Pricing", path: PATH },
        ])}
      />

      <SeoHero
        eyebrow="Pricing · Custom Website"
        title="Custom website pricing: real numbers, clear scope."
        lede="Custom website prices shouldn't be a mystery. At Kagu every package is listed with a real price; when the scope changes, the price changes transparently. This page covers package prices, the design process, and the factors that drive cost."
        langSwitchHref={TR_PATH}
        langSwitchLabel="Türkçe görüntüle"
      />

      <SeoSection index={0} eyebrow="Prices" title="Custom website prices">
        <P>
          Custom website prices at Kagu start between {formatPrice(portfolio.basePrice)} and{" "}
          {formatPrice(ecommerce.basePrice)} depending on the type of site. Every package covers
          design, development, launch and handover. Prices are in Turkish Lira and include VAT.
        </P>
        <PriceTable
          headers={["Site type", "Best for", "Starting price"]}
          rows={[
            [portfolio.label, "Studios, portfolios, case studies", formatPrice(portfolio.basePrice)],
            [service.label, "Clinics, salons, agencies — sites built to win enquiries", formatPrice(service.basePrice)],
            [restaurant.label, "Restaurants — menu, atmosphere, reservations", formatPrice(restaurant.basePrice)],
            [ecommerce.label, "Online stores with catalog, cart and checkout", formatPrice(ecommerce.basePrice)],
          ]}
          note="Prices in TL, VAT included. Payments are handled securely through iyzico with Visa/MasterCard."
        />
        <P>
          For an exact figure,{" "}
          <A href="/start-project">assemble your package in the project builder</A> and watch the
          total update live, or <A href="/contact">write to us</A> for a tailored quote. We reply
          within 24 hours.
        </P>
      </SeoSection>

      <SeoSection index={1} eyebrow="Why" title="Why a custom website?">
        <P>
          A custom website is designed around your actual workflow and includes only the features
          your business needs, unlike template site builders that sell one-size-fits-all. A
          boutique operation&apos;s booking flow, multilingual customer base or particular way of
          working rarely fits a generic mold.
        </P>
        <P>
          Kagu focuses on boutique operators: small teams in hospitality and services. We think
          about your operation, not just your homepage — enquiries arriving as structured WhatsApp
          or Telegram messages, or content managed from your own{" "}
          <A href="/admin-systems">admin panel</A>. We don&apos;t sell unnecessary features; we
          build the smallest system that solves the problem.
        </P>
      </SeoSection>

      <SeoSection index={2} eyebrow="Process" title="The custom website design process">
        <P>
          The custom website process at Kagu has four steps, and production goes live in weeks.
          Each step has a concrete deliverable, so you can see what you&apos;re getting at every
          stage.
        </P>
        <SeoList
          ordered
          items={[
            <>
              <strong>Listen.</strong> We talk about what you&apos;re trying to make easier —
              starting from your operation, not a form.
            </>,
            <>
              <strong>Map.</strong> We define the scope, pages and features, and send it back as a
              plan with a price and schedule.
            </>,
            <>
              <strong>Build.</strong> We develop the site on Next.js and Supabase; the design is
              made from scratch around your brand.
            </>,
            <>
              <strong>Hand over.</strong> The site ships to production and control passes fully to
              you — handover is the moment you stop needing us.
            </>,
          ]}
        />
      </SeoSection>

      <SeoSection index={3} eyebrow="Cost" title="What drives the cost of a custom website?">
        <P>
          Three factors drive custom website cost: the type of site, the features you select, and
          the depth of the design. The base package covers the site itself; the add-ons you need
          are priced individually on top.
        </P>
        <PriceTable
          headers={["Add-on", "What it gives you", "Price"]}
          rows={[
            [feature("cms").label, "Edit content yourself — no developer needed", `+ ${formatPrice(feature("cms").price)}`],
            [feature("booking").label, "Calendar, time slots, confirmations", `+ ${formatPrice(feature("booking").price)}`],
            [feature("multilang").label, "Every page in every language you need", `+ ${formatPrice(feature("multilang").price)}`],
            [feature("payments").label, "Cards and local methods, securely handled", `+ ${formatPrice(feature("payments").price)}`],
            [feature("seo").label, "Technical SEO, structured data, sitemaps", `+ ${formatPrice(feature("seo").price)}`],
            ["Brand identity", "We design the identity instead of you picking colors", `+ ${formatPrice(BRANDING_PRICE)}`],
          ]}
          note="All add-on prices come from our live catalog; the full list is in the project builder."
        />
        <P>
          Planning a multilingual site? See{" "}
          <A href="/multilingual-support-pricing">multilingual support pricing</A> for details. If
          you need an admin panel and workflows beyond the site itself, start from{" "}
          <A href="/full-stack-platform-cost">full-stack platform cost</A>.
        </P>
      </SeoSection>

      <SeoSection index={4} eyebrow="Examples" title="Custom website examples">
        <P>
          Kagu&apos;s custom website examples come from hospitality and service businesses, and
          every one of them is in production with real customers. In tourism, visa consultancy and
          food &amp; beverage we build the customer-facing site and the operator&apos;s admin panel
          against the same database.
        </P>
        <P>
          Browse the live projects with screenshots and scope notes on{" "}
          <A href="/work">our work page</A>, or see which tools fit your operation in the{" "}
          <A href="/digital-tools-for-boutique-operators">
            digital tools for boutique operators
          </A>{" "}
          guide.
        </P>
      </SeoSection>

      <FaqSection index={5} title="Frequently asked questions" faqs={FAQS} />

      <CtaBand
        title="Assemble your package, see the price instantly."
        href="/start-project"
        label="Get an estimate"
        secondaryHref="/contact"
        secondaryLabel="Ask us directly"
      />

      <SiteFooter />
    </>
  );
}
