import { redirect } from "next/navigation";

// Canonical Prayers Carousel manager lives at /admin/prayers/carousel.
export default function PrayersContentCarouselRedirectPage() {
  redirect("/admin/prayers/carousel");
}
