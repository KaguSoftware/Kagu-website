/*
  EN counterpart of /admin-sistemleri (§4.7) — same cluster, English,
  cross-referenced via hreflang. Price references come from catalog.ts.
*/

import type { Metadata } from "next";
import { SiteFooter } from "@/components/layout/SiteFooter";
import {
  SeoHero,
  SeoSection,
  P,
  A,
  SeoList,
  FaqSection,
  CtaBand,
} from "@/components/seo/blocks";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  pageMetadata,
  webPageJsonLd,
  breadcrumbJsonLd,
  type FaqItem,
} from "@/lib/seo";
import { FEATURES, formatPrice } from "@/components/start-project/catalog";

const PATH = "/admin-systems";
const TR_PATH = "/admin-sistemleri";
const TITLE = "Admin Systems for Boutique Operators · Kagu";
const DESCRIPTION =
  "Admin systems for boutique operators: what they are, how they work and why they matter. Custom admin panel solutions for hotels and service businesses.";

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
    q: "What are admin systems for boutique operators?",
    a: "Admin systems for boutique operators are purpose-built software that streamlines business processes and raises efficiency. Content, enquiries, bookings and customer data are managed from one panel, and the team updates the site and the operation without needing a developer. At Kagu, the admin system runs on the same database as the customer-facing site.",
  },
  {
    q: "How do admin systems work?",
    a: "Admin systems work by bringing every part of the business together and automating its processes. From a single panel you edit content, see incoming enquiries and manage bookings. Every change made in the panel appears instantly on the customer site that shares the same database — nothing is synced by hand.",
  },
  {
    q: "Why do admin systems matter for boutique businesses?",
    a: "Admin systems matter for boutique businesses because they cut costs and raise efficiency, which feeds directly into growth. When work running on paper and Excel moves into one system, double data entry and lost messages disappear. The small team hands routine work to the system and gives its time back to customers.",
  },
];

export default function AdminSystemsPage() {
  const cms = FEATURES.find((f) => f.id === "cms")!;
  const booking = FEATURES.find((f) => f.id === "booking")!;
  const analytics = FEATURES.find((f) => f.id === "analytics")!;

  return (
    <>
      <JsonLd
        data={webPageJsonLd({ title: TITLE, description: DESCRIPTION, path: PATH, lang: "en" })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Kagu", path: "/" },
          { name: "Admin Systems", path: PATH },
        ])}
      />

      <SeoHero
        eyebrow="Guide · Admin Systems"
        title="Admin systems for boutique operators."
        lede="If your operation runs on WhatsApp history, Excel sheets and paper notebooks, this guide is for you. We explain what admin systems are, how they work, and why they hand a boutique business its time back — with production examples."
        langSwitchHref={TR_PATH}
        langSwitchLabel="Türkçe görüntüle"
      />

      <SeoSection index={0} eyebrow="Definition" title="What are admin systems for boutique operators?">
        <P>
          Admin systems for boutique operators are custom software that lets a small team manage
          content, enquiries, bookings and customer data from one panel. What separates them from
          enterprise ERP is scale: only the screens the business actually uses get built, kept
          simple enough to need no training.
        </P>
        <P>
          At Kagu, an admin system is never designed in isolation: it shares one database with
          the customer-facing site. Site pricing is on the{" "}
          <A href="/custom-website-pricing">custom website pricing</A> page; the admin panel
          add-on is {formatPrice(cms.price)}.
        </P>
      </SeoSection>

      <SeoSection index={1} eyebrow="How" title="How do admin systems work?">
        <P>
          Admin systems work by gathering the work scattered across separate tools into one
          database: every change made in the panel appears instantly on the customer site, and
          every enquiry from the site lands in the panel. Manual copying and syncing disappear
          entirely.
        </P>
        <SeoList
          items={[
            <>
              <strong>Content management</strong> — update pages, prices and announcements without
              a developer ({formatPrice(cms.price)}).
            </>,
            <>
              <strong>Enquiry inbox</strong> — requests from the site and forms collect in the
              panel as structured records.
            </>,
            <>
              <strong>Booking management</strong> — calendar, time slots and confirmations (
              {formatPrice(booking.price)}).
            </>,
            <>
              <strong>Reporting</strong> — traffic and conversion insight ({formatPrice(analytics.price)}).
            </>,
          ]}
        />
      </SeoSection>

      <SeoSection index={2} eyebrow="Why" title="Why do admin systems matter for boutique businesses?">
        <P>
          Admin systems matter for boutique businesses because in a small team everyone&apos;s time
          goes to the operation, and paperwork steals directly from time spent with customers.
          The person copying enquiries into Excel, preparing vouchers in Word or searching lists
          in WhatsApp is doing their job twice.
        </P>
        <P>
          The second benefit of a systemised operation is continuity: knowledge lives in the
          system, not in people, so the process survives team changes. An admin system is also
          the core of a wider <A href="/full-stack-platform-cost">full-stack platform</A> —
          payments, accounts and reporting build on top of it.
        </P>
      </SeoSection>

      <SeoSection index={3} eyebrow="Hotels" title="Admin system solutions for hotel management">
        <P>
          Admin systems for hotel management bring room and experience content, booking requests
          and guest communication into one panel. The system&apos;s real test starts when the front
          desk is busy: the panel has to stay usable under Friday-night occupancy pressure.
        </P>
        <P>
          Kagu focuses on hospitality and builds hotel admin panels together with the customer
          site — availability on the site, requests in the panel, both reading the same data.
          For the other tools that fit a boutique hotel, see the{" "}
          <A href="/digital-tools-for-boutique-operators">digital tools guide</A>.
        </P>
      </SeoSection>

      <SeoSection index={4} eyebrow="Services" title="Admin system solutions for the service sector">
        <P>
          Admin systems for the service sector serve appointment- and enquiry-heavy businesses
          like clinics, salons, agencies and consultancies. The typical setup: enquiries from the
          site queue up in the panel, the team updates their status, and the customer is kept
          informed.
        </P>
        <P>
          Our production examples include application tracking for visa consultancy and
          voucher/tour-plan generation for tourism — both are on <A href="/work">our work page</A>.
          To build your own, read how to <A href="/start-project">start a project</A>.
        </P>
      </SeoSection>

      <FaqSection index={5} title="Frequently asked questions" faqs={FAQS} />

      <CtaBand
        title="Let's gather your operation into one panel."
        href="/start-project"
        label="Start a project"
        secondaryHref="/contact"
        secondaryLabel="Write to us"
      />

      <SiteFooter />
    </>
  );
}
