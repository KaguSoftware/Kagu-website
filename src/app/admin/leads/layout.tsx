import type { Metadata } from "next";
import { PageHeader } from "../_components/ui";
import { LeadsTabs } from "./_components/LeadsTabs";

export const metadata: Metadata = { title: "Leads" };

export default function LeadsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <PageHeader
        title="Leads"
        description="Internal lead generation — request scrapes, browse scored leads, review outreach drafts."
      />
      <LeadsTabs />
      <div className="mt-6">{children}</div>
    </div>
  );
}
