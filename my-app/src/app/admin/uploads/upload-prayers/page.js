
"use client";
import React from 'react'
import Sidebar from "../../../../components/Sidebar/Sidebar"
import UploadPrayers from "../../../../components/UploadPrayers/UploadPrayers"


export default function AdminPage() {
  return (
    <div className="flex bg-gray-50 min-h-screen">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 ml-20 md:ml-64 p-6 md:p-10 transition-all duration-500">
        <UploadPrayers />
      </main>
    </div>
  );
}
