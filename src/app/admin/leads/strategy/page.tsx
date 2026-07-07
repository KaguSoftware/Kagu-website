import { redirect } from "next/navigation";

/* The Strategy tab became the SEO tab — keep old links working. */
export default function StrategyRedirect() {
  redirect("/admin/leads/seo");
}
