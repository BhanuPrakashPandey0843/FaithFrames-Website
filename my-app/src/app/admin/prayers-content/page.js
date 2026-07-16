import { redirect } from "next/navigation";

// Canonical Prayers Content dashboard lives at /admin/prayers.
export default function PrayersContentRedirectPage() {
  redirect("/admin/prayers");
}
