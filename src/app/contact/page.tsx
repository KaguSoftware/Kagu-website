/*
  /contact — server-rendered shell (hero, aside, copy in the raw HTML for SEO)
  with the interactive form isolated in ContactForm.tsx. Studio facts come from
  Supabase on the server so nothing waits on a client fetch.
*/

import type { Metadata } from "next";
import { getStudio } from "@/lib/content";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { pageMetadata, webPageJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { ContactForm } from "./ContactForm";
import { MailLink } from "@/components/ui/MailLink";

const TITLE = "Contact Kagu — Let's Talk Software";
const DESCRIPTION =
  "Contact Kagu about custom software for your boutique operation. We reply within 24 hours, in Turkish, English, Arabic, Persian or Russian.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/contact",
  lang: "en",
});

// Static + hourly ISR; admin edits bust this instantly via revalidatePublic().
export const revalidate = 3600;

export default async function ContactPage() {
  const studio = await getStudio();

  return (
    <>
      <JsonLd
        data={webPageJsonLd({
          title: TITLE,
          description: DESCRIPTION,
          path: "/contact",
          lang: "en",
        })}
      />
      <section
        style={{ background: "var(--paper)" }}
        className="px-(--container-x) pt-(--space-32) pb-(--space-16)"
      >
        <div className="w-full max-w-(--container-max) mx-auto">
          <span className="eyebrow block" style={{ marginBottom: "var(--space-6)" }}>
            Contact · {studio.location} · {studio.timezone}
          </span>
          <h1
            className="display"
            style={{
              fontSize: "var(--type-7xl)",
              lineHeight: 0.9,
              maxWidth: "12ch",
            }}
          >
            Let&apos;s talk.
          </h1>
          <p
            style={{
              marginTop: "var(--space-8)",
              maxWidth: "52ch",
              fontSize: "var(--type-lg)",
              lineHeight: 1.5,
              color: "var(--slate-ink)",
            }}
          >
            Tell us what you&apos;re trying to make easier — a booking flow, a
            paper process, an admin your team avoids. We read every message,
            reply within 24 hours, and answer in Turkish, English, Arabic,
            Persian or Russian. No sales scripts; the person replying is the
            person who would build it.
          </p>
        </div>
      </section>

      <section
        style={{ background: "var(--paper)" }}
        className="px-(--container-x) py-(--space-16)"
      >
        <div className="w-full max-w-(--container-max) mx-auto grid grid-cols-1 md:grid-cols-12 gap-12">
          {/* Form */}
          <div className="md:col-span-7">
            <ContactForm email={studio.email} />
          </div>

          {/* Aside — server-rendered facts */}
          <aside className="md:col-span-4 md:col-start-9 flex flex-col gap-(--space-10)">
            <div>
              <span
                className="font-mono block"
                style={{
                  fontSize: "var(--type-xs)",
                  letterSpacing: "var(--tracking-eyebrow)",
                  textTransform: "uppercase",
                  color: "var(--slate-ink)",
                  marginBottom: "var(--space-3)",
                }}
              >
                Direct
              </span>
              <MailLink
                email={studio.email}
                confirm="block"
                data-cursor="read"
                style={{
                  fontFamily: "var(--font-display)",
                  // Scale down on phones and allow wrapping so a long address
                  // doesn't run off the edge.
                  fontSize: "clamp(1.25rem, 6vw, var(--type-3xl))",
                  color: "var(--mint-text)",
                  lineHeight: 1.1,
                  borderBottom: "1px solid var(--mint-text)",
                  display: "inline-block",
                  maxWidth: "100%",
                  overflowWrap: "anywhere",
                  paddingBottom: 4,
                }}
              />
            </div>
            <div>
              <span
                className="font-mono block"
                style={{
                  fontSize: "var(--type-xs)",
                  letterSpacing: "var(--tracking-eyebrow)",
                  textTransform: "uppercase",
                  color: "var(--slate-ink)",
                  marginBottom: "var(--space-3)",
                }}
              >
                Where
              </span>
              <p style={{ fontSize: "var(--type-md)", color: "var(--ink)", lineHeight: 1.5 }}>
                {studio.location}
                <br />
                {studio.timezone}
              </p>
            </div>
            <div>
              <span
                className="font-mono block"
                style={{
                  fontSize: "var(--type-xs)",
                  letterSpacing: "var(--tracking-eyebrow)",
                  textTransform: "uppercase",
                  color: "var(--slate-ink)",
                  marginBottom: "var(--space-3)",
                }}
              >
                Response time
              </span>
              <p style={{ fontSize: "var(--type-md)", color: "var(--ink)", lineHeight: 1.5 }}>
                Within 24h · Turkish, English, Arabic, Persian, Russian
              </p>
            </div>
            <div>
              <span
                className="font-mono block"
                style={{
                  fontSize: "var(--type-xs)",
                  letterSpacing: "var(--tracking-eyebrow)",
                  textTransform: "uppercase",
                  color: "var(--slate-ink)",
                  marginBottom: "var(--space-3)",
                }}
              >
                What happens next
              </span>
              <p style={{ fontSize: "var(--type-md)", color: "var(--ink)", lineHeight: 1.5 }}>
                We map your needs into a concrete scope, send back a plan with
                a price, and — if it fits — start building. Production goes
                live in weeks, not quarters.
              </p>
            </div>
          </aside>
        </div>
      </section>

      <SiteFooter studio={studio} />
    </>
  );
}
