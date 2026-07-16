import { redirect } from "next/navigation";

// Canonical Jesus Content dashboard lives at /admin/jesus.
export default function JesusContentRedirectPage() {
  redirect("/admin/jesus");
}
