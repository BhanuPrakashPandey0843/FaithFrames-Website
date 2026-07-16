import { redirect } from "next/navigation";

// Canonical Worship Content manager lives at /admin/worship/manager.
export default function WorshipContentContentRedirectPage() {
  redirect("/admin/worship/manager");
}
