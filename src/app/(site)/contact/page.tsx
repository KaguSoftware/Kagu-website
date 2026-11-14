import type { CSSProperties } from "react";
import { getStudio } from "@/lib/content";
import { pageMetadata, webPageJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { whatsappHref } from "@/lib/marketing.config";
import { seller } from "@/lib/legal";
import { ContactForm } from "@/components/forms/ContactForm";
import { ContactRows } from "@/components/site/contact/ContactRows";
import { IstanbulTime } from "@/components/site/contact/IstanbulTime";
import { ContactBackdrop } from "@/components/site/contact/ContactBackdrop";
import "@/components/site/contact/contact.css";

const TITLE = "Contact — Kagu";
const DESCRIPTION = "Say hello to Kagu. Email us, message us, or write here.";

export const metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/contact",
  lang: "en",
});

type ContactPageProps = {
  searchParams: Promise<{ topic?: string }>;
};

const WORDS = ["Let’s", "build", "it."];

export default async function ContactPage({ searchParams }: ContactPageProps) {
  const [{ topic }, studio] = await Promise.all([searchParams, getStudio()]);
  const email = studio.email || "contact@kagusoftware.com";
  const whatsapp = whatsappHref();

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
      <ContactBackdrop />
      <div className="cx">
        <div className="site-wrap cx-grid">
          <div className="cx-left">
            <h1 className="cx-h1">
              {WORDS.map((w, i) => (
                <span key={w}>
                  <span className="cx-w">
                    <span style={{ "--i": i } as CSSProperties}>
                      {w === "Let’s" ? (
                        <>
                          Let<span className="cx-pop">’</span>s
                        </>
                      ) : (
                        w
                      )}
                    </span>
                  </span>{" "}
                </span>
              ))}
            </h1>
            <p className="cx-sub cx-fade">We reply within a day.</p>
            <div className="cx-fade">
              <ContactRows email={email} whatsapp={whatsapp} phone={seller.phone} />
              <IstanbulTime />
            </div>
          </div>
          <section id="contact" className="cx-right cx-fade cx-fade--2">
            <ContactForm email={email} whatsapp={whatsapp} topic={topic} />
          </section>
        </div>
      </div>
    </>
  );
}
