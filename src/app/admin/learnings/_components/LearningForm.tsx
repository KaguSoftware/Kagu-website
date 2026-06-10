import { Field, ButtonLink } from "../../_components/ui";
import { SubmitButton } from "../../_components/SubmitButton";
import type { Tables } from "@/lib/supabase/database.types";
import { MarkdownEditor } from "./MarkdownEditor";

/* Starter skeleton for new entries — a structured nudge beats a blank page and
   keeps the knowledge base consistent. */
const TEMPLATE = `## What I learned

A short, plain-language explanation of the thing.

## Why it matters

What breaks, improves, or speeds up because of this.

## How to do it

1. Step one
2. Step two

\`\`\`ts
// minimal working example
\`\`\`

> [!TIP]
> Drop screenshots straight into this editor — they upload automatically.

## Gotchas

- Things that bit me so they don't bite you.

## Official docs & links

- [Name of the doc](https://)
`;

export function LearningForm({
  action,
  learning,
}: {
  action: (formData: FormData) => void;
  learning?: Tables<"learnings">;
}) {
  return (
    <form action={action} className="max-w-3xl space-y-6">
      {learning ? <input type="hidden" name="id" value={learning.id} /> : null}
      <Field
        label="Title"
        name="title"
        defaultValue={learning?.title}
        required
        placeholder="e.g. Streaming Supabase realtime updates into Server Components"
      />
      <Field
        label="Summary"
        name="summary"
        defaultValue={learning?.summary}
        placeholder="One sentence that makes someone want to read this."
        hint="Shown as the hook on the learnings index."
      />
      <Field
        label="Tags"
        name="tags"
        defaultValue={learning?.tags.join(", ")}
        placeholder="nextjs, supabase, performance"
        hint="Comma-separated. Used for filtering."
      />
      <MarkdownEditor defaultValue={learning?.body ?? TEMPLATE} />
      <div className="flex items-center gap-4 pt-2">
        <SubmitButton pendingLabel="Publishing…">
          {learning ? "Save changes" : "Publish learning"}
        </SubmitButton>
        <ButtonLink href={learning ? `/admin/learnings/${learning.id}` : "/admin/learnings"}>
          Cancel
        </ButtonLink>
      </div>
    </form>
  );
}
