import { getStudio } from "@/lib/content";
import { pageMetadata, webPageJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";
import { whatsappHref } from "@/lib/marketing.config";
import { ContactForm } from "@/components/forms/ContactForm";
import { ContactHero } from "@/components/site/about/ContactHero";
import "@/components/site/about/about.css";

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

      <section className="site-wrap about-hero">
        <h1>Say hello.</h1>
        <ContactHero email={email} whatsapp={whatsapp} />
      </section>

      <section id="contact" className="site-wrap about-contact">
        <div className="about-contact__grid">
          <h2 className="about-h2">Or write here.</h2>
          <ContactForm email={email} whatsapp={whatsapp} topic={topic} />
        </div>
      </section>
    </>
  );
}
