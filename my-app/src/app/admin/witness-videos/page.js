"use client";

// Force dynamic rendering to prevent pre-rendering errors
export const dynamic = "force-dynamic";

import React from "react";
import Sidebar from "../../../components/Sidebar/Sidebar";
import WitnessVideoDashboard from "../../../components/WitnessVideos/WitnessVideoDashboard";

export default function WitnessVideosDashboardPage() {
  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-20 md:ml-64 transition-all duration-500">
        <WitnessVideoDashboard />
      </main>
    </div>
  );
}
