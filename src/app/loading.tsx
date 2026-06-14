import { BootLoaderView } from "@/components/motion/BootLoader";

// Route-level loading UI. Reuses the first-load boot curtain (the 2D kagu mark)
// so every navigation shows the same screen as the initial load.
export default function Loading() {
  return <BootLoaderView />;
}
