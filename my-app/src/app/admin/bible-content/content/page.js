import { redirect } from "next/navigation";

// Canonical Bible Content manager lives at /admin/bible/manager.
export default function BibleContentContentRedirectPage() {
  redirect("/admin/bible/manager");
}
