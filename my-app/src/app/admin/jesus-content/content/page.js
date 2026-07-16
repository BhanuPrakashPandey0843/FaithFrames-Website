import { redirect } from "next/navigation";

// Canonical Jesus Content manager lives at /admin/jesus/manager.
export default function JesusContentContentRedirectPage() {
  redirect("/admin/jesus/manager");
}
