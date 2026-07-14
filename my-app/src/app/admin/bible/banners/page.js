"use client";
import Sidebar from "../../../../components/Sidebar/Sidebar";
import BibleBannersManager from "../../../../components/Bible/BibleBannersManager";

export default function BibleBannersPage() {
  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-20 md:ml-64 transition-all duration-500">
        <BibleBannersManager />
      </main>
    </div>
  );
}
