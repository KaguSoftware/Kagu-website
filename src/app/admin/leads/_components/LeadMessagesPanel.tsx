"use client";

/* Lazy-loaded message list inside the lead drawer. */

import { useEffect, useState } from "react";
import type { Tables } from "@/lib/supabase/database.types";
import { getLeadMessages } from "../../_actions/lead-messages";
import { adminToast } from "../../_components/toast";
import { MessageCard } from "./MessageQueue";

export function LeadMessagesPanel({ leadId }: { leadId: string }) {
  const [messages, setMessages] = useState<Tables<"lead_messages">[] | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await getLeadMessages(leadId);
      if (cancelled) return;
      if (result.ok) setMessages(result.data ?? []);
      else adminToast("error", result.error);
    })();
    return () => {
      cancelled = true;
    };
  }, [leadId, reloadKey]);

  if (messages === null) {
    return <p className="mt-6 text-sm text-slate-ink">Loading messages…</p>;
  }
  if (messages.length === 0) {
    return (
      <p className="mt-6 border border-dashed border-neutral p-6 text-center text-sm text-slate-ink">
        No drafts for this lead yet.
      </p>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-4">
      {messages.map((message) => (
        <MessageCard
          key={message.id}
          message={message}
          onChanged={() => setReloadKey((k) => k + 1)}
        />
      ))}
    </div>
  );
}
