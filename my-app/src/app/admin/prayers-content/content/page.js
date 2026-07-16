import { redirect } from "next/navigation";

// Canonical Prayers Content manager lives at /admin/prayers/manager.
export default function PrayersContentContentRedirectPage() {
  redirect("/admin/prayers/manager");
}
