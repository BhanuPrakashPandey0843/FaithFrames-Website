"use client";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Clapperboard,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Bookmark,
  GalleryHorizontal,
  CheckCircle2,
  XCircle,
  Video,
  ArrowRight,
} from "lucide-react";
import { fetchWitnessVideoStats } from "../../lib/adminApi";

const STAT_CARDS = [
  { key: "totalVideos", label: "Total Videos", icon: Clapperboard, color: "from-indigo-600 to-indigo-500" },
  { key: "activeVideos", label: "Active Videos", icon: CheckCircle2, color: "from-emerald-600 to-emerald-500" },
  { key: "inactiveVideos", label: "Inactive Videos", icon: XCircle, color: "from-gray-500 to-gray-400" },
  { key: "totalViews", label: "Total Views", icon: Eye, color: "from-blue-600 to-blue-500" },
  { key: "totalLikes", label: "Total Likes", icon: ThumbsUp, color: "from-pink-600 to-pink-500" },
  { key: "totalDislikes", label: "Total Dislikes", icon: ThumbsDown, color: "from-red-600 to-red-500" },
  { key: "totalSaved", label: "Saved by Users", icon: Bookmark, color: "from-amber-600 to-amber-500" },
  { key: "activeBanners", label: "Active Banners", icon: GalleryHorizontal, color: "from-purple-600 to-purple-500" },
];

export default function WitnessVideoDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await fetchWitnessVideoStats();
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
              <Clapperboard className="text-indigo-600" /> Witness Videos
            </h1>
            <p className="text-gray-500 mt-1">Manage the hero carousel and video catalogue for the mobile app.</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/admin/witness-videos/carousel"
              className="px-5 py-3 rounded-2xl bg-white border border-gray-200 shadow-sm font-semibold text-gray-700 hover:shadow-md transition flex items-center gap-2"
            >
              <GalleryHorizontal className="w-4 h-4" /> Carousel Manager
            </Link>
            <Link
              href="/admin/witness-videos/videos"
              className="px-5 py-3 rounded-2xl bg-indigo-600 text-white shadow-lg font-semibold hover:bg-indigo-700 transition flex items-center gap-2"
            >
              <Video className="w-4 h-4" /> Videos Manager
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
          <h2 className="text-xl font-bold text-gray-900 mb-5">Recently Added Videos</h2>
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : !stats?.recentlyAdded?.length ? (
            <p className="text-gray-400 text-center py-10">No videos uploaded yet.</p>
          ) : (
            <div className="space-y-3">
              {stats.recentlyAdded.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center gap-4 p-3 rounded-2xl border border-gray-100 hover:bg-gray-50 transition"
                >
                  <div className="w-20 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    {v.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={v.thumbnail} alt={v.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <Video className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{v.title}</p>
                    <p className="text-sm text-gray-500">{v.views.toLocaleString()} views</p>
                  </div>
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full ${
                      v.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {v.isActive ? "Active" : "Inactive"}
                  </span>
                  <ArrowRight className="w-4 h-4 text-gray-300" />
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
