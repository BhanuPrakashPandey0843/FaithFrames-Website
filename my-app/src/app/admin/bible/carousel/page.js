"use client";

// Force dynamic rendering to prevent pre-rendering errors
export const dynamic = "force-dynamic";

import Sidebar from "@/components/Sidebar/Sidebar";
import ContentCarouselManager from "@/components/Content/ContentCarouselManager";
import {
  BIBLE_CONTENT_BANNER_CLOUDINARY_FOLDER,
} from "@/lib/adminCollections";

export default function BibleCarouselPage() {
  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-20 md:ml-64 transition-all duration-500">
        <ContentCarouselManager
          title="Bible Carousel"
          carouselCollection="bibleCarousel"
          bannerCloudinaryFolder={BIBLE_CONTENT_BANNER_CLOUDINARY_FOLDER}
        />
      </main>
    </div>
  );
}
