import { LoadingScreen } from "@/components/hero3d/LoadingScreen";

// Route-level loading UI — the same bird curtain as the first-visit PreloadCurtain,
// so the streaming fallback and the curtain are one consistent visual (no skeleton flash).
export default function Loading() {
  return <LoadingScreen greeting />;
}
