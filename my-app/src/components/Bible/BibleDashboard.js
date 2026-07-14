"use client";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Calendar,
  Sparkles,
  Image,
  Bell,
  TrendingUp,
  CheckCircle2,
  XCircle,
  BookOpen,
  Users,
  Bookmark,
  FileText,
} from "lucide-react";

const STAT_CARDS = [
  { key: "totalPlans", label: "Total Reading Plans", icon: Calendar, color: "from-indigo-600 to-indigo-500" },
  { key: "activePlans", label: "Active Plans", icon: CheckCircle2, color: "from-emerald-600 to-emerald-500" },
  { key: "totalDailyVerses", label: "Daily Verses", icon: Sparkles, color: "from-amber-600 to-amber-500" },
  { key: "activeBanners", label: "Active Banners", icon: Image, color: "from-purple-600 to-purple-500" },
  { key: "totalAnnouncements", label: "Announcements", icon: Bell, color: "from-pink-600 to-pink-500" },
  { key: "totalBookmarks", label: "User Bookmarks", icon: Bookmark, color: "from-blue-600 to-blue-500" },
  { key: "totalNotes", label: "User Notes", icon: FileText, color: "from-green-600 to-green-500" },
  { key: "activeUsers", label: "Active Users", icon: Users, color: "from-red-600 to-red-500" },
];

export default function BibleDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = { totalPlans: 3, activePlans: 3, totalDailyVerses: 8, activeBanners: 0, totalAnnouncements: 0, totalBookmarks: 0, totalNotes: 0, activeUsers: 0 };
      setStats(data);
      setError("");
    } catch (err) {
      setError(err.message || "Failed to load stats.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 flex items-center gap-2">
              <BookOpen className="text-indigo-600" /> Bible Management
            </h1>
            <p className="text-gray-500 mt-1">Manage reading plans, daily verses, banners, and announcements.</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Link
              href="/admin/bible/plans"
              className="px-5 py-3 rounded-2xl bg-white border border-gray-200 shadow-sm font-semibold text-gray-700 hover:shadow-md transition flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" /> Reading Plans
            </Link>
            <Link
              href="/admin/bible/daily-verses"
              className="px-5 py-3 rounded-2xl bg-white border border-gray-200 shadow-sm font-semibold text-gray-700 hover:shadow-md transition flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" /> Daily Verses
            </Link>
            <Link
              href="/admin/bible/banners"
              className="px-5 py-3 rounded-2xl bg-white border border-gray-200 shadow-sm font-semibold text-gray-700 hover:shadow-md transition flex items-center gap-2"
            >
              <Image className="w-4 h-4" /> Banners
            </Link>
          </div>
        </motion.div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {STAT_CARDS.map((card, i) => (
            <motion.div
              key={card.key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`rounded-3xl p-5 bg-gradient-to-br ${card.color} text-white shadow-xl relative overflow-hidden`}
            >
              <card.icon className="w-8 h-8 opacity-80 mb-4" />
              <div className="text-3xl font-extrabold">
                {loading ? (
                  <span className="inline-block w-12 h-7 rounded bg-white/25 animate-pulse" />
                ) : (
                  (stats?.[card.key] ?? 0).toLocaleString()
                )}
              </div>
              <div className="text-sm font-medium opacity-90 mt-1">{card.label}</div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 md:p-8"
        >
          <h2 className="text-xl font-bold text-gray-900 mb-5">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: "Reading Plans", icon: Calendar, path: "/admin/bible/plans" },
              { name: "Daily Verses", icon: Sparkles, path: "/admin/bible/daily-verses" },
              { name: "Banners", icon: Image, path: "/admin/bible/banners" },
              { name: "Announcements", icon: Bell, path: "/admin/bible/announcements" },
            ].map((item, i) => (
              <Link
                key={item.name}
                href={item.path}
                className="flex flex-col items-center gap-3 p-5 rounded-2xl border border-gray-100 hover:bg-gray-50 transition"
              >
                <item.icon className="w-8 h-8 text-indigo-600" />
                <span className="font-semibold text-gray-800">{item.name}</span>
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
