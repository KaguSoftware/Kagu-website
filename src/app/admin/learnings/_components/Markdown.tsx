import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { type ReactNode, isValidElement } from "react";
import { slugify } from "../_lib/markdown";
import { CodeBlock } from "./CodeBlock";

/*
  Shared markdown renderer — server-safe (no hooks), used by both the article
  detail page (RSC) and the editor's client-side preview tab, so preview and
  final render are pixel-identical. Styling lives in ../learnings.css (.lr-*).

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

// Colours per kind come from status tokens in learnings.css (data-kind).
const CALLOUTS: Record<string, { label: string }> = {
  note: { label: "Note" },
  tip: { label: "Tip" },
  important: { label: "Important" },
  warning: { label: "Warning" },
  caution: { label: "Caution" },
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
  return (
    <Tag id={id} className="scroll-mt-24">
      <a href={`#${id}`}>
        {children}
        <span className="lr-hash" aria-hidden>
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
        className="lr-link"
      >
        {children}
        {external ? <span className="lr-ext">↗</span> : null}
      </a>
    );
  },
  pre: CodeBlock,
  code: ({ className, children, ...props }) => (
    // Inline code only — fenced blocks come through `pre` above with hljs classes.
    <code className={className ?? "lr-icode"} {...props}>
      {children}
    </code>
  ),
  blockquote: (props) => {
    const kind = (props as Record<string, unknown>)["data-callout"];
    const callout = typeof kind === "string" ? CALLOUTS[kind] : undefined;
    if (callout) {
      return (
        <aside className="lr-callout" data-kind={kind as string}>
          <p className="lr-callout__label">{callout.label}</p>
          <div className="lr-callout__body">{props.children}</div>
        </aside>
      );
    }
    return <blockquote className="lr-quote">{props.children}</blockquote>;
  },
  img: ({ src, alt }) => (
    <figure className="lr-fig">
      {/* Plain <img>: sources are the public learning-images bucket or external
          docs — not worth remotePatterns config for an internal tool. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={typeof src === "string" ? src : undefined} alt={alt ?? ""} loading="lazy" />
      {alt ? <figcaption>{alt}</figcaption> : null}
    </figure>
  ),
  table: ({ children }) => (
    <div className="lr-tablewrap">
      <table>{children}</table>
    </div>
  ),
  input: (props) =>
    props.type === "checkbox" ? (
      <input {...props} className="lr-check" />
    ) : (
      <input {...props} />
    ),
};

export function Markdown({ source }: { source: string }) {
  return (
    <div className="md-body lr-prose">
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
