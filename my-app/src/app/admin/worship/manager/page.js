"use client";

// Force dynamic rendering to prevent pre-rendering errors
export const dynamic = "force-dynamic";

import Sidebar from "@/components/Sidebar/Sidebar";
import ContentManager from "@/components/Content/ContentManager";
import {
  WORSHIP_CONTENT_THUMBNAIL_CLOUDINARY_FOLDER,
  WORSHIP_CONTENT_VIDEO_CLOUDINARY_FOLDER,
  WORSHIP_CONTENT_CATEGORIES,
} from "@/lib/adminCollections";

export default function WorshipManagerPage() {
  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-20 md:ml-64 transition-all duration-500">
        <ContentManager
          title="Worship Content Manager"
          contentCollection="worshipContent"
          thumbnailCloudinaryFolder={WORSHIP_CONTENT_THUMBNAIL_CLOUDINARY_FOLDER}
          videoCloudinaryFolder={WORSHIP_CONTENT_VIDEO_CLOUDINARY_FOLDER}
          categories={WORSHIP_CONTENT_CATEGORIES}
        />
      </main>
    </div>
  );
}
