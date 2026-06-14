import Link from "next/link";
import { SiteFooter } from "@/components/layout/SiteFooter";

export const metadata = {
  title: "Not found, Kagu",
};

export default function NotFound() {
  return (
    <>
      <section
        style={{ background: "var(--paper)", minHeight: "70svh" }}
        className="px-(--container-x) pt-(--space-32) pb-(--section-y) flex items-end"
      >
        <div className="w-full max-w-(--container-max) mx-auto">
          <span className="eyebrow block" style={{ marginBottom: "var(--space-6)" }}>
            404 · not found
          </span>
          <h1
            className="display"
            style={{
              fontSize: "var(--type-7xl)",
              lineHeight: 0.9,
              maxWidth: "12ch",
              letterSpacing: "var(--tracking-tight)",
            }}
          >
            That page is somewhere else.
          </h1>
          <p
            style={{
              fontSize: "var(--type-md)",
              lineHeight: 1.6,
              color: "var(--ink)",
              marginTop: "var(--space-8)",
              maxWidth: "44ch",
            }}
          >
            Either it moved, or it never existed. Either way, the work is still
            shipping.
          </p>
          <div
            style={{
              display: "flex",
              gap: "var(--space-6)",
              marginTop: "var(--space-12)",
              flexWrap: "wrap",
            }}
          >
            <Link
              href="/work"
              data-cursor="view"
              className="inline-flex items-center gap-3"
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--type-md)",
                letterSpacing: "var(--tracking-eyebrow)",
                textTransform: "uppercase",
                color: "var(--ink)",
                background: "var(--mint-deep)",
                padding: "20px 28px",
                minHeight: 56,
                border: "1px solid var(--ink)",
              }}
            >
              See the work
              <span aria-hidden style={{ width: 24, height: 1, background: "var(--ink)" }} />
            </Link>
            <Link
              href="/"
              data-cursor="nav-link"
              className="font-mono inline-flex items-center gap-3"
              style={{
                fontSize: "var(--type-sm)",
                letterSpacing: "var(--tracking-eyebrow)",
                textTransform: "uppercase",
                color: "var(--ink)",
                borderBottom: "1px solid var(--neutral)",
                paddingBottom: 6,
              }}
            >
              Back to home
            </Link>
          </div>
        </div>
      </section>
      <SiteFooter />
    </>
  );
}
