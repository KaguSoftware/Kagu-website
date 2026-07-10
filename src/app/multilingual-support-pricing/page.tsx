/*
  EN counterpart of /multilingual-support-fiyat (§4.6) — same cluster,
  English, cross-referenced via hreflang. Prices come from catalog.ts.
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
import { FEATURES, formatPrice } from "@/components/start-project/catalog";

const PATH = "/multilingual-support-pricing";
const TR_PATH = "/multilingual-support-fiyat";
const TITLE = "Multilingual Support Pricing · Kagu";
const DESCRIPTION =
  "Multilingual website support with clear prices: publish your site in Turkish, English, Arabic and more, with RTL layouts included. Get a quote in minutes.";

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
    q: "What is multilingual support?",
    a: "Multilingual support is a system that serves users in more than one language. For a website it means every page, form and automated e-mail appears in the customer's own language. At Kagu, multilingual support is built as full i18n infrastructure: language routing, translation management, and right-to-left (RTL) layouts for Arabic and Persian.",
  },
  {
    q: "How is the price of multilingual support set?",
    a: "The price follows your support requirements and the size of the operation. At Kagu the multi-language add-on is 15,000 ₺ and covers every language you need; right-to-left (RTL) layout support for Arabic and Persian is an additional 10,000 ₺. Prices are in Turkish Lira and include VAT.",
  },
  {
    q: "How do I create a price quote?",
    a: "A price quote can be created with the quote builder on Kagu's official website. In the project builder you pick your site type and tick the features you need, including multi-language; the total updates live. Send your selection in one click and you'll have an answer within 24 hours.",
  },
];

export default function MultilingualSupportPricingPage() {
  const multilang = FEATURES.find((f) => f.id === "multilang")!;
  const rtl = FEATURES.find((f) => f.id === "rtl")!;
  const llm = FEATURES.find((f) => f.id === "llm")!;

  return (
    <>
      <JsonLd
        data={webPageJsonLd({ title: TITLE, description: DESCRIPTION, path: PATH, lang: "en" })}
      />
      <JsonLd
        data={serviceJsonLd({
          name: "Multilingual Support",
          description:
            "Full i18n for websites: every page in multiple languages, with RTL layout support for Arabic and Persian.",
          path: PATH,
          lang: "en",
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Kagu", path: "/" },
          { name: "Multilingual Support Pricing", path: PATH },
        ])}
      />

      <SeoHero
        eyebrow="Pricing · Multilingual Support"
        title="Multilingual support pricing and quotes."
        lede="In Istanbul — and in most service businesses — customers don't speak one language. This page explains what multilingual website support is, what it costs, and how to build a price quote in minutes."
        langSwitchHref={TR_PATH}
        langSwitchLabel="Türkçe görüntüle"
      />

      <SeoSection index={0} eyebrow="Definition" title="What is multilingual support?">
        <P>
          Multilingual support means your website and digital tools serve customers in more than
          one language: every page, form and automated e-mail appears in the visitor&apos;s own
          language. What separates it from a simple translation plugin is full i18n
          infrastructure — languages are routed at the URL level and search engines index each
          language as its own page.
        </P>
        <P>
          The Kagu team communicates in Turkish, English, Arabic, Persian and Russian, and the
          systems we build publish in every language you need. For Arabic and Persian the text
          direction flips to right-to-left (RTL) with typography adjusted to match.
        </P>
      </SeoSection>

      <SeoSection index={1} eyebrow="Prices" title="Multilingual support prices">
        <P>
          Multilingual support at Kagu has listed prices: the multi-language add-on is{" "}
          {formatPrice(multilang.price)}, and RTL layout support for Arabic and Persian is an
          additional {formatPrice(rtl.price)}. Prices are in Turkish Lira, VAT included — there is
          no hidden per-language multiplier.
        </P>
        <PriceTable
          headers={["Service", "Scope", "Price"]}
          rows={[
            [multilang.label, "Full i18n — every page in every language you need", `+ ${formatPrice(multilang.price)}`],
            [rtl.label, "Arabic & Persian — mirrored layouts and typography", `+ ${formatPrice(rtl.price)}`],
            [llm.label, "AI-assisted translation and smart drafting (optional)", `+ ${formatPrice(llm.price)}`],
          ]}
          note="These are add-on prices, applied on top of a site package. See custom website pricing for the packages."
        />
        <P>
          Multilingual support isn&apos;t sold on its own; it attaches to a site or platform
          package. Package prices are on the{" "}
          <A href="/custom-website-pricing">custom website pricing</A> page, and platform scope on{" "}
          <A href="/full-stack-platform-cost">full-stack platform cost</A>.
        </P>
      </SeoSection>

      <SeoSection index={2} eyebrow="Quote" title="Creating a price quote">
        <P>
          Creating a price quote at Kagu takes three steps and no waiting on forms: you make your
          selection in the project builder, watch the live total, and send it to us in one click.
          Quotes are answered within 24 hours.
        </P>
        <SeoList
          ordered
          items={[
            <>
              Open the <A href="/start-project">project builder</A> and pick your site type.
            </>,
            <>
              Tick <strong>Multi-language</strong> (and <strong>RTL</strong> if you need it); the
              total updates instantly.
            </>,
            <>
              Send your selection — it reaches us as a structured quote request.
            </>,
          ]}
        />
      </SeoSection>

      <SeoSection index={3} eyebrow="Services" title="Multilingual support services">
        <P>
          Kagu&apos;s multilingual support doesn&apos;t end at setup; the language infrastructure
          runs through every layer of the site. The scope includes multilingual content
          structure, per-language SEO (hreflang tags), RTL layout, and the ability to update
          content in every language from your own panel.
        </P>
        <P>
          So your team can manage multilingual content, we recommend pairing it with an{" "}
          <A href="/admin-systems">admin system</A> — each language&apos;s content edited from one
          panel. For multilingual examples in production, see <A href="/work">our work</A>.
        </P>
      </SeoSection>

      <SeoSection index={4} eyebrow="For you" title="A quote that fits your business">
        <P>
          The right quote depends on how many languages and which features your business actually
          needs, which is why we give a live-calculated quote instead of a standard PDF price
          list. We don&apos;t like bureaucracy: the quote process never turns into an e-mail
          chain.
        </P>
        <P>
          Not sure yet? <A href="/contact">Write to us</A> and we&apos;ll work out together which
          languages and what scope you really need. You can write in Turkish, English, Arabic,
          Persian or Russian — we reply within 24 hours.
        </P>
      </SeoSection>

      <FaqSection index={5} title="Frequently asked questions" faqs={FAQS} />

      <CtaBand
        title="See the price of your multilingual site now."
        href="/start-project"
        label="Build a quote"
        secondaryHref="/contact"
        secondaryLabel="Write to us"
      />

      <SiteFooter />
    </>
  );
}
