"use client";

// Force dynamic rendering to prevent pre-rendering errors
export const dynamic = "force-dynamic";

import Sidebar from "@/components/Sidebar/Sidebar";
import ContentDashboard from "@/components/Content/ContentDashboard";

export default function PrayersPage() {
  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-20 md:ml-64 transition-all duration-500">
        <ContentDashboard
          title="Prayers Content Dashboard"
          contentCollection="prayersContent"
          carouselCollection="prayersCarousel"
          dashboardPath="/admin/prayers"
          carouselPath="/admin/prayers/carousel"
          contentPath="/admin/prayers/manager"
          note="This manages the 'Prayer' tile on the app's Home > Explore Faith screen (stories, messages, images, and videos about prayer). It is NOT the same as the app's Library > Prayer Room screen — for that, use the 'Prayer Room (Library screen)' item in the sidebar instead."
        />
      </main>
    </div>
  );
}
