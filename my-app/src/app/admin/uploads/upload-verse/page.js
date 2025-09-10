
"use client";
import React from 'react'

import UploadVerse from "../../../../components/DailyVerseAdminPanel/DailyVerseAdminPanel"


export default function AdminPage() {
  return (
    <div className="flex bg-gray-50 ">
      

      {/* Main Content */}
      <main className="flex-1 ml-20 md:ml-64 p-6 md:p-10 transition-all duration-500">
        <UploadVerse />
      </main>
    </div>
  );
}
