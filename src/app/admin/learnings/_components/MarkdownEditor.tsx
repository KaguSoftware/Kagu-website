"use client";

import { useRef, useState, type DragEvent, type ClipboardEvent } from "react";
import { uploadLearningImage } from "../../_actions/learnings";
import { adminToast } from "../../_components/toast";
import { Markdown } from "./Markdown";

/*
  Markdown editor with Write/Preview tabs. The preview renders through the same
  <Markdown> component as the article page, so what you preview is exactly what
  ships. Images paste/drop straight into the textarea: a placeholder is inserted
  at the cursor, the file uploads via the uploadLearningImage server action, and
  the placeholder is swapped for real markdown image syntax.

  The textarea carries name="body", so the parent stays a plain <form action>.
*/

const TOOLBAR: {
  label: string;
  title: string;
  before: string;
  after: string;
  block?: boolean;
  placeholder: string;
}[] = [
  { label: "B", title: "Bold", before: "**", after: "**", placeholder: "bold text" },
  { label: "I", title: "Italic", before: "_", after: "_", placeholder: "italic text" },
  { label: "H2", title: "Section heading", before: "## ", after: "", block: true, placeholder: "Heading" },
  { label: "H3", title: "Subheading", before: "### ", after: "", block: true, placeholder: "Heading" },
  { label: "`·`", title: "Inline code", before: "`", after: "`", placeholder: "code" },
  { label: "```", title: "Code block", before: "```ts\n", after: "\n```", block: true, placeholder: "const answer = 42;" },
  { label: "Link", title: "Link", before: "[", after: "](https://)", placeholder: "label" },
  { label: "List", title: "Bullet list", before: "- ", after: "", block: true, placeholder: "item" },
  { label: "Note", title: "Callout (also: TIP, IMPORTANT, WARNING, CAUTION)", before: "> [!NOTE]\n> ", after: "", block: true, placeholder: "Something worth flagging." },
  { label: "Table", title: "Table", before: "| Column | Column |\n| --- | --- |\n| ", after: " |  |", block: true, placeholder: "cell" },
];

export function MarkdownEditor({ defaultValue = "" }: { defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [dragging, setDragging] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  /** Insert markdown around the current selection and restore focus. */
  const insert = (before: string, after: string, placeholder: string, block?: boolean) => {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end } = el;
    const selected = value.slice(start, end) || placeholder;
    // Block syntax wants its own line.
    const needsNewline = block && start > 0 && value[start - 1] !== "\n";
    const prefix = (needsNewline ? "\n\n" : "") + before;
    const next = value.slice(0, start) + prefix + selected + after + value.slice(end);
    setValue(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    });
  };

  const uploadImages = async (files: File[]) => {
    const el = ref.current;
    const images = files.filter((f) => f.type.startsWith("image/"));
    if (!el || images.length === 0) return;

    for (const file of images) {
      const alt = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ") || "screenshot";
      const placeholder = `![Uploading ${alt}…]()`;
      const start = el.selectionStart;
      setValue((v) => {
        const at = document.activeElement === el ? start : v.length;
        return v.slice(0, at) + `\n${placeholder}\n` + v.slice(at);
      });

      const fd = new FormData();
      fd.set("file", file);
      const res = await uploadLearningImage(fd);
      if ("url" in res) {
        setValue((v) => v.replace(placeholder, `![${alt}](${res.url})`));
      } else {
        setValue((v) => v.replace(`\n${placeholder}\n`, "").replace(placeholder, ""));
        adminToast("error", res.error);
      }
    }
  };

  const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(e.clipboardData.files);
    if (files.some((f) => f.type.startsWith("image/"))) {
      e.preventDefault();
      void uploadImages(files);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    void uploadImages(Array.from(e.dataTransfer.files));
  };

  const tabClass = (active: boolean) =>
    `px-4 py-2 font-mono text-xs uppercase tracking-[0.18em] transition-colors border-b-2 ${
      active
        ? "border-mint-deep text-ink"
        : "border-transparent text-slate-ink hover:text-ink"
    }`;

  return (
    <div className="kagu-field">
      <span className="eyebrow mb-2 block">
        Documentation <span className="text-mint-deep">*</span>
      </span>

      <div className="flex flex-wrap items-center justify-between gap-2 border border-b-0 border-neutral px-2">
        <div className="flex">
          <button type="button" onClick={() => setTab("write")} className={tabClass(tab === "write")}>
            Write
          </button>
          <button type="button" onClick={() => setTab("preview")} className={tabClass(tab === "preview")}>
            Preview
          </button>
        </div>
        {tab === "write" ? (
          <div className="flex flex-wrap items-center gap-1 py-1">
            {TOOLBAR.map((t) => (
              <button
                key={t.title}
                type="button"
                title={t.title}
                onClick={() => insert(t.before, t.after, t.placeholder, t.block)}
                className="px-2 py-1 font-mono text-xs text-slate-ink transition-colors hover:text-mint-deep"
              >
                {t.label}
              </button>
            ))}
            <button
              type="button"
              title="Upload image"
              onClick={() => fileRef.current?.click()}
              className="px-2 py-1 font-mono text-xs text-slate-ink transition-colors hover:text-mint-deep"
            >
              Img
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              multiple
              hidden
              onChange={(e) => {
                void uploadImages(Array.from(e.target.files ?? []));
                e.target.value = "";
              }}
            />
          </div>
        ) : null}
      </div>

      <div
        className="relative"
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) {
            e.preventDefault();
            setDragging(true);
          }
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        {/* The textarea stays mounted (CSS-hidden in preview) so the form value
            always submits. */}
        <textarea
          ref={ref}
          name="body"
          required
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onPaste={onPaste}
          spellCheck
          className={`min-h-[28rem] w-full resize-y border border-neutral bg-transparent p-4 font-mono text-sm leading-relaxed text-ink outline-none focus-visible:border-mint-deep ${
            tab === "preview" ? "hidden" : ""
          }`}
        />
        {tab === "preview" ? (
          <div className="min-h-[28rem] border border-neutral p-6">
            {value.trim() ? (
              <Markdown source={value} />
            ) : (
              <p className="text-sm text-slate-ink">Nothing to preview yet.</p>
            )}
          </div>
        ) : null}
        {dragging ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center border-2 border-dashed border-mint-deep bg-paper/80">
            <span className="font-mono text-xs uppercase tracking-[0.18em] text-mint-deep">
              Drop image to upload
            </span>
          </div>
        ) : null}
      </div>

      <span className="mt-1.5 block text-xs text-slate-ink">
        Markdown with GitHub extras: tables, task lists, ```code blocks```, and
        callouts (&gt; [!NOTE] / [!TIP] / [!WARNING]). Paste or drop screenshots
        directly into the editor.
      </span>
    </div>
  );
}
