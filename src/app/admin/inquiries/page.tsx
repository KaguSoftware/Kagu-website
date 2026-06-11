import { redirect } from "next/navigation";

/* Inquiries moved into the unified Requests view (contact messages +
   project inquiries). Kept as a redirect so old bookmarks keep working. */
export default function InquiriesRedirect() {
  redirect("/admin/requests");
}
