import type { Metadata } from "next";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { StartProjectBuilder } from "@/components/start-project/StartProjectBuilder";
import {
  FEATURES,
  getWebsiteType,
  type WebsiteTypeId,
} from "@/components/start-project/catalog";

export const metadata: Metadata = {
  title: "Start a project · Kagu",
  description:
    "Assemble your website package — pick a starting point, add the components you need, and get a live preview with an instant estimate.",
};

type StartProjectParams = {
  type?: string;
  f?: string;
};

export default async function StartProjectPage({
  searchParams,
}: {
  searchParams: Promise<StartProjectParams>;
}) {
  const params = await searchParams;

  // Validate shared-URL state against the catalog; silently drop anything stale.
  const initialTypeId: WebsiteTypeId = getWebsiteType(params.type ?? "")
    ? (params.type as WebsiteTypeId)
    : "service";
  const validFeatureIds = new Set(FEATURES.map((f) => f.id));
  const initialFeatureIds = (params.f ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => validFeatureIds.has(id));

  return (
    <>
      <StartProjectBuilder
        initialTypeId={initialTypeId}
        initialFeatureIds={initialFeatureIds}
      />
      <SiteFooter />
    </>
  );
}
