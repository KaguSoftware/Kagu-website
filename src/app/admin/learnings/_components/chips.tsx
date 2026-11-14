import Link from "next/link";

/* Small server-safe presentational chips shared by the index and detail pages. */

export function TagChip({ tag, href }: { tag: string; href?: string }) {
  if (href) {
    return (
      <Link href={href} className="lr-tag">
        {tag}
      </Link>
    );
  }
  return <span className="lr-tag">{tag}</span>;
}

export function AuthorChip({
  name,
  email,
}: {
  name: string | null;
  email: string;
}) {
  const label = name || email.split("@")[0];
  const initials = label
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
  return (
    <span className="lr-author">
      <span className="lr-author__av">{initials || "?"}</span>
      {label}
    </span>
  );
}

export function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 60) return minutes <= 1 ? "just now" : `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
