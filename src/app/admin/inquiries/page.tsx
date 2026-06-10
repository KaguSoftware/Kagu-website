import { createClient } from "@/lib/supabase/server";
import { PageHeader, EmptyState } from "../_components/ui";
import {
  formatPrice,
  getWebsiteType,
  FEATURES,
} from "@/components/start-project/catalog";
import type { InquiryStatus } from "@/lib/supabase/database.types";

export const metadata = { title: "Inquiries" };

const STATUS_CLASSES: Record<InquiryStatus, string> = {
  new: "border-mint-deep text-mint-deep",
  contacted: "border-[#3fb27f] text-[#3fb27f]",
  archived: "border-neutral text-slate-ink",
};

const FEATURE_LABELS = new Map(FEATURES.map((f) => [f.id, f.label]));

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default async function InquiriesPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("project_inquiries")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Inquiries"
        description="Package requests from the public /start-project builder — type, selected components and the estimate shown at submit time."
      />
      {!rows || rows.length === 0 ? (
        <EmptyState>
          No inquiries yet — they appear here when someone sends a package from
          /start-project.
        </EmptyState>
      ) : (
        <ul className="divide-y divide-neutral border border-neutral">
          {rows.map((r) => {
            const type = getWebsiteType(r.website_type);
            const featureLabels = (r.features ?? [])
              .map((id) => FEATURE_LABELS.get(id) ?? id)
              .join(", ");
            return (
              <li key={r.id} className="space-y-2 px-5 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <a
                      href={`mailto:${r.email}`}
                      className="text-base text-ink transition-colors hover:text-mint-deep"
                    >
                      {r.name}
                    </a>
                    <p className="font-mono text-xs text-slate-ink">
                      {[
                        type?.label ?? r.website_type,
                        formatPrice(r.total_price),
                        `${(r.features ?? []).length} component${(r.features ?? []).length === 1 ? "" : "s"}`,
                        r.company,
                        formatDate(r.created_at),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <span
                    className={`border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.14em] ${STATUS_CLASSES[r.status] ?? STATUS_CLASSES.new}`}
                  >
                    {r.status}
                  </span>
                </div>
                {featureLabels ? (
                  <p className="text-xs text-slate-ink">{featureLabels}</p>
                ) : null}
                {r.notes ? (
                  <p className="max-w-2xl text-sm text-ink/80">{r.notes}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
