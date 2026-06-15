"use client";

// Force dynamic rendering to prevent pre-rendering errors
export const dynamic = "force-dynamic";

import React from "react";
import Sidebar from "../../../../components/Sidebar/Sidebar";
import UploadStories from "../../../../components/UploadStories/UploadStories";

export default function AdminPage() {
  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar />

      <main className="flex-1 ml-20 md:ml-64 p-6 md:p-10 transition-all duration-500">
        <UploadStories />
      </main>
    </div>
  );
}
