import "server-only";
import { revalidatePath } from "next/cache";

/** Revalidate every public surface that reads CMS content. Cheap and safe. */
export function revalidatePublic() {
  revalidatePath("/", "layout");
  revalidatePath("/work");
  revalidatePath("/about");
  revalidatePath("/team");
}
