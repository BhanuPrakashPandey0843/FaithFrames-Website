import { redirect } from "next/navigation";

// Canonical Bible Content dashboard lives at /admin/bible.
// This route exists so /admin/bible-content (as referenced in older
// links/bookmarks) keeps working instead of 404ing.
export default function BibleContentRedirectPage() {
  redirect("/admin/bible");
}
