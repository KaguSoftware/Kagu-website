/*
  Renders a schema.org node as an application/ld+json script tag.
  Server-safe; place inside the page body (Google reads JSON-LD anywhere).
*/

export function JsonLd({ data }: { data: object }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify output of our own literal objects — no user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
