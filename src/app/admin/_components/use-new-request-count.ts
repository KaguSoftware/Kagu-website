"use client";

/*
  Live count of status='new' rows across contact_requests + project_inquiries
  for the sidebar "Requests" badge, plus an info toast when a new request
  lands while the admin is open.

  On any realtime event the count is re-fetched (debounced) instead of patched
  from the payload: with the default replica identity, UPDATE payloads only
  carry the PK in `old`, so a new→contacted transition can't be decremented
  locally. If the subscription never connects (tables missing from the
  publication), a 30s interval keeps the badge converging.
*/

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { adminToast } from "./toast";

/* SidebarNav mounts twice (desktop + mobile) and StrictMode double-mounts in
   dev — dedupe toasts per row across all hook instances. */
const toastedIds = new Set<string>();

/* The browser Supabase client is a singleton that caches channels by topic.
   Two hook instances asking for the same topic would get the same channel —
   the second .on() after the first .subscribe() throws. Unique topic per
   mount keeps every instance on its own channel. */
let channelSeq = 0;

type RequestKind = "contact" | "inquiry";

function notifyOnce(kind: RequestKind, payload: { [key: string]: unknown }) {
  const id = typeof payload.id === "string" ? payload.id : null;
  if (!id || toastedIds.has(id)) return;
  toastedIds.add(id);
  const name = typeof payload.name === "string" ? payload.name : "someone";
  adminToast(
    "info",
    kind === "contact"
      ? `New contact message from ${name}`
      : `New project inquiry from ${name}`
  );
}

export function useNewRequestCount(
  initial: number,
  { notify = false }: { notify?: boolean } = {}
): number {
  const [count, setCount] = useState(initial);
  const notifyRef = useRef(notify);
  useEffect(() => {
    notifyRef.current = notify;
  });

  // Server re-renders deliver a fresh initial — same render-time sync trick
  // as useRealtimeRows, so realtime refetches and RSC refreshes compose.
  const [lastInitial, setLastInitial] = useState(initial);
  if (lastInitial !== initial) {
    setLastInitial(initial);
    setCount(initial);
  }

  useEffect(() => {
    const supabase = createClient();
    let disposed = false;
    let poll: ReturnType<typeof setInterval> | null = null;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const refetch = async () => {
      const [a, b] = await Promise.all([
        supabase
          .from("contact_requests")
          .select("*", { count: "exact", head: true })
          .eq("status", "new"),
        supabase
          .from("project_inquiries")
          .select("*", { count: "exact", head: true })
          .eq("status", "new"),
      ]);
      if (!disposed) setCount((a.count ?? 0) + (b.count ?? 0));
    };
    const debouncedRefetch = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(refetch, 400);
    };

    const startPolling = () => {
      if (!poll) poll = setInterval(refetch, 30000);
    };
    const stopPolling = () => {
      if (poll) clearInterval(poll);
      poll = null;
    };

    // If we never reach SUBSCRIBED, fall back after a grace period.
    const safety: ReturnType<typeof setTimeout> | null = setTimeout(
      startPolling,
      5000
    );

    const onEvent =
      (kind: RequestKind) =>
      (payload: { eventType: string; new: { [key: string]: unknown } }) => {
        if (payload.eventType === "INSERT" && notifyRef.current) {
          notifyOnce(kind, payload.new);
        }
        debouncedRefetch();
      };

    const channel = supabase
      .channel(`admin-request-badge-${++channelSeq}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contact_requests" },
        onEvent("contact")
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_inquiries" },
        onEvent("inquiry")
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          if (safety) clearTimeout(safety);
          stopPolling();
        } else if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          startPolling();
        }
      });

    return () => {
      disposed = true;
      if (safety) clearTimeout(safety);
      if (debounceTimer) clearTimeout(debounceTimer);
      stopPolling();
      supabase.removeChannel(channel);
    };
  }, []);

  return count;
}
