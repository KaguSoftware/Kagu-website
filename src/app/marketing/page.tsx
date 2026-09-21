/*
  /marketing — the service page for Kagu's digital marketing branch.

  Server-rendered so every word of the copy exists in the raw HTML. The client
  islands carry no copy: the headline's rotating word (HeroHeadline), the
  client reel's playback and sound (ClientReel), and the intake form shared
  with /start-marketing (StartMarketingForm), which closes the page as its own
  three blocks — this page hands it the heading and the aside column.
  Section order follows the background ladder in docs/DESIGN_BASELINE.md §3 —
  no two adjacent sections share a surface, and the dark close is used once:

    Hero (paper) → Services (mint-pale) → Process (paper)
    → Clients (mint-soft) → Why Kagu (paper)
    → Intake 01 (mint-pale) → 02 (paper) → 03 (mint-soft) → Send (#0e1016)

  Clients render through the same FileCard as /work, and in the same pinned
  pile: each card sticks to the header line and the next rises over it, then
  the whole stack lifts away and the page carries on. They use /work's phone
  mockup too, with the account's own vertical video on the screen instead of a
  screenshot (ClientReel — a third island, and the only one below the fold).
  Client data lives in ./clients.ts — another client is one entry there, and
  its video is one path in `reel`, not new markup.

  Deliberately absent, and to stay absent until there is real data behind them:
  metrics, percentages, prices, and testimonials.
*/

import type { Metadata } from "next";
import Link from "next/link";
import { getStudio } from "@/lib/content";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Eyebrow } from "@/components/layout/Eyebrow";
import { FileCard, type FileCardLink } from "@/components/cases/FileCard";
import { TabLink } from "@/components/ui/TabLink";
import { ArrowGlyph } from "@/components/ui/ArrowGlyph";
import { JsonLd } from "@/components/seo/JsonLd";
import { rampColor, inkFor, rgba } from "@/lib/caseRamp";
import {
  pageMetadata,
  webPageJsonLd,
  serviceJsonLd,
  breadcrumbJsonLd,
} from "@/lib/seo";
import { whatsappHref } from "@/lib/marketing.config";
import {
  MARKETING_CLIENTS,
  type ClientLinkKind,
  type MarketingClient,
} from "./clients";
import { MarketingHeroHeadline, HERO_SENTENCE } from "./HeroHeadline";
import { ClientReel } from "./ClientReel";
import { ClientStackFit } from "./ClientStackFit";
import { StartMarketingForm } from "../start-marketing/StartMarketingForm";

const PATH = "/marketing";
const CONTACT_ID = "marketing-contact";
const TITLE = "Social Media & Ad Management · Kagu Marketing";
const DESCRIPTION =
  "Kagu's marketing branch runs Instagram, Facebook and TikTok accounts and paid campaigns for businesses in Turkey — content direction, a written monthly plan, proper tracking and plain reporting.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  lang: "en",
});

// Static + hourly ISR, matching the other public routes. Only the studio
// footer facts come from Supabase; the page copy is in this file.
export const revalidate = 3600;

/* --------------------------------- data --------------------------------- */

const SERVICES = [
  {
    title: "Account management",
    body: "Day-to-day running of Instagram, Facebook and TikTok: what goes out, when it goes out, and answering what comes back.",
  },
  {
    title: "Content direction",
    body: "We plan what gets shot and what gets posted. Either we direct your content team to a shot list, or we work with the material you already have.",
  },
  {
    title: "A written plan every month",
    body: "The content calendar, the posting schedule and the campaign structure for the month, delivered as a document you can read, keep and argue with — not a message in a chat thread.",
  },
  {
    title: "Paid advertising",
    body: "Campaign strategy, audience and targeting setup, the ad builds themselves, budget management, and optimisation while the campaign is running.",
  },
  {
    title: "The technical setup most agencies skip",
    body: "Ad account and business portfolio configuration, pixel and dataset setup, conversion event tracking, and UTM conventions — so every click can be traced back to the ad that caused it.",
  },
  {
    title: "Reporting",
    body: "What ran, what it cost, what it did, and what changes next month. Written plainly enough that you don't need us on a call to interpret it.",
  },
] as const;

const PROCESS = [
  {
    title: "Discovery and account audit",
    body: "We start by looking at what already exists: the accounts, the ad history, whatever tracking is in place, and the content you can produce. Nothing is proposed before we know the state you are actually in.",
  },
  {
    title: "Tracking and setup, done properly",
    body: "Business portfolio, ad accounts, pixel and dataset, conversion events, naming conventions. This is the boring part, and it is the reason the numbers can be trusted three months from now.",
  },
  {
    title: "The monthly plan, written and approved",
    body: "You get the month as a document — calendar, schedule, campaign structure — and the month does not begin until you have read it and approved it.",
  },
  {
    title: "Campaigns built as drafts, reviewed before launch",
    body: "Every campaign and every post is built, then reviewed with you while it is still a draft. Nothing reaches your audience without you seeing it first.",
  },
  {
    title: "Measure, report, adjust",
    body: "At the end of the month the report goes out, and the next plan is written against what it says. Changes come from the data, not from a hunch.",
  },
] as const;

const WHY_POINTS = [
  {
    title: "Tracking that actually fires",
    body: "Pixels, datasets and conversion events are set up and then verified — not assumed.",
  },
  {
    title: "Numbers we can stand behind",
    body: "Consistent naming and UTM conventions mean a result can always be traced to its cause.",
  },
  {
    title: "Written down, not remembered",
    body: "Plans, structures and decisions live in documents you keep, so nothing depends on our memory.",
  },
  {
    title: "Reports you can read",
    body: "Plain language, in the order a business owner needs it: what ran, what it cost, what changes.",
  },
] as const;

/* ------------------------------ client link ------------------------------ */

/*
  The card's one outbound link, in the slot /work fills with "View file".

  It is the first entry in the client's `links` — their main account — and it
  is the only one that renders. The card's right-hand side is the phone now,
  so the 2 × 2 button grid that used to carry all four platforms is gone; a
  wall of buttons beside the copy and a video beside that would be two ways of
  saying the same thing at once.

  A note for whoever edits the URLs: these are outbound links on a page that
  sells doing UTMs properly, so they carry no inherited tracking. If Kagu-side
  attribution is ever wanted, add a deliberate
  `?utm_source=kagu&utm_medium=referral&utm_campaign=marketing-page` — never
  paste a URL copied out of someone else's link-in-bio.
*/

const LINK_LABEL: Record<ClientLinkKind, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  website: "Website",
};

function clientCardLink(client: MarketingClient): FileCardLink | undefined {
  const link = client.links[0];
  if (!link) return undefined;
  const platform = LINK_LABEL[link.kind];
  return {
    href: link.url,
    external: true,
    label: link.kind === "website" ? "Visit site" : `View on ${platform}`,
    ariaLabel: `${
      link.kind === "website"
        ? `Visit the ${client.name} website`
        : `View ${client.name} on ${platform}`
    }${link.detail ? ` (${link.detail})` : ""} — opens in a new tab`,
  };
}

/* --------------------------------- page ---------------------------------- */

export default async function MarketingPage() {
  const studio = await getStudio();
  const whatsapp = whatsappHref();
  const clients = MARKETING_CLIENTS;

  return (
    <>
      <JsonLd
        data={webPageJsonLd({ title: TITLE, description: DESCRIPTION, path: PATH, lang: "en" })}
      />
      <JsonLd
        data={serviceJsonLd({
          name: "Social media and paid advertising management",
          description: DESCRIPTION,
          path: PATH,
          lang: "en",
        })}
      />
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Kagu", path: "/" },
          { name: "Marketing", path: PATH },
        ])}
      />

      {/* ------------------------------ hero ------------------------------ */}
      <section
        style={{ background: "var(--paper)" }}
        className="px-(--container-x) pt-(--space-32) pb-(--space-20)"
      >
        <div className="w-full max-w-(--container-max) mx-auto">
          <span className="eyebrow block" style={{ marginBottom: "var(--space-6)" }}>
            Marketing · Meta &amp; TikTok · {studio.location}
          </span>
          {/* Type is untouched — only the copy changed. maxWidth is 18ch, the
              exact length of the fixed line, so it sits on one line wherever
              the container allows and the accent word gets the line below. */}
          <h1
            className="display"
            aria-label={HERO_SENTENCE}
            style={{ fontSize: "var(--type-6xl)", lineHeight: 0.95, maxWidth: "18ch" }}
          >
            <MarketingHeroHeadline />
          </h1>
          <p
            style={{
              marginTop: "var(--space-8)",
              maxWidth: "58ch",
              fontSize: "var(--type-lg)",
              lineHeight: 1.55,
              color: "var(--slate-ink)",
            }}
          >
            Kagu&apos;s marketing branch manages Instagram, Facebook and TikTok for
            businesses in Turkey: content direction, a written plan every month,
            and campaigns that are tracked properly and reported plainly.
          </p>

          <div
            className="flex flex-wrap items-center gap-6"
            style={{ marginTop: "var(--space-12)" }}
          >
            {/* Lenis-aware scroll, same helper the /work tabs use. The intake
                itself closes this page, so this stays a scroll rather than a
                trip to /start-marketing. */}
            <TabLink
              targetId={CONTACT_ID}
              className="kagu-cta inline-flex items-center gap-3"
              // Contains the visible label, so the accessible name matches
              // what a speech-input user would say (WCAG 2.5.3).
              ariaLabel="Start marketing — jump to the intake form"
            >
              Start marketing
              <ArrowGlyph length={24} color="var(--ink)" />
            </TabLink>
            {whatsapp ? (
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                data-cursor="nav-link"
                className="kagu-cta-secondary font-mono inline-flex items-center gap-3"
              >
                Message on WhatsApp
                <ArrowGlyph length={24} />
              </a>
            ) : null}
          </div>
        </div>
      </section>

      {/* ---------------------------- services ---------------------------- */}
      <section
        aria-labelledby="marketing-services"
        style={{ background: "var(--mint-pale)" }}
        className="px-(--container-x) py-(--section-y)"
      >
        <div className="w-full max-w-(--container-max) mx-auto">
          <Eyebrow number="01">What we do</Eyebrow>
          <h2
            id="marketing-services"
            className="display"
            style={{
              fontSize: "var(--type-4xl)",
              lineHeight: 1.02,
              margin: "var(--space-6) 0 var(--space-8)",
              maxWidth: "22ch",
            }}
          >
            The whole account, not just the posting.
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
            Most of what decides whether advertising works happens before a single
            ad goes live — in the setup, the tracking and the plan. We handle all of
            it, on Meta and on TikTok.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-(--space-12)">
            {SERVICES.map((service, i) => (
              <article
                key={service.title}
                style={{ borderTop: "1px solid var(--neutral)", paddingTop: "var(--space-6)" }}
              >
                <span
                  className="font-mono block"
                  style={{
                    fontSize: "var(--type-xs)",
                    letterSpacing: "var(--tracking-eyebrow)",
                    color: "var(--mint-text)",
                    marginBottom: "var(--space-3)",
                  }}
                  aria-hidden
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3
                  className="display"
                  style={{
                    fontSize: "var(--type-xl)",
                    lineHeight: 1.15,
                    marginBottom: "var(--space-4)",
                    maxWidth: "26ch",
                  }}
                >
                  {service.title}
                </h3>
                <p
                  style={{
                    fontSize: "var(--type-md)",
                    lineHeight: 1.7,
                    color: "var(--ink)",
                    maxWidth: "52ch",
                  }}
                >
                  {service.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------- process ---------------------------- */}
      <section
        aria-labelledby="marketing-process"
        style={{ background: "var(--paper)" }}
        className="px-(--container-x) py-(--section-y)"
      >
        <div className="w-full max-w-(--container-max) mx-auto">
          <Eyebrow number="02">How we work</Eyebrow>
          <h2
            id="marketing-process"
            className="display"
            style={{
              fontSize: "var(--type-4xl)",
              lineHeight: 1.02,
              margin: "var(--space-6) 0 var(--space-8)",
              maxWidth: "24ch",
            }}
          >
            The right way, not the fast way.
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
            Two rules hold the whole process together. Nothing is published before
            you have seen it. And nothing is guessed at when it could be set up
            correctly instead — clean naming, correct tracking, decisions written
            down.
          </p>

          <ol style={{ display: "grid", gap: 0 }}>
            {PROCESS.map((step, i) => (
              <li
                key={step.title}
                className="grid grid-cols-1 md:grid-cols-12 gap-x-12 gap-y-4"
                style={{
                  borderTop: "1px solid var(--neutral)",
                  paddingTop: "var(--space-8)",
                  paddingBottom: "var(--space-8)",
                }}
              >
                <div className="md:col-span-4">
                  <span
                    className="font-mono block"
                    style={{
                      fontSize: "var(--type-xs)",
                      letterSpacing: "var(--tracking-eyebrow)",
                      color: "var(--mint-text)",
                      marginBottom: "var(--space-3)",
                    }}
                    aria-hidden
                  >
                    Step {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3
                    className="display"
                    style={{
                      fontSize: "var(--type-2xl)",
                      lineHeight: 1.1,
                      maxWidth: "18ch",
                    }}
                  >
                    {step.title}
                  </h3>
                </div>
                <p
                  className="md:col-span-7 md:col-start-6"
                  style={{
                    fontSize: "var(--type-md)",
                    lineHeight: 1.7,
                    color: "var(--ink)",
                    maxWidth: "58ch",
                    alignSelf: "center",
                  }}
                >
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ----------------------------- clients ---------------------------- */}
      <section
        aria-labelledby="marketing-clients"
        style={{ background: "var(--mint-soft)" }}
        className="px-(--container-x) py-(--section-y)"
      >
        <div className="w-full max-w-(--container-max) mx-auto">
          <Eyebrow number="03">Who we work with</Eyebrow>
          <h2
            id="marketing-clients"
            className="display"
            style={{
              fontSize: "var(--type-4xl)",
              lineHeight: 1.02,
              margin: "var(--space-6) 0 var(--space-8)",
              maxWidth: "22ch",
            }}
          >
            Accounts we run.
          </h2>
          <p
            style={{
              fontSize: "var(--type-md)",
              lineHeight: 1.7,
              color: "var(--ink)",
              maxWidth: "58ch",
              marginBottom: "var(--space-16)",
            }}
          >
            The same file cards as{" "}
            <Link
              href="/work"
              data-cursor="read"
              style={{ color: "var(--mint-text)", borderBottom: "1px solid var(--mint-text)" }}
            >
              our work archive
            </Link>
            , for a different kind of file. Sector, what we handle, and where the
            account is pointed — results go here when there are real ones to show.
          </p>
        </div>

        {/* The same pinned pile as /work. It works mid-page because a sticky
            card is only ever clamped by its own container: extend that past the
            last card (the runway below) and the aligned stack holds, then the
            container ends and the whole pile lifts away together. */}
        <div className="kagu-client-files">
          {clients.map((client, i) => {
            // Same ramp as /work, trimmed at both ends: pure navy disappears
            // against this surface and pure light is glaring at this size.
            const n = clients.length;
            const t = n > 1 ? 0.35 + 0.5 * (i / (n - 1)) : 0.6;
            const fill = rampColor(t);
            const ink = inkFor(fill);
            return (
              <FileCard
                key={client.id}
                id={`client-${client.id}`}
                index={i}
                count={n}
                mode="pinned"
                tabLabel={client.tab}
                tabTarget={{
                  targetId: `client-${client.id}`,
                  ariaLabel: `Jump to file ${String(i + 1).padStart(2, "0")}: ${client.name}`,
                }}
                title={client.name}
                subtitle={client.tags}
                lede={client.lede}
                link={clientCardLink(client)}
                thumb={
                  client.reel ? (
                    <ClientReel
                      src={client.reel.src}
                      poster={client.reel.poster}
                      label={client.name}
                    />
                  ) : undefined
                }
                colors={{ fill, ink, muted: rgba(ink, 0.78) }}
                style={{ zIndex: i + 1 }}
              />
            );
          })}
          {/* The hold. Sticky cards are released by their container's bottom
              edge, so this is what keeps the aligned pile on screen for a beat
              before it lets go. */}
          <div className="kagu-client-files__runway" aria-hidden />
        </div>

        {/* Sizes every card to the tallest, so the pile is uniform and comes
            away as a single object. */}
        <ClientStackFit />

        {/*
          Case studies slot in here, between the client cards and "Why Kagu":
          a section on this same surface (or on --paper, flipping Why Kagu to
          --mint-pale to keep the ladder alternating) with one block per
          engagement — what we changed, what happened, over what period. Nothing
          goes in until the numbers are real and the client has agreed to them.
        */}
      </section>

      {/* ---------------------------- why kagu ---------------------------- */}
      <section
        aria-labelledby="marketing-why"
        style={{ background: "var(--paper)" }}
        className="px-(--container-x) py-(--section-y)"
      >
        <div className="w-full max-w-(--container-max) mx-auto">
          <Eyebrow number="04">Why Kagu</Eyebrow>
          <h2
            id="marketing-why"
            className="display"
            style={{
              fontSize: "var(--type-4xl)",
              lineHeight: 1.02,
              margin: "var(--space-6) 0 var(--space-8)",
              maxWidth: "22ch",
            }}
          >
            A software company doing marketing.
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
            Kagu builds software first — custom sites and admin systems for
            operators, all of it on{" "}
            <Link
              href="/work"
              data-cursor="read"
              style={{ color: "var(--mint-text)", borderBottom: "1px solid var(--mint-text)" }}
            >
              our work page
            </Link>
            . That is why the marketing branch treats an account as a system rather
            than a feed: the tracking is configured and then checked, the data is
            structured so it can be questioned later, and the thinking is written
            down instead of living in someone&apos;s head. It is the same{" "}
            <Link
              href="/about"
              data-cursor="read"
              style={{ color: "var(--mint-text)", borderBottom: "1px solid var(--mint-text)" }}
            >
              small Istanbul team
            </Link>
            , working the same way.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-(--space-10)">
            {WHY_POINTS.map((point) => (
              <div
                key={point.title}
                style={{ borderTop: "1px solid var(--neutral)", paddingTop: "var(--space-5)" }}
              >
                <h3
                  className="display"
                  style={{
                    fontSize: "var(--type-lg)",
                    lineHeight: 1.2,
                    marginBottom: "var(--space-3)",
                  }}
                >
                  {point.title}
                </h3>
                <p
                  style={{
                    fontSize: "var(--type-base)",
                    lineHeight: 1.6,
                    color: "var(--ink)",
                    maxWidth: "46ch",
                  }}
                >
                  {point.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------- contact ---------------------------- */}
      {/* The intake from /start-marketing closes the page: same questions,
          same submit, rendered as this page's last three sections. The
          heading and the aside below are this page's, handed to the form. */}
      <StartMarketingForm
        email={studio.email}
        anchorId={CONTACT_ID}
        heading={
          <>
            <Eyebrow number="05">
              <span style={{ color: "var(--mint-deep)" }}>Get in touch</span>
            </Eyebrow>
            <h2
              id="marketing-contact-heading"
              className="display"
              style={{
                fontSize: "var(--type-5xl)",
                lineHeight: 0.95,
                color: "var(--ink)",
                margin: "var(--space-6) 0 var(--space-8)",
                maxWidth: "14ch",
              }}
            >
              Tell us about the account.
            </h2>
            <p
              style={{
                fontSize: "var(--type-lg)",
                color: "var(--slate-ink)",
                lineHeight: 1.55,
                maxWidth: "52ch",
              }}
            >
              About two minutes, mostly things to tap. Answer these and the first
              call is about your account rather than introductions.
            </p>
          </>
        }
        aside={
          <>
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
              <p style={{ fontSize: "var(--type-md)", color: "var(--ink)", lineHeight: 1.6 }}>
                We look at your accounts and your ad history before we answer, so
                the first reply is about your situation rather than a brochure.
                Then we talk about scope and cost.
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
              <p style={{ fontSize: "var(--type-md)", color: "var(--ink)", lineHeight: 1.6 }}>
                Within 24h · Turkish, English, Arabic, Persian, Russian
              </p>
            </div>
          </>
        }
      />

      <SiteFooter studio={studio} />

      <style>{`
        /* Primary CTA — the filled button used by CtaBand and the contact
           forms, as a link. */
        .kagu-cta {
          font-family: var(--font-display);
          font-size: var(--type-md);
          letter-spacing: var(--tracking-eyebrow);
          text-transform: uppercase;
          color: var(--ink);
          background: var(--mint-deep);
          padding: 20px 28px;
          min-height: 56px;
          border: 1px solid var(--ink);
        }
        .kagu-cta-secondary {
          font-size: var(--type-sm);
          letter-spacing: var(--tracking-eyebrow);
          text-transform: uppercase;
          color: var(--mint-text);
          border-bottom: 1px solid var(--mint-text);
          padding-bottom: var(--space-2);
          min-height: 44px;
        }

        /* Client pile. The cards themselves — tab grid, sticky geometry,
           spacing, short-viewport trims, reduced-motion fallback — all come from
           src/styles/file-card.css, shared with /work. What belongs to this page
           is the container and the runway. */
        .kagu-client-files {
          max-width: 80rem; /* ~7xl, matches .kagu-folders */
          margin: 0 auto;
        }

        /* Tab joint, marketing only.

           file-card.css anchors a column-0 tab flush to the folder's left edge
           and suppresses its left fillet — there is no body to the left of it
           to flare into. On /work that reads fine: card 01 is the darkest step
           of the ramp, and four more tabs run to its right, so the row carries
           the shape. This pile is one bright card on a dark surface, and the
           same tab reads as a hard block overhanging the body's rounded
           top-left corner — a notch exactly one corner radius wide.

           So start the tab past that corner instead. Offset is the joint plus
           the body's own radius (the clamp is copied from
           .kagu-folder__body), which is the least distance that puts the left
           fillet down on straight edge, and the fillet is switched back on. A
           second and third client inherit this and stay aligned with each
           other; only the flush-to-the-edge anchoring is given up, and with a
           single tab there is no row for it to anchor. */
        .kagu-client-files .kagu-folder__tab {
          left: calc(
            var(--col) * var(--tab-step)
            + var(--joint)
            + clamp(16px, 1.4vw, 26px)
          );
        }
        .kagu-client-files .kagu-folder__tab::before {
          /* Bottom row only, same as the shared rule — just no longer zeroed
             out by being in column 0. */
          --cf: var(--on-body-row);
        }
        /* Deliberately a fixed length, where /work's runway is sized at runtime
           to swallow every remaining pixel of scroll so its pile can never let
           go. This pile is mid-page and must let go — the runway only buys the
           aligned stack a moment on screen first. */
        .kagu-client-files__runway { height: clamp(7rem, 48svh, 24rem); }
        @media (prefers-reduced-motion: reduce) {
          /* No pile, so nothing to hold. */
          .kagu-client-files__runway { height: 0; }
        }

        /* The client reel. The phone shell itself is file-card.css
           (.kagu-thumb--phone / .kagu-phone) — shared with /work, and already
           height-driven so it shrinks with a pinned card on a short screen.
           Only the screen's contents and the sound button live here. */
        /* Bigger than /work's 34svh. There a screenshot is a supporting
           glance beside the copy; here the video IS the exhibit, and at that
           size it was a thumbnail of a thumbnail. Only where the phone sits
           BESIDE the copy, though — 761px up, the same breakpoint
           file-card.css splits on. The card has the headroom there: __main is
           bottom-aligned inside a body that is capped to the viewport, so the
           extra height grows upward into the dead space above the title
           instead of pushing the link off the bottom.

           Below 761px it keeps the inherited size, and that is not a
           conservative guess. Narrow stacks the phone ABOVE the copy, so the
           two compete for the same capped height, and the body clips what
           does not fit: at 390 x 844 a 52svh phone put "View on Instagram"
           98px past the bottom edge. 34svh clears it by 29px. Anything much
           larger on a phone needs the layout changed, not the number. */
        @media (min-width: 761px) {
          .kagu-thumb--reel .kagu-phone {
            height: clamp(14rem, 52svh, 32rem);
          }
        }
        .kagu-reel__video {
          width: 100%;
          height: 100%;
          display: block;
          /* The source is cut to 9 / 19.5, so cover is a no-op on it. It is
             here so a client who supplies a squarer edit gets a filled screen
             rather than pillarboxes inside the bezel. */
          object-fit: cover;
          background: #050608;
        }
        /* Top-right: the bottom of the screen belongs to the native controls
           once the sound is on. */
        .kagu-reel__sound {
          position: absolute;
          top: 13cqw;
          right: 4cqw;
          z-index: 3;
          display: grid;
          place-items: center;
          width: 14cqw;
          height: 14cqw;
          /* Never smaller than a comfortable target, however small the phone
             gets on a short viewport. */
          min-width: 34px;
          min-height: 34px;
          border: 0;
          border-radius: 999px;
          background: rgba(8, 9, 12, 0.55);
          -webkit-backdrop-filter: blur(6px);
          backdrop-filter: blur(6px);
          color: #fff;
          cursor: pointer;
          transition: background 0.28s var(--ease-out-quint);
        }
        .kagu-reel__sound svg {
          width: 58%;
          height: 58%;
        }
        .kagu-reel__sound:focus-visible {
          outline: 2px solid #fff;
          outline-offset: 2px;
        }
        @media (hover: hover) {
          .kagu-reel__sound:hover { background: rgba(8, 9, 12, 0.8); }
        }
      `}</style>
    </>
  );
}
