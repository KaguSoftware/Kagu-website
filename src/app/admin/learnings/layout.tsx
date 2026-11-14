import type { Metadata } from "next";
import "./learnings.css";

export const metadata: Metadata = { title: "Learnings" };

export default function LearningsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
