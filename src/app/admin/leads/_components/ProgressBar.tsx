export function ProgressBar({
  value,
  tone,
}: {
  value: number;
  tone?: "ok" | "warn" | "bad" | "muted";
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <span
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      data-tone={tone}
      className="ld-meter"
    >
      <i style={{ width: `${clamped}%` }} />
    </span>
  );
}
