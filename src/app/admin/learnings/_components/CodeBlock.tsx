"use client";

import { useState, type ReactNode, type ComponentPropsWithoutRef } from "react";
import { isValidElement, Children } from "react";

/* Fenced code block chrome: language label + copy button above the highlighted
   code. Receives the rendered <pre> children from react-markdown (a <code>
   element whose className carries `language-x` and whose children are already
   hljs-highlighted spans). */

function flattenText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join("");
  if (isValidElement<{ children?: ReactNode }>(node))
    return flattenText(node.props.children);
  return "";
}

export function CodeBlock({ children, ...props }: ComponentPropsWithoutRef<"pre">) {
  const [copied, setCopied] = useState(false);

  const code = Children.toArray(children)[0];
  let language = "";
  if (isValidElement<{ className?: string }>(code)) {
    language = code.props.className?.match(/language-([\w+-]+)/)?.[1] ?? "";
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(flattenText(children).replace(/\n$/, ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable — ignore */
    }
  };

  return (
    <div className="lr-code">
      <div className="lr-code__head">
        <span className="lr-code__lang">{language || "code"}</span>
        <button type="button" onClick={copy} data-copied={copied} className="lr-copy">
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre {...props}>{children}</pre>
    </div>
  );
}
