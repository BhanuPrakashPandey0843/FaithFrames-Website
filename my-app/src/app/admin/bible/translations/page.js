"use client";

import Sidebar from "../../../../components/Sidebar/Sidebar";
import TranslationManager from "../../../../components/Bible/TranslationManager";

export default function BibleTranslationsPage() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="min-h-screen flex-1 transition-all duration-500 md:ml-64">
        <TranslationManager />
      </main>
    </div>
  );
}
