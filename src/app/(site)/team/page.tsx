import { permanentRedirect } from "next/navigation";

/*
  /team merged into /about (team section now leads that page). This route is
  kept only as a permanent redirect so existing per-person QR cards — which
  point at /team?member=<slug> — keep resolving to the right card on /about.
*/
type TeamRedirectProps = {
  searchParams: Promise<{ member?: string }>;
};

export default async function TeamRedirect({ searchParams }: TeamRedirectProps) {
  const { member } = await searchParams;
  permanentRedirect(
    member ? `/about?member=${encodeURIComponent(member)}` : "/about",
  );
}
