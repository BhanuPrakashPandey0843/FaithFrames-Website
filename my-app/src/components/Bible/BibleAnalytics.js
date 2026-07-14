"use client";
import { motion } from "framer-motion";
import {
  TrendingUp,
  BookOpen,
  User,
  Bookmark,
  FileText,
} from "lucide-react";

const STATS = [
  { key: "activeUsers", label: "Active Bible Readers", value: "0", icon: User, color: "from-blue-600 to-indigo-500" },
  { key: "totalBookmarks", label: "Total Bookmarks", value: "0", icon: Bookmark, color: "from-emerald-600 to-green-500" },
  { key: "totalNotes", label: "Total Notes", value: "0", icon: FileText, color: "from-amber-600 to-yellow-500" },
  { key: "plansCompleted", label: "Plans Completed", value: "0", icon: BookOpen, color: "from-purple-600 to-pink-500" },
];

export default function BibleAnalytics() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-4xl font-extrabold text-gray-900 flex items-center gap-2">
            <TrendingUp className="text-indigo-600" /> Bible Analytics
          </h1>
          <p className="text-gray-500 mt-1">Track engagement and usage statistics for the Bible module.</p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {STATS.map((stat, idx) => (
          <motion.div
            key={stat.key}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className={`rounded-3xl p-5 bg-gradient-to-br ${stat.color} text-white shadow-xl relative overflow-hidden`}
          >
            <stat.icon className="w-8 h-8 opacity-80 mb-4" />
            <div className="text-3xl font-extrabold">{stat.value}</div>
            <div className="text-sm font-medium opacity-90 mt-1">{stat.label}</div>
          </motion.div>
        ))}
        </div>

        <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-8 text-center">
          <h2 className="text-xl font-bold text-gray-400">Detailed Analytics Coming Soon</h2>
        </div>
      </div>
    </div>
  );
}
