"use client";

/*
  MailLink — the studio email as a control that always does something.

  A bare `mailto:` anchor is a dead click for anyone without a desktop mail
  handler registered (most webmail users), which is exactly how the address on
  /contact read: press it, nothing happens. This still hands the click to the OS
  mail composer — prefilled with a subject so the draft starts written — but it
  also copies the address to the clipboard and says so, so the click has a
  visible result either way.

  Right-click / long-press still expose "Copy link address" because the href is
  a real mailto.
*/

import { useCallback, useEffect, useRef, useState } from "react";

interface MailLinkProps {
  email: string;
  /** Prefills the mail draft's subject line. */
  subject?: string;
  /** Prefills the mail draft's body. */
  body?: string;
  /** Link content. Defaults to the address itself. */
  children?: React.ReactNode;
  /**
   * Where the "Copied" confirmation lands: `badge` sits inline after the link,
   * `block` drops onto its own line under it (for large display addresses).
   */
  confirm?: "badge" | "block";
  className?: string;
  style?: React.CSSProperties;
  "data-cursor"?: string;
}

const CONFIRM_MS = 2400;

function buildHref(email: string, subject?: string, body?: string) {
  const params = [
    subject ? `subject=${encodeURIComponent(subject)}` : "",
    body ? `body=${encodeURIComponent(body)}` : "",
  ].filter(Boolean);
  return `mailto:${email}${params.length ? `?${params.join("&")}` : ""}`;
}

/** Clipboard API where it exists (needs a secure context), execCommand elsewhere. */
async function copy(text: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:-9999px;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

export function MailLink({
  email,
  subject = "Project inquiry",
  body,
  children,
  confirm = "badge",
  className,
  style,
  ...rest
}: MailLinkProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const onClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      // Leave modified clicks (open in new tab, etc.) entirely alone.
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      // Don't preventDefault — the mail composer should still open for anyone
      // who has one. The copy is the guaranteed half of the interaction.
      void copy(email).then((ok) => {
        if (!ok) return;
        setCopied(true);
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), CONFIRM_MS);
      });
    },
    [email],
  );

  // Announcement lives in a permanently-mounted clipped region so screen
  // readers hear it; the visible chip is separate and aria-hidden.
  const live = (
    <span
      aria-live="polite"
      style={{
        position: "absolute",
        width: 1,
        height: 1,
        margin: -1,
        padding: 0,
        overflow: "hidden",
        clip: "rect(0 0 0 0)",
        whiteSpace: "nowrap",
        border: 0,
      }}
    >
      {copied ? `${email} copied to clipboard` : ""}
    </span>
  );

  const chipStyle: React.CSSProperties = {
    fontSize: "var(--type-xs)",
    letterSpacing: "var(--tracking-eyebrow)",
    textTransform: "uppercase",
    color: "var(--mint-text)",
    whiteSpace: "nowrap",
    pointerEvents: "none",
    transition: "opacity 220ms var(--ease-arc)",
  };

  const chip =
    confirm === "block" ? (
      // Space is reserved permanently so the confirmation can't shove the rest
      // of the column around when it appears.
      <span
        aria-hidden
        className="font-mono"
        style={{
          ...chipStyle,
          display: "block",
          marginTop: "var(--space-3)",
          opacity: copied ? 1 : 0,
        }}
      >
        Copied — opening mail
      </span>
    ) : copied ? (
      <span
        aria-hidden
        className="font-mono"
        style={{ ...chipStyle, display: "inline-block", marginLeft: 10, opacity: 1 }}
      >
        Copied
      </span>
    ) : null;

  return (
    <>
      <a
        href={buildHref(email, subject, body)}
        onClick={onClick}
        className={className}
        style={style}
        {...rest}
      >
        {children ?? email}
      </a>
      {live}
      {chip}
    </>
  );
}
