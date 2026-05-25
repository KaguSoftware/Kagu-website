/*
  1px divider in --neutral. Always 1px — DESIGN_BASELINE forbids 2px.
*/

interface HairlineProps {
  orientation?: "horizontal" | "vertical";
  className?: string;
}

export function Hairline({ orientation = "horizontal", className = "" }: HairlineProps) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={className}
      style={{
        background: "var(--neutral)",
        height: orientation === "horizontal" ? 1 : "100%",
        width: orientation === "vertical" ? 1 : "100%",
      }}
    />
  );
}
