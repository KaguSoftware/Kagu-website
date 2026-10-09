import { getStudio } from "@/lib/content";
import { SiteFooter } from "./SiteFooter";

/** Server-fed footer: studio data arrives with the HTML instead of a post-mount
 *  browser fetch. Pages using it should export `revalidate`. */
export async function SiteFooterServer() {
  const studio = await getStudio();
  return <SiteFooter studio={studio} />;
}
