import { LoadingScreen } from "@/components/hero3d/LoadingScreen";

// Route-level loading UI for the whole app — the spinning kagu sculpture.
// Shown whenever a segment suspends (initial stream + client navigations).
export default function Loading() {
  return <LoadingScreen />;
}
