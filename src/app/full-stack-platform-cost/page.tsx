/*
  EN counterpart of /full-stack-platform-maliyeti (§4.4) — same cluster,
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
import {
  WEBSITE_TYPES,
  FEATURES,
  formatPrice,
} from "@/components/start-project/catalog";

const PATH = "/full-stack-platform-cost";
const TR_PATH = "/full-stack-platform-maliyeti";
const TITLE = "Full-Stack Platform Cost · Kagu";
const DESCRIPTION =
  "What is a full-stack platform and what drives its cost? Real line-item prices, the development process and production examples — a transparent guide from Kagu.";

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
    q: "What does a full-stack platform cost?",
    a: "A full-stack platform's cost depends on your business size, requirements and the technology used. At Kagu, base packages start between 30,000 ₺ and 80,000 ₺, and platform components like an admin panel, user accounts, payments and reporting are added at listed prices. Once the scope is set you get a single, surprise-free total.",
  },
  {
    q: "How is a full-stack platform developed?",
    a: "Developing a full-stack platform takes a specialist team and proper planning. At Kagu the process starts by listening to the need; the scope is mapped, the customer side and the admin side are developed on one database, and production goes live in weeks. At handover, control passes fully to you.",
  },
  {
    q: "Which technologies are used for a full-stack platform?",
    a: "Full-stack platforms are built with a mix of languages and frameworks. Kagu's standard stack is Next.js (a React-based web framework), Supabase (database and authentication) and Vercel (hosting). This stack gives fast development, secure identity management and low running costs.",
  },
];

export default function FullStackPlatformCostPage() {
  const ecommerce = WEBSITE_TYPES.find((t) => t.id === "ecommerce")!;
  const portfolio = WEBSITE_TYPES.find((t) => t.id === "portfolio")!;
  const feature = (id: string) => FEATURES.find((f) => f.id === id)!;

  return (
    <>
      <JsonLd
        data={webPageJsonLd({ title: TITLE, description: DESCRIPTION, path: PATH, lang: "en" })}
      />
      <JsonLd
        data={serviceJsonLd({
          name: "Full-Stack Platform",
          description:
            "Full-scope platforms for boutique businesses — the customer side and the admin side running on one database.",
          path: PATH,
          lang: "en",
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Kagu", path: "/" },
          { name: "Full-Stack Platform Cost", path: PATH },
        ])}
      />

      <SeoHero
        eyebrow="Pricing · Full-Stack Platform"
        title="Full-stack platform cost, line by line."
        lede="Most providers answer 'it depends on the project' when asked what a full-stack platform costs. This page does the opposite: it lists the components a platform is made of, the real price of each, and what determines the total."
        langSwitchHref={TR_PATH}
        langSwitchLabel="Türkçe görüntüle"
      />

      <SeoSection index={0} eyebrow="Definition" title="What is a full-stack platform?">
        <P>
          A full-stack platform is software that combines a business&apos;s customer-facing side
          (website, booking, payments) and its internal operation (admin panel, content
          management, reporting) in one system. &quot;Full stack&quot; means the front end and the
          back end — the visible site plus the database and business logic — are developed
          together.
        </P>
        <P>
          For a boutique business, the practical meaning is this: the site your customer sees and
          the <A href="/admin-systems">admin system</A> your team uses share one database. No
          information is entered twice, and no list is synced by hand.
        </P>
      </SeoSection>

      <SeoSection index={1} eyebrow="Cost" title="Full-stack platform cost">
        <P>
          At Kagu, a full-stack platform is priced as a base package plus components; base
          packages start between {formatPrice(portfolio.basePrice)} and{" "}
          {formatPrice(ecommerce.basePrice)}. Prices are in Turkish Lira and include VAT. The
          table below shows the components platforms use most.
        </P>
        <PriceTable
          headers={["Platform component", "What it gives you", "Price"]}
          rows={[
            [feature("cms").label, "Content and operations management — the platform's admin side", `+ ${formatPrice(feature("cms").price)}`],
            [feature("auth").label, "Sign-up, login, password reset, profiles", `+ ${formatPrice(feature("auth").price)}`],
            [feature("booking").label, "Calendar, time slots, confirmations", `+ ${formatPrice(feature("booking").price)}`],
            [feature("payments").label, "Cards and local methods, securely handled", `+ ${formatPrice(feature("payments").price)}`],
            [feature("analytics").label, "Traffic and conversion insight", `+ ${formatPrice(feature("analytics").price)}`],
            [feature("llm").label, "AI chat, translation, smart drafting", `+ ${formatPrice(feature("llm").price)}`],
            [feature("pdf").label, "Documents generated server-side, downloadable in a click", `+ ${formatPrice(feature("pdf").price)}`],
          ]}
          note="Prices in TL, VAT included. For the full component list and a live total, use the project builder."
        />
      </SeoSection>

      <SeoSection index={2} eyebrow="Process" title="The full-stack platform development process">
        <P>
          The full-stack platform process at Kagu has four steps, and production goes live in
          weeks — not quarters. The platform ships in usable pieces rather than all at once, so
          your team starts using the system before development ends.
        </P>
        <SeoList
          ordered
          items={[
            <>
              <strong>Listen.</strong> We understand your operation and what slows it down.
            </>,
            <>
              <strong>Map.</strong> We define the components, the data model and the build order,
              and present it with a price.
            </>,
            <>
              <strong>Build.</strong> The customer side and the admin side are developed together
              on Next.js + Supabase.
            </>,
            <>
              <strong>Hand over.</strong> The platform goes to production and control passes to
              you; new components are added as needs grow.
            </>,
          ]}
        />
      </SeoSection>

      <SeoSection index={3} eyebrow="Examples" title="Full-stack platform examples and use cases">
        <P>
          Full-stack platform examples include tour sales with reservations, visa application
          tracking and content-production panels — all three are Kagu projects running in
          production. In tourism, the customer picks a package while the team generates vouchers
          and tour plans from the same system; in visa consultancy, application status is tracked
          from one panel.
        </P>
        <P>
          Screenshots and scope notes for these projects are on <A href="/work">our work page</A>.
          To see which tools fit your own operation, read the{" "}
          <A href="/digital-tools-for-boutique-operators">digital tools guide</A>.
        </P>
      </SeoSection>

      <SeoSection index={4} eyebrow="Benefits" title="How a full-stack platform helps a boutique business">
        <P>
          A full-stack platform gives a boutique business three concrete benefits: it cuts
          paperwork, gathers the operation onto one screen, and speeds up the customer experience.
          Double data entry disappears; enquiries, bookings and content are managed in one place.
        </P>
        <P>
          For a small team that means time: the person merging reports in Excel or digging
          through message folders goes back to their real job. The test of a system is whether
          the team uses it on a busy Friday night — we design our platforms against that measure.
        </P>
      </SeoSection>

      <SeoSection index={5} eyebrow="Factors" title="Factors that drive full-stack platform cost">
        <P>
          Four factors drive full-stack platform cost: the number of components, the complexity of
          custom workflows, the number of languages, and integrations. Each factor maps to the
          listed line items in the table — there are no hidden ones.
        </P>
        <SeoList
          items={[
            <>
              <strong>Component count</strong> — each module (accounts, payments, booking…) is
              priced separately.
            </>,
            <>
              <strong>Custom workflows</strong> — processes unique to you (e.g. voucher
              generation) are quoted by scope.
            </>,
            <>
              <strong>Language count</strong> — multi-language starts at{" "}
              {formatPrice(feature("multilang").price)}; details on the{" "}
              <A href="/multilingual-support-pricing">multilingual support pricing</A> page.
            </>,
            <>
              <strong>Integrations</strong> — connections to external systems such as WhatsApp,
              Telegram or payment providers.
            </>,
          ]}
        />
        <P>
          If all you need is a website, start from{" "}
          <A href="/custom-website-pricing">custom website pricing</A> instead.
        </P>
      </SeoSection>

      <FaqSection index={6} title="Frequently asked questions" faqs={FAQS} />

      <CtaBand
        title="Price your platform, line by line."
        href="/start-project"
        label="Get an estimate"
        secondaryHref="/contact"
        secondaryLabel="Ask us directly"
      />

      <SiteFooter />
    </>
  );
}
