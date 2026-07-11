import { type ReactNode } from "react";

interface EyebrowProps {
  children: ReactNode;
  number?: string;
  className?: string;
}

export function Eyebrow({ children, number, className = "" }: EyebrowProps) {
  return (
    <span className={`eyebrow inline-flex items-baseline gap-3 ${className}`}>
      {number ? (
        <span aria-hidden style={{ color: "var(--mint-text)" }}>
          {number}
        </span>
      ) : null}
      <span>{children}</span>
    </span>
  );
}
