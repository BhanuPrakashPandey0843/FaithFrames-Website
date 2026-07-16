import { redirect } from "next/navigation";

// Canonical Worship Carousel manager lives at /admin/worship/carousel.
export default function WorshipContentCarouselRedirectPage() {
  redirect("/admin/worship/carousel");
}
