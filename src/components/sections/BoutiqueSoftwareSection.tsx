/*
  Homepage §4.1 SEO section — "Boutique operator software", server-rendered.
  Sits between Recognition (mint-soft) and Contact (#0e1016):
    explainer (paper) → FAQ (mint-soft via FaqSection).
  Covers the homepage cluster's outline with answer-first passages and links
  into the topic-cluster pages; the FAQ mirrors into FAQPage JSON-LD.
*/

import Link from "next/link";
import type { ReactNode } from "react";
import { Eyebrow } from "@/components/layout/Eyebrow";
import { FaqSection } from "@/components/seo/blocks";
import type { FaqItem } from "@/lib/seo";

export const HOME_FAQS: FaqItem[] = [
  {
    q: "What kind of software does Kagu offer for boutique operators?",
    a: "Kagu offers custom-built software, including custom websites, digital tools, full-stack platforms, and admin systems, all with multilingual support. Every build pairs a customer-facing surface with an operator-facing admin on one database, so small teams in hospitality and service run their whole operation from one place.",
  },
  {
    q: "How does Kagu's software help boutique operators?",
    a: "Kagu's software helps boutique operators by reducing paperwork, streamlining operations, and improving customer experience. Work that lived in Excel sheets, WhatsApp threads and paper notebooks moves into one system: enquiries arrive structured, bookings manage themselves, and content updates without a developer.",
  },
  {
    q: "What sets Kagu apart from other software providers?",
    a: "Kagu's vertical depth, small team focus, production-oriented delivery, and lack of unnecessary features set it apart from other software providers. We work in hospitality and service verticals where the test of a system is whether the team uses it on a busy Friday night — and we ship to production in weeks, not quarters.",
  },
];

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article style={{ borderTop: "1px solid var(--neutral)", paddingTop: "var(--space-6)" }}>
      <h2
        className="display"
        style={{
          fontSize: "var(--type-xl)",
          lineHeight: 1.15,
          marginBottom: "var(--space-4)",
          maxWidth: "26ch",
        }}
      >
        {title}
      </h2>
      <p
        style={{
          fontSize: "var(--type-md)",
          lineHeight: 1.7,
          color: "var(--ink)",
          maxWidth: "52ch",
        }}
      >
        {children}
      </p>
    </article>
  );
}

function InlineLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      data-cursor="read"
      style={{ color: "var(--mint-text)", borderBottom: "1px solid var(--mint-text)" }}
    >
      {children}
    </Link>
  );
}

export function BoutiqueSoftwareSection() {
  return (
    <>
      <section
        aria-label="Boutique operator software"
        style={{ background: "var(--paper)" }}
        className="px-(--container-x) py-(--section-y)"
      >
        <div className="w-full max-w-(--container-max) mx-auto">
          <Eyebrow number="07">Boutique operator software</Eyebrow>
          <h2
            className="display"
            style={{
              fontSize: "var(--type-4xl)",
              lineHeight: 1.02,
              margin: "var(--space-6) 0 var(--space-8)",
              maxWidth: "22ch",
            }}
          >
            What is boutique operator software?
          </h2>
          <p
            style={{
              fontSize: "var(--type-md)",
              lineHeight: 1.7,
              color: "var(--ink)",
              maxWidth: "62ch",
              marginBottom: "var(--space-16)",
            }}
          >
            Boutique operator software is custom-built software for small teams that run
            hospitality and service businesses — hotels, tour operators, clinics, studios —
            combining a customer-facing website with the digital tools and admin systems the
            operation runs on. Kagu builds it from Istanbul for operators worldwide, in Turkish,
            English, Arabic and more.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-(--space-12)">
            <Block title="How Kagu's software helps boutique operators">
              Kagu&apos;s software reduces paperwork, streamlines operations and improves customer
              experience by moving scattered work into one system. See the{" "}
              <InlineLink href="/digital-tools-for-boutique-operators">
                digital tools for boutique operators
              </InlineLink>{" "}
              guide for what that looks like in practice.
            </Block>
            <Block title="Key features of Kagu's custom-built software">
              Every build includes a custom website, an operator{" "}
              <InlineLink href="/admin-systems">admin system</InlineLink> on the same database,
              and multilingual support — Arabic and Persian right-to-left layouts included. Larger
              scopes grow into <InlineLink href="/full-stack-platform-cost">full-stack platforms</InlineLink>.
            </Block>
            <Block title="Benefits of partnering with Kagu">
              You get production software in weeks, not quarters, at{" "}
              <InlineLink href="/custom-website-pricing">listed prices</InlineLink> with no hidden
              line items. At handover, control passes fully to your team — the projects on{" "}
              <InlineLink href="/work">our work page</InlineLink> all run without us.
            </Block>
            <Block title="Why choose Kagu for your software needs?">
              Because of vertical depth and focus: a small{" "}
              <InlineLink href="/about">Istanbul studio</InlineLink> working only with boutique
              operators, building no unnecessary features. Ready to talk?{" "}
              <InlineLink href="/start-project">Start a project</InlineLink> and see an estimate
              instantly.
            </Block>
          </div>
        </div>
      </section>

      <FaqSection index={7} title="Frequently asked questions" faqs={HOME_FAQS} />
    </>
  );
}
