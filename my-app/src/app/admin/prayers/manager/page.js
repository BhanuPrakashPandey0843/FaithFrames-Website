"use client";

// Force dynamic rendering to prevent pre-rendering errors
export const dynamic = "force-dynamic";

import Sidebar from "@/components/Sidebar/Sidebar";
import ContentManager from "@/components/Content/ContentManager";
import {
  PRAYERS_CONTENT_THUMBNAIL_CLOUDINARY_FOLDER,
  PRAYERS_CONTENT_VIDEO_CLOUDINARY_FOLDER,
  PRAYERS_CONTENT_CATEGORIES,
} from "@/lib/adminCollections";

export default function PrayersManagerPage() {
  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-20 md:ml-64 transition-all duration-500">
        <ContentManager
          title="Prayers Content Manager"
          contentCollection="prayersContent"
          thumbnailCloudinaryFolder={PRAYERS_CONTENT_THUMBNAIL_CLOUDINARY_FOLDER}
          videoCloudinaryFolder={PRAYERS_CONTENT_VIDEO_CLOUDINARY_FOLDER}
          categories={PRAYERS_CONTENT_CATEGORIES}
          note="Heads up: items added here appear on Home > Explore Faith > Prayer, not on the Library > Prayer Room screen. To add prayers to Prayer Room, use 'Prayer Room (Library screen)' in the sidebar instead."
        />
      </main>
    </div>
  );
}
