export function BasicLoading() {
  return (
    <div
      role="status"
      className="flex items-center gap-2.5 p-4 text-sm text-slate-ink"
    >
      <span
        aria-hidden
        className="inline-block size-1.5 animate-pulse rounded-full"
        style={{ background: "var(--accent)" }}
      />
      Loading…
    </div>
  );
}
