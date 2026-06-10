import type { Metadata } from "next";

export const metadata: Metadata = { title: "Learnings" };

export default function LearningsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
