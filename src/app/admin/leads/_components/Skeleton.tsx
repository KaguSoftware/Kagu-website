export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="animate-pulse border border-neutral">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 border-b border-neutral p-4 last:border-0">
          <div className="h-4 w-1/3 bg-mint-pale" />
          <div className="h-4 w-1/6 bg-mint-pale" />
          <div className="h-4 w-1/6 bg-mint-pale" />
          <div className="ml-auto h-4 w-1/12 bg-mint-pale" />
        </div>
      ))}
    </div>
  );
}
