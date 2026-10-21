import type { Metadata } from "next";
import { HomeScrollScene } from "@/components/site/home/HomeScrollScene";
import { HomeWork } from "@/components/site/home/HomeWork";
import { HomeClosing } from "@/components/site/home/HomeClosing";
import { getCases, getFeaturedCases, getStudio } from "@/lib/content";
import { pageMetadata, webPageJsonLd } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";

const TITLE = "Kagu — Software, done right.";
const DESCRIPTION =
  "Kagu builds websites, apps and AI tools for businesses, and looks after them for you.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: "/",
  lang: "en",
  enPath: "/",
  trPath: "/butik-operator-yazilimi",
});

// Statically prerendered; hourly ISR is a safety net — admin edits already
// bust this via revalidatePublic().
export const revalidate = 3600;

export default async function Home() {
  const [featured, studio] = await Promise.all([getFeaturedCases(), getStudio()]);
  const cases = featured.length ? featured : await getCases();
  const email = studio.email || "contact@kagusoftware.com";

  return (
    <div className="home">
      <JsonLd
        data={webPageJsonLd({ title: TITLE, description: DESCRIPTION, path: "/", lang: "en" })}
      />
      <HomeScrollScene />
      <HomeWork cases={cases} />
      <HomeClosing email={email} />
    </div>
  );
}
