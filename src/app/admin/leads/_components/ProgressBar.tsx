export function ProgressBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-1 w-full max-w-32 bg-mint-pale"
    >
      <div
        className="h-full bg-mint-deep transition-[width] duration-500"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
