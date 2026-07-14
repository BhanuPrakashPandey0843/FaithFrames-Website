"use client";

// Force dynamic rendering to prevent pre-rendering errors
export const dynamic = "force-dynamic";

import React from "react";
import Sidebar from "../../../../components/Sidebar/Sidebar";
import VideosManager from "../../../../components/WitnessVideos/VideosManager";

export default function WitnessVideosManagerPage() {
  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-20 md:ml-64 transition-all duration-500">
        <VideosManager />
      </main>
    </div>
  );
}
