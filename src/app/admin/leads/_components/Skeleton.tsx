export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="ld-skel" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="ld-skel__row">
          <span style={{ width: "34%" }} />
          <span style={{ width: "16%" }} />
          <span style={{ width: "16%" }} />
          <span style={{ width: "8%", marginLeft: "auto" }} />
        </div>
      ))}
    </div>
  );
}
