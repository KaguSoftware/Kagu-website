"use client";

/*
  Outreach message review. MessageCard is the unit: inline subject/body edit,
  approve/reject, copy to clipboard, and "mark as sent" (which also moves the
  lead to `contacted`). MessageQueue lists cards with lead context for the
  Messages tab; the lead drawer reuses MessageCard via LeadMessagesPanel.
*/

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Tables } from "@/lib/supabase/database.types";
import {
  approveMessage,
  markMessageSent,
  rejectMessage,
  updateMessageContent,
} from "../../_actions/lead-messages";
import { adminToast } from "../../_components/toast";
import { EmptyState } from "../../_components/ui";
import { MESSAGE_STATUS_CLASSES, MESSAGE_STATUS_LABELS } from "../_lib/constants";

type Message = Tables<"lead_messages">;
export type MessageWithLead = Message & {
  leads: { id: string; name: string; district: string | null; category: string | null } | null;
};

const buttonClass =
  "text-xs font-mono uppercase tracking-[0.18em] underline-offset-4 transition-colors hover:underline disabled:opacity-50";

export function MessageCard({
  message,
  leadName,
  onChanged,
}: {
  message: Message;
  leadName?: string;
  onChanged?: () => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState(message.subject ?? "");
  const [body, setBody] = useState(message.body);
  const [pending, startTransition] = useTransition();

  const refresh = () => (onChanged ? onChanged() : router.refresh());

  const act = (fn: () => Promise<{ ok: true } | { ok: false; error: string }>, doneMsg: string) =>
    startTransition(async () => {
      const result = await fn();
      if (result.ok) {
        adminToast("success", doneMsg);
        refresh();
      } else {
        adminToast("error", result.error);
      }
    });

  const save = () =>
    act(
      () =>
        updateMessageContent(message.id, {
          subject: message.channel === "email" ? subject : null,
          body,
        }),
      "Message saved."
    );

  const copy = async () => {
    const text = message.subject ? `${message.subject}\n\n${message.body}` : message.body;
    try {
      await navigator.clipboard.writeText(text);
      adminToast("success", "Copied to clipboard.");
    } catch {
      adminToast("error", "Couldn't copy — clipboard unavailable.");
    }
  };

  return (
    <div className="border border-neutral p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block border px-2 py-0.5 text-[10px] font-mono uppercase tracking-[0.14em] ${MESSAGE_STATUS_CLASSES[message.status]}`}
          >
            {MESSAGE_STATUS_LABELS[message.status]}
          </span>
          <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-slate-ink">
            {message.variant_label ?? message.channel} · {message.language}
          </span>
        </div>
        {leadName && <span className="text-xs text-slate-ink">{leadName}</span>}
      </div>

      {editing ? (
        <div className="mt-3 flex flex-col gap-3">
          {message.channel === "email" && (
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="w-full border-0 border-b border-neutral bg-transparent py-2 text-sm text-ink outline-none placeholder:text-neutral"
            />
          )}
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            className="w-full resize-y border border-neutral bg-transparent p-3 text-sm text-ink outline-none focus-visible:border-mint-deep"
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={pending || body.trim().length === 0}
              onClick={() => {
                save();
                setEditing(false);
              }}
              className={`${buttonClass} text-mint-deep`}
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setSubject(message.subject ?? "");
                setBody(message.body);
                setEditing(false);
              }}
              className={`${buttonClass} text-slate-ink`}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3">
          {message.subject && (
            <p className="pb-1 text-sm font-medium text-ink">{message.subject}</p>
          )}
          <p className="whitespace-pre-wrap text-sm text-slate-ink">{message.body}</p>
        </div>
      )}

      {!editing && (
        <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-neutral pt-3">
          {(message.status === "draft" || message.status === "rejected") && (
            <>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className={`${buttonClass} text-slate-ink hover:text-ink`}
              >
                Edit
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => act(() => approveMessage(message.id), "Message approved.")}
                className={`${buttonClass} text-[#3fb27f]`}
              >
                Approve
              </button>
            </>
          )}
          {message.status === "draft" && (
            <button
              type="button"
              disabled={pending}
              onClick={() => act(() => rejectMessage(message.id), "Message rejected.")}
              className={`${buttonClass} text-[#e5594e]`}
            >
              Reject
            </button>
          )}
          <button type="button" onClick={copy} className={`${buttonClass} text-slate-ink hover:text-ink`}>
            Copy
          </button>
          {message.status === "approved" && (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                act(() => markMessageSent(message.id), "Marked sent — lead moved to Contacted.")
              }
              className={`${buttonClass} text-mint-deep`}
            >
              Mark as sent
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function MessageQueue({ messages }: { messages: MessageWithLead[] }) {
  if (messages.length === 0) {
    return (
      <EmptyState>
        No drafts to review. The worker generates outreach drafts as it
        processes leads.
      </EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {messages.map((message) => (
        <MessageCard
          key={message.id}
          message={message}
          leadName={
            message.leads
              ? `${message.leads.name}${message.leads.district ? ` · ${message.leads.district}` : ""}`
              : undefined
          }
        />
      ))}
    </div>
  );
}
