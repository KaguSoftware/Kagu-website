"use client";

/*
  useRealtimeRows — subscribes a client component to Supabase Realtime
  (postgres_changes) for one table and keeps a local row array patched:
  INSERT prepends, UPDATE merges by id, DELETE filters out.

  Falls back to polling via router.refresh() when the websocket can't
  subscribe (Realtime not enabled for the table, network issues), so the
  page still converges — just slower. `live` reports which mode we're in.

  The server-fetched `initial` prop re-syncs state whenever a server render
  delivers fresh rows, so realtime patches and RSC refreshes compose.
*/

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Row = { id: string };

export function useRealtimeRows<T extends Row>({
  table,
  initial,
  sort,
  limit,
  pollMs = 10000,
}: {
  table: string;
  initial: T[];
  sort: (a: T, b: T) => number;
  limit?: number;
  pollMs?: number;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<T[]>(initial);
  const [live, setLive] = useState(false);
  const sortRef = useRef(sort);
  useEffect(() => {
    sortRef.current = sort;
  });

  // Server re-renders (router.refresh, revalidatePath) reset local state —
  // render-time adjustment per react.dev "storing information from previous
  // renders", so realtime patches and RSC refreshes compose.
  const [lastInitial, setLastInitial] = useState(initial);
  if (lastInitial !== initial) {
    setLastInitial(initial);
    setRows(initial);
  }

  useEffect(() => {
    const supabase = createClient();
    let poll: ReturnType<typeof setInterval> | null = null;
    let safety: ReturnType<typeof setTimeout> | null = null;

    const startPolling = () => {
      setLive(false);
      if (!poll) poll = setInterval(() => router.refresh(), pollMs);
    };
    const stopPolling = () => {
      if (poll) clearInterval(poll);
      poll = null;
    };

    // If we never reach SUBSCRIBED (e.g. table missing from the publication),
    // no status callback may fire — fall back after a grace period.
    safety = setTimeout(startPolling, 5000);

    const channel = supabase
      .channel(`admin-${table}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        (payload) => {
          setRows((prev) => {
            let next: T[];
            if (payload.eventType === "INSERT") {
              const row = payload.new as T;
              next = [row, ...prev.filter((r) => r.id !== row.id)];
            } else if (payload.eventType === "UPDATE") {
              const row = payload.new as T;
              next = prev.map((r) => (r.id === row.id ? { ...r, ...row } : r));
            } else {
              const old = payload.old as Partial<Row>;
              next = prev.filter((r) => r.id !== old.id);
            }
            next.sort(sortRef.current);
            return limit ? next.slice(0, limit) : next;
          });
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          if (safety) clearTimeout(safety);
          stopPolling();
          setLive(true);
        } else if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          startPolling();
        }
      });

    return () => {
      if (safety) clearTimeout(safety);
      stopPolling();
      supabase.removeChannel(channel);
    };
  }, [table, limit, pollMs, router]);

  return { rows, live };
}
