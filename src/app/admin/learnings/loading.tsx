export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="border-b border-neutral pb-6">
        <div className="h-8 w-48 bg-mint-pale" />
        <div className="mt-3 h-4 w-80 bg-mint-pale" />
      </div>
      <div className="h-20 border border-neutral" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="border border-neutral p-6">
          <div className="h-3 w-24 bg-mint-pale" />
          <div className="mt-3 h-5 w-2/3 bg-mint-pale" />
          <div className="mt-3 h-4 w-1/2 bg-mint-pale" />
          <div className="mt-4 h-4 w-40 bg-mint-pale" />
        </div>
      ))}
    </div>
  );
}
