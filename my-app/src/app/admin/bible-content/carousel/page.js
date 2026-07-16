import { redirect } from "next/navigation";

// Canonical Bible Carousel manager lives at /admin/bible/carousel.
export default function BibleContentCarouselRedirectPage() {
  redirect("/admin/bible/carousel");
}
