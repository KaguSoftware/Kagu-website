import { AsciiLogo } from "@/components/ascii/AsciiLogo";

/** A faint, large, slowly turning ASCII Kagu mark behind the page. */
export function ContactBackdrop() {
  return (
    <div className="cx-bg" aria-hidden="true">
      <AsciiLogo className="cx-bg__logo" />
    </div>
  );
}
