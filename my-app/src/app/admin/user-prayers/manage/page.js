"use client";
export const dynamic = "force-dynamic";
import React from "react";
import Sidebar from "../../../../components/Sidebar/Sidebar";
import UserPrayersManager from "../../../../components/UserPrayers/UserPrayersManager";

export default function UserPrayersManagePage() {
  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-20 md:ml-64 transition-all duration-500">
        <UserPrayersManager />
      </main>
    </div>
  );
}
