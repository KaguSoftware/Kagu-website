import { getStudio } from "@/lib/content";
import { SiteFooter } from "./SiteFooter";
import { FALLBACK_EMAIL } from "./navItems";

/** Server-fed footer: studio email arrives with the HTML. Falls back to the
 *  default address if the studio fetch fails. */
export async function SiteFooterServer() {
  let email: string = FALLBACK_EMAIL;
  try {
    const studio = await getStudio();
    email = studio.email || FALLBACK_EMAIL;
  } catch {
    /* keep fallback */
  }
  return <SiteFooter studio={{ email }} />;
}
