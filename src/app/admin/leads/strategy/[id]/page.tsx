import { redirect } from "next/navigation";

/* The Strategy tab became the SEO tab — keep old job links working. */
export default async function StrategyJobRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  redirect(`/admin/leads/seo/${(await params).id}`);
}
