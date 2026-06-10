import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { type ReactNode, isValidElement } from "react";
import { slugify } from "../_lib/markdown";
import { CodeBlock } from "./CodeBlock";

/*
  Shared markdown renderer — server-safe (no hooks), used by both the article
  detail page (RSC) and the editor's client-side preview tab, so preview and
  final render are pixel-identical.

  SECURITY: never add rehype-raw. react-markdown skips raw HTML by default and
  strips javascript: URLs — that default is the entire sanitization story here.
*/

function flattenText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join("");
  if (isValidElement<{ children?: ReactNode }>(node))
    return flattenText(node.props.children);
  return "";
}

/* ---- GitHub-style callouts (> [!NOTE] …) as a tiny remark plugin ---------- */

const CALLOUT_RE = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*\n?/;

type MdNode = {
  type: string;
  value?: string;
  children?: MdNode[];
  data?: { hProperties?: Record<string, string> };
};

function remarkCallouts() {
  const walk = (node: MdNode) => {
    for (const child of node.children ?? []) {
      if (child.type === "blockquote") {
        const para = child.children?.[0];
        const text = para?.children?.[0];
        if (para?.type === "paragraph" && text?.type === "text" && text.value) {
          const m = text.value.match(CALLOUT_RE);
          if (m) {
            text.value = text.value.replace(CALLOUT_RE, "");
            if (!text.value) para.children!.shift();
            child.data = {
              ...child.data,
              hProperties: { "data-callout": m[1].toLowerCase() },
            };
          }
        }
      }
      walk(child);
    }
  };
  return walk;
}

const CALLOUTS: Record<string, { label: string; border: string; text: string }> = {
  note: { label: "Note", border: "border-l-mint-deep", text: "text-mint-deep" },
  tip: { label: "Tip", border: "border-l-[#3ecf8e]", text: "text-[#3ecf8e]" },
  important: { label: "Important", border: "border-l-[#a78bfa]", text: "text-[#a78bfa]" },
  warning: { label: "Warning", border: "border-l-[#f5a623]", text: "text-[#f5a623]" },
  caution: { label: "Caution", border: "border-l-[#ef5350]", text: "text-[#ef5350]" },
};

/* ---- Element styling ------------------------------------------------------ */

function Heading({
  level,
  children,
}: {
  level: 2 | 3 | 4;
  children: ReactNode;
}) {
  const id = slugify(flattenText(children));
  const Tag = `h${level}` as const;
  const size =
    level === 2 ? "mt-12 text-xl" : level === 3 ? "mt-9 text-lg" : "mt-7 text-base";
  return (
    <Tag id={id} className={`group scroll-mt-24 ${size} text-ink`}>
      <a href={`#${id}`} className="no-underline">
        {children}
        <span className="ml-2 text-neutral opacity-0 transition-opacity group-hover:opacity-100">
          #
        </span>
      </a>
    </Tag>
  );
}

const components: Components = {
  h1: ({ children }) => <Heading level={2}>{children}</Heading>,
  h2: ({ children }) => <Heading level={2}>{children}</Heading>,
  h3: ({ children }) => <Heading level={3}>{children}</Heading>,
  h4: ({ children }) => <Heading level={4}>{children}</Heading>,
  a: ({ href, children }) => {
    const external = /^https?:\/\//.test(href ?? "");
    return (
      <a
        href={href}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className="text-mint-deep underline decoration-mint-deep/40 underline-offset-4 transition-colors hover:decoration-mint-deep"
      >
        {children}
        {external ? <span className="ml-0.5 align-super text-[0.65em]">↗</span> : null}
      </a>
    );
  },
  pre: CodeBlock,
  code: ({ className, children, ...props }) => (
    // Inline code only — fenced blocks come through `pre` above with hljs classes.
    <code
      className={
        className ??
        "border border-neutral bg-mint-pale px-1.5 py-0.5 font-mono text-[0.875em] text-ink"
      }
      {...props}
    >
      {children}
    </code>
  ),
  blockquote: (props) => {
    const kind = (props as Record<string, unknown>)["data-callout"];
    const callout = typeof kind === "string" ? CALLOUTS[kind] : undefined;
    if (callout) {
      return (
        <aside
          className={`my-6 border border-neutral border-l-2 ${callout.border} bg-mint-pale px-5 py-4`}
        >
          <p className={`font-mono text-xs uppercase tracking-[0.18em] ${callout.text}`}>
            {callout.label}
          </p>
          <div className="mt-2 text-sm leading-relaxed [&>p]:my-1">
            {props.children}
          </div>
        </aside>
      );
    }
    return (
      <blockquote className="my-6 border-l-2 border-neutral pl-5 text-slate-ink italic">
        {props.children}
      </blockquote>
    );
  },
  img: ({ src, alt }) => (
    <figure className="my-8">
      {/* Plain <img>: sources are the public learning-images bucket or external
          docs — not worth remotePatterns config for an internal tool. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={typeof src === "string" ? src : undefined}
        alt={alt ?? ""}
        loading="lazy"
        className="w-full border border-neutral"
      />
      {alt ? (
        <figcaption className="mt-2 text-center font-mono text-xs uppercase tracking-[0.18em] text-slate-ink">
          {alt}
        </figcaption>
      ) : null}
    </figure>
  ),
  table: ({ children }) => (
    <div className="my-6 overflow-x-auto border border-neutral">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b border-neutral bg-mint-pale px-4 py-2.5 text-left font-mono text-xs uppercase tracking-[0.18em] text-slate-ink">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border-b border-neutral px-4 py-2.5 align-top">{children}</td>
  ),
  hr: () => <hr className="my-10 border-neutral" />,
  input: (props) =>
    props.type === "checkbox" ? (
      <input {...props} className="mr-1.5 size-3.5 translate-y-px accent-mint-deep" />
    ) : (
      <input {...props} />
    ),
};

export function Markdown({ source }: { source: string }) {
  return (
    <div className="md-body text-base leading-relaxed text-ink">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkCallouts]}
        rehypePlugins={[rehypeHighlight]}
        components={components}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
}
