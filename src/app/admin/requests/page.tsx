import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "../_components/ui";
import { RequestsList } from "./_components/RequestsList";

export const metadata = { title: "Requests" };

export type RequestsParams = {
  type?: string;
  status?: string;
};

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<RequestsParams>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const [{ data: contacts }, { data: inquiries }] = await Promise.all([
    supabase
      .from("contact_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300),
    supabase
      .from("project_inquiries")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Requests"
        description="Everything visitors send in — messages from /contact, enquiries from /marketing, the /start-marketing intake, and package requests from /start-project. New rows appear live."
      />
      <RequestsList
        initialContacts={contacts ?? []}
        initialInquiries={inquiries ?? []}
        params={params}
      />
    </div>
  );
}
