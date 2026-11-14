import { KAGU_VIEWBOX, RIBBON, FOLD, WING } from "@/components/KaguMark";
import type { GroupPiece } from "@/lib/productGroups";

/* Faint outline of the whole mark; the group's piece(s) filled in white. */
export function GroupIcon({ piece, className }: { piece: GroupPiece; className?: string }) {
  const on = (p: Exclude<GroupPiece, "all">) => piece === "all" || piece === p;
  const paths = [
    { k: "ribbon" as const, d: RIBBON },
    { k: "fold" as const, d: FOLD },
    { k: "wing" as const, d: WING },
  ];
  return (
    <svg viewBox={KAGU_VIEWBOX} className={className} aria-hidden="true" focusable="false" fill="none">
      {paths.map(({ k, d }) => (
        <path
          key={k}
          d={d}
          fill={on(k) ? "#f2f2f2" : "none"}
          fillOpacity={on(k) ? 0.92 : 0}
          stroke={on(k) ? "#f2f2f2" : "#9a9a9a"}
          strokeOpacity={on(k) ? 1 : 0.35}
          strokeWidth={1.5}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}
