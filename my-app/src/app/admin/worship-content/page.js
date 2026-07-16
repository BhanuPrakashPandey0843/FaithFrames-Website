import { redirect } from "next/navigation";

// Canonical Worship Content dashboard lives at /admin/worship.
export default function WorshipContentRedirectPage() {
  redirect("/admin/worship");
}
