"use client";

// Force dynamic rendering to prevent pre-rendering errors
export const dynamic = "force-dynamic";

import Sidebar from "@/components/Sidebar/Sidebar";
import ContentDashboard from "@/components/Content/ContentDashboard";

export default function WorshipPage() {
  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-20 md:ml-64 transition-all duration-500">
        <ContentDashboard
          title="Worship Content Dashboard"
          contentCollection="worshipContent"
          carouselCollection="worshipCarousel"
          dashboardPath="/admin/worship"
          carouselPath="/admin/worship/carousel"
          contentPath="/admin/worship/manager"
        />
      </main>
    </div>
  );
}
