import { redirect } from "next/navigation";

// Canonical Jesus Carousel manager lives at /admin/jesus/carousel.
export default function JesusContentCarouselRedirectPage() {
  redirect("/admin/jesus/carousel");
}
