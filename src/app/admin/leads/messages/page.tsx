import { createClient } from "@/lib/supabase/server";
import { Eyebrow } from "../../_components/ui";
import { MessageQueue, type MessageWithLead } from "../_components/MessageQueue";

export const metadata = { title: "Outreach messages" };

export default async function MessagesPage() {
  const supabase = await createClient();
  // Review queue: drafts first, then approved-but-unsent.
  const { data } = await supabase
    .from("lead_messages")
    .select("*, leads(id, name, district, category)")
    .in("status", ["draft", "approved"])
    .order("created_at", { ascending: false })
    .limit(100);

  const messages = (data ?? []) as MessageWithLead[];

  return (
    <div>
      <div className="pb-6">
        <Eyebrow>Review queue</Eyebrow>
        <p className="mt-2 max-w-prose text-sm text-slate-ink">
          LLM-drafted outreach awaiting review. Approve, edit, copy, send it
          from your own email/WhatsApp, then mark it sent.
        </p>
      </div>
      <MessageQueue messages={messages} />
    </div>
  );
}
