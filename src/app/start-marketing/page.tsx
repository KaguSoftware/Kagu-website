/*
  /start-marketing — the intake form for the marketing branch.

  The software equivalent is /start-project, and the difference is deliberate:
  no builder, no live preview, no estimate. Marketing pricing is a conversation,
  so this page only asks the questions that would otherwise eat the first call.

  Server-rendered shell (hero copy exists in the raw HTML); one client island
  (StartMarketingForm) owns every question and the submit. The questions
  themselves are data — see ./questions.ts.

  The short form at the bottom of /marketing stays where it is: that one is the
  quick CTA for someone already reading the page, this one is the deeper intake
  for a serious lead. Both land in contact_requests, told apart by `source`.
*/

import type { Metadata } from "next";
import { getStudio } from "@/lib/content";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { JsonLd } from "@/components/seo/JsonLd";
import { WordMaskReveal } from "@/components/motion/WordMaskReveal";
import { pageMetadata, webPageJsonLd, breadcrumbJsonLd } from "@/lib/seo";
import { StartMarketingForm } from "./StartMarketingForm";

const PATH = "/start-marketing";
const TITLE = "Start Marketing · Kagu";
const DESCRIPTION =
  "Tell Kagu's marketing branch about your business in about two minutes — your goal, your budget and where you are now — and we'll come to the first call already knowing your account.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  lang: "en",
});

// Static + hourly ISR like the other public routes. Only the studio email and
// the footer facts come from Supabase; every question is in ./questions.ts.
export const revalidate = 3600;

export default async function StartMarketingPage() {
  const studio = await getStudio();

  return (
    <>
      <JsonLd
        data={webPageJsonLd({ title: TITLE, description: DESCRIPTION, path: PATH, lang: "en" })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Kagu", path: "/" },
          { name: "Marketing", path: "/marketing" },
          { name: "Start marketing", path: PATH },
        ])}
      />

      <section
        style={{ background: "var(--paper)" }}
        className="px-(--container-x) pt-(--space-32) pb-(--space-20)"
      >
        <div className="w-full max-w-(--container-max) mx-auto">
          <span className="eyebrow block" style={{ marginBottom: "var(--space-6)" }}>
            Marketing intake · About two minutes
          </span>
          <WordMaskReveal
            as="h1"
            text="Tell us the account."
            className="display kagu-intake-hero"
          />
          <p
            style={{
              marginTop: "var(--space-8)",
              maxWidth: "54ch",
              fontSize: "var(--type-lg)",
              lineHeight: 1.55,
              color: "var(--slate-ink)",
            }}
          >
            Twenty short questions, mostly things to tap. Answer them and the first
            call is about your account and your numbers instead of us asking who you
            are — and nothing here commits you to anything.
          </p>
        </div>
      </section>

      <StartMarketingForm email={studio.email} />

      <SiteFooter studio={studio} />

      <style>{`
        /* WordMaskReveal takes no style prop and .display sets no size, so the
           hero step is named here — without it the h1 falls back to the UA's
           2em and lands under the body copy, which is what /start-project
           still does. */
        .kagu-intake-hero {
          font-size: var(--type-6xl);
          line-height: 0.95;
          max-width: 16ch;
        }
      `}</style>
    </>
  );
}
