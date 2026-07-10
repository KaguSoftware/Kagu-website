/*
  EN counterpart of /butik-operatoler-dijital-arac (§4.3) — same cluster,
  English, cross-referenced via hreflang.
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

const PATH = "/digital-tools-for-boutique-operators";
const TR_PATH = "/butik-operatoler-dijital-arac";
const TITLE = "Digital Tools for Boutique Operators · Kagu";
const DESCRIPTION =
  "Digital tools for boutique operators: booking systems, admin panels, multilingual websites and automation — software that makes small operations easier.";

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
    q: "What are digital tools for boutique operators?",
    a: "Digital tools for boutique operators are purpose-built software that streamlines daily operations and raises efficiency for small teams. The core set: a customer-facing website, a booking system, an operator admin panel, multilingual content support, and automations that connect to channels like WhatsApp or Telegram. The right mix follows the operation's actual workflow.",
  },
  {
    q: "How does digital transformation work in a boutique business?",
    a: "Digital transformation in a boutique business starts by moving the single most time-consuming process into software, then expanding step by step. First identify the work running on paper or scattered tools, then build the smallest system that solves it. Focused solutions that go live in weeks beat large platform projects that take quarters.",
  },
  {
    q: "What are custom software solutions for boutique operators?",
    a: "Custom software solutions for boutique operators are systems designed and built around a specific business's needs. At Kagu they come as custom websites, admin systems, booking flows, multilingual support and full-stack platforms. Everything runs on one database, so the customer-facing side and the operator side always stay in sync.",
  },
];

export default function DigitalToolsForBoutiqueOperatorsPage() {
  return (
    <>
      <JsonLd
        data={webPageJsonLd({ title: TITLE, description: DESCRIPTION, path: PATH, lang: "en" })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Kagu", path: "/" },
          { name: "Digital Tools for Boutique Operators", path: PATH },
        ])}
      />

      <SeoHero
        eyebrow="Guide · Digital Tools"
        title="Digital tools for boutique operators."
        lede="You shouldn't have to run a boutique operation on software built for big chains. This guide covers the digital tools that actually make boutique operators' work easier — from booking and admin panels to multilingual sites and messaging automation."
        langSwitchHref={TR_PATH}
        langSwitchLabel="Türkçe görüntüle"
      />

      <SeoSection index={0} eyebrow="Definition" title="What are digital tools for boutique operators?">
        <P>
          Digital tools for boutique operators are software that lets a small team run its daily
          operation — bookings, enquiry handling, content updates, customer communication — from
          one place. Unlike enterprise systems, they are shaped around the boutique operation&apos;s
          own workflow and carry no features the team won&apos;t use.
        </P>
        <SeoList
          items={[
            <>
              <strong>Customer-facing website</strong> — the face that tells your story and wins
              enquiries; see <A href="/custom-website-pricing">custom website pricing</A> for real
              numbers.
            </>,
            <>
              <strong>Admin panel</strong> — manage content, enquiries and operations from one
              screen; details in the <A href="/admin-systems">admin systems guide</A>.
            </>,
            <>
              <strong>Booking &amp; calendar</strong> — time slots, confirmations, reminders.
            </>,
            <>
              <strong>Multilingual support</strong> — every page in every language, including
              Turkish, English and Arabic.
            </>,
            <>
              <strong>Messaging automation</strong> — enquiries arrive as structured WhatsApp or
              Telegram messages.
            </>,
          ]}
        />
      </SeoSection>

      <SeoSection index={1} eyebrow="Transformation" title="Digital transformation in boutique businesses">
        <P>
          Digital transformation in a boutique business starts by moving the process that
          generates the most paperwork and message traffic into software — not with a giant
          platform project. Issuing vouchers, preparing tour plans, or tracking enquiries in Excel
          are usually the first candidates.
        </P>
        <P>
          The advantage of this approach is speed: a focused system goes live in weeks and the
          team actually uses it. A used system produces data, and the next step builds on that
          data. Kagu&apos;s production projects grew exactly this way — see the examples on{" "}
          <A href="/work">our work page</A>.
        </P>
      </SeoSection>

      <SeoSection index={2} eyebrow="Solutions" title="Custom software solutions for boutique operators">
        <P>
          Custom software solutions for boutique operators step in where off-the-shelf packages
          don&apos;t fit: the business&apos;s own process becomes the software. Kagu builds these so
          the customer side and the operator side share one database — the site and the admin
          panel never drift apart.
        </P>
        <P>
          When the scope is bigger than a website — payments, accounts and reporting included —
          the right model is a full-stack platform. We list the cost drivers transparently on the{" "}
          <A href="/full-stack-platform-cost">full-stack platform cost</A> page.
        </P>
      </SeoSection>

      <SeoSection index={3} eyebrow="Istanbul" title="Digital tools for boutique operators in Istanbul">
        <P>
          For boutique operators in Istanbul, the single most important property of any digital
          tool is multilingualism: the customer base speaks Turkish, English, Arabic, Persian and
          Russian. Kagu is an Istanbul-based studio that communicates in all five — and the
          systems we build publish in them too.
        </P>
        <P>
          Working locally has one more advantage: we see your operation in person and walk the
          process with you. We have production systems in Istanbul-heavy sectors like tourism and
          visa consultancy. <A href="/contact">Write to us</A> about your project — we reply
          within 24 hours.
        </P>
      </SeoSection>

      <SeoSection index={4} eyebrow="Hotels" title="Digital solutions for boutique hotel businesses">
        <P>
          Digital solutions for boutique hotels bring room and experience presentation, the
          reservation flow and operations management into a single system. The guest browses the
          website and leaves a booking request; the team manages the calendar and requests from
          the admin side of the same data.
        </P>
        <P>
          Hospitality is one of Kagu&apos;s focus verticals: the test of a system is whether the
          team uses it on a busy Friday night. Starting prices for a hotel site are on the{" "}
          <A href="/custom-website-pricing">custom website pricing</A> page, and the process is
          described under <A href="/start-project">start a project</A>.
        </P>
      </SeoSection>

      <FaqSection index={5} title="Frequently asked questions" faqs={FAQS} />

      <CtaBand
        title="Let's find the tool that makes your work easier."
        href="/start-project"
        label="Start a project"
        secondaryHref="/contact"
        secondaryLabel="Write to us"
      />

      <SiteFooter />
    </>
  );
}
