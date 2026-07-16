"use client";

// Force dynamic rendering to prevent pre-rendering errors
export const dynamic = "force-dynamic";

import Sidebar from "@/components/Sidebar/Sidebar";
import ContentCarouselManager from "@/components/Content/ContentCarouselManager";
import {
  PRAYERS_CONTENT_BANNER_CLOUDINARY_FOLDER,
} from "@/lib/adminCollections";

export default function PrayersCarouselPage() {
  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-20 md:ml-64 transition-all duration-500">
        <ContentCarouselManager
          title="Prayers Carousel"
          carouselCollection="prayersCarousel"
          bannerCloudinaryFolder={PRAYERS_CONTENT_BANNER_CLOUDINARY_FOLDER}
        />
      </main>
    </div>
  );
}
