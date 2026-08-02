"use client";
import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  FileQuestion,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Bookmark,
  GalleryHorizontal,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { fetchAdminContent } from "../../lib/adminApi";

const STAT_CARDS = [
  { key: "totalContent", label: "Total Content", icon: FileQuestion, color: "from-indigo-600 to-indigo-500" },
  { key: "activeContent", label: "Active Content", icon: CheckCircle2, color: "from-emerald-600 to-emerald-500" },
  { key: "inactiveContent", label: "Inactive Content", icon: XCircle, color: "from-gray-500 to-gray-400" },
  { key: "totalViews", label: "Total Views", icon: Eye, color: "from-blue-600 to-blue-500" },
  { key: "totalLikes", label: "Total Likes", icon: ThumbsUp, color: "from-pink-600 to-pink-500" },
  { key: "totalDislikes", label: "Total Dislikes", icon: ThumbsDown, color: "from-red-600 to-red-500" },
  { key: "totalSaved", label: "Saved by Users", icon: Bookmark, color: "from-amber-600 to-amber-500" },
  { key: "activeBanners", label: "Active Banners", icon: GalleryHorizontal, color: "from-purple-600 to-purple-500" },
];

export default function ContentDashboard({
  title,
  contentCollection,
  carouselCollection,
  dashboardPath,
  carouselPath,
  contentPath,
  note,
}) {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [contentRes, carouselRes] = await Promise.all([
        fetchAdminContent(contentCollection),
        fetchAdminContent(carouselCollection),
      ]);
      const contentItems = contentRes.items || [];
      const carouselItems = carouselRes.items || [];

      const activeContent = contentItems.filter(i => i.isActive !== false);
      const totalViews = contentItems.reduce((sum, i) => sum + (i.views || 0), 0);
      const totalLikes = contentItems.reduce((sum, i) => sum + (i.likes || 0), 0);
      const totalDislikes = contentItems.reduce((sum, i) => sum + (i.dislikes || 0), 0);
      const activeBanners = carouselItems.filter(i => i.isActive !== false).length;

      setStats({
        totalContent: contentItems.length,
        activeContent: activeContent.length,
        inactiveContent: contentItems.length - activeContent.length,
        totalViews,
        totalLikes,
        totalDislikes,
        totalSaved: 0,
        activeBanners,
        recentlyAdded: contentItems.slice(0, 5),
      });
      setError("");
    } catch (err) {
      setError(err.message || "Failed to load stats.");
    } finally {
      setLoading(false);
    }
  }, [contentCollection, carouselCollection]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 flex items-center gap-2">
              <FileQuestion className="text-indigo-600" /> {title}
            </h1>
            <p className="text-gray-500 mt-1">Manage the hero carousel and content for the mobile app.</p>
            {note && (
              <p className="text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mt-3 text-sm max-w-2xl">
                {note}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <Link
              href={carouselPath}
              className="px-5 py-3 rounded-2xl bg-white border border-gray-200 shadow-sm font-semibold text-gray-700 hover:shadow-md transition flex items-center gap-2"
            >
              <GalleryHorizontal className="w-4 h-4" /> Carousel Manager
            </Link>
            <Link
              href={contentPath}
              className="px-5 py-3 rounded-2xl bg-indigo-600 text-white shadow-lg font-semibold hover:bg-indigo-700 transition flex items-center gap-2"
            >
              <FileQuestion className="w-4 h-4" /> Content Manager
            </Link>
          </div>
        </motion.div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">{error}</div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {STAT_CARDS.map((card, i) => {
            const Icon = card.icon;
            return (
            <motion.div
              key={card.key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`rounded-3xl p-5 bg-gradient-to-br ${card.color} text-white shadow-xl relative overflow-hidden`}
            >
              <Icon className="w-8 h-8 opacity-80 mb-4" />
              <div className="text-3xl font-extrabold">
                {loading ? (
                  <span className="inline-block w-12 h-7 rounded bg-white/25 animate-pulse" />
                ) : (
                  (stats?.[card.key] ?? 0).toLocaleString()
                )}
              </div>
              <div className="text-sm font-medium opacity-90 mt-1">{card.label}</div>
            </motion.div>
          )})}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-3xl shadow-md border border-gray-200 p-6 md:p-8"
        >
          <h2 className="text-xl font-bold text-gray-900 mb-5">Recently Added Content</h2>
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />)}
            </div>
          ) : !stats?.recentlyAdded?.length ? (
            <p className="text-gray-400 text-center py-10">No content yet.</p>
          ) : (
            <div className="space-y-3">
              {stats.recentlyAdded.map((item) => {
                const Icon = item.video ? GalleryHorizontal : FileQuestion;
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 p-3 rounded-2xl border border-gray-200 hover:bg-gray-50 transition"
                  >
                    <div className="w-28 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                      {item.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <Icon className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{item.title}</p>
                      <p className="text-sm text-gray-500">{(item.views || 0).toLocaleString()} views</p>
                    </div>
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full ${
                        item.isActive !== false ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {item.isActive !== false ? "Active" : "Inactive"}
                    </span>
                    <ArrowRight className="w-4 h-4 text-gray-300" />
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
