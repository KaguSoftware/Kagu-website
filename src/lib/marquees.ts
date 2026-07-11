import "server-only";
import { createPublicClient } from "@/lib/supabase/public";

export type MarqueeItem = { label: string; href: string | null };

export async function getStackTokens(): Promise<{
  hero: MarqueeItem[];
  lineage: MarqueeItem[];
}> {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("stack_tokens")
    .select("label, href, placement, sort_order")
    .order("sort_order");

  const rows = data ?? [];
  return {
    hero: rows
      .filter((r) => r.placement === "hero_marquee")
      .map((r) => ({ label: r.label, href: r.href })),
    lineage: rows
      .filter((r) => r.placement === "stack_lineage")
      .map((r) => ({ label: r.label, href: r.href })),
  };
}
