"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import {
  ImageIcon,
  BookOpen,
  HelpCircle,
  Quote,
  Users,
  Sparkles,
} from "lucide-react";
import { hasValidFirebaseConfig } from "../../firebase";
import { fetchAdminStats } from "../../lib/adminApi";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const CONTENT_COLLECTIONS = [
  { key: "wallpapers", label: "Wallpapers", icon: ImageIcon, color: "bg-indigo-600 text-white" },
  { key: "verses", label: "Daily Verses", icon: BookOpen, color: "bg-emerald-600 text-white" },
  { key: "prayers", label: "Daily Prayers", icon: BookOpen, color: "bg-teal-600 text-white" },
  { key: "questions", label: "Quiz Questions", icon: HelpCircle, color: "bg-orange-600 text-white" },
  { key: "quotes", label: "Quotes", icon: Quote, color: "bg-violet-600 text-white" },
  { key: "users", label: "Registered Users", icon: Users, color: "bg-blue-600 text-white" },
];

export default function Dashboard() {
  const [userStats, setUserStats] = useState([]);
  const [counts, setCounts] = useState({});
  const [statsError, setStatsError] = useState("");

  useEffect(() => {
    if (!hasValidFirebaseConfig) return undefined;

    let cancelled = false;

    const loadStats = async () => {
      try {
        const stats = await fetchAdminStats();
        if (cancelled) return;
        setCounts(stats.counts || {});
        setUserStats(stats.userGrowth || []);
        setStatsError("");
      } catch (err) {
        if (cancelled) return;
        setStatsError(err.message || "Failed to load dashboard stats.");
      }
    };

    loadStats();
    const interval = setInterval(loadStats, 30000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="space-y-10 bg-gradient-to-br from-slate-50 via-white to-slate-100 min-h-screen transition-all">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-4xl font-extrabold text-gray-900 flex items-center gap-2"
      >
        Dashboard <Sparkles className="text-yellow-500 animate-pulse" />
      </motion.h1>

      {!hasValidFirebaseConfig && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 text-sm"
          role="alert"
        >
          Firebase is not configured. Fill <code className="font-mono">shared/firebase.env</code> at the
          repo root, then run <code className="font-mono">scripts/sync-firebase-env.ps1</code> and restart
          the dev server.
        </motion.div>
      )}

      {statsError ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-red-900 text-sm"
          role="alert"
        >
          {statsError}
        </motion.div>
      ) : null}

      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: { transition: { staggerChildren: 0.1 } },
        }}
      >
        {CONTENT_COLLECTIONS.map((card, idx) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08, duration: 0.5 }}
            >
              <Card className={`${card.color} shadow-2xl rounded-3xl p-6 transition-all hover:scale-[1.02]`}>
                <CardContent className="flex flex-col space-y-3 text-white">
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-bold tracking-wide">{card.label}</div>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="text-3xl font-extrabold">{counts[card.key] ?? 0}</div>
                  <div className="text-sm opacity-90 italic font-light">
                    Server-side aggregate count
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3 }}
      >
        <Card className="p-6 rounded-3xl shadow-xl hover:shadow-2xl transition">
          <h2 className="text-xl font-bold mb-4 text-gray-900">User Growth Analytics</h2>
          {userStats.length === 0 ? (
            <p className="text-gray-500">No user activity recorded yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={userStats} margin={{ top: 20, right: 30, left: 0, bottom: 10 }}>
                <defs>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="day" tick={{ fill: "#6b7280", fontSize: 12 }} />
                <YAxis tick={{ fill: "#6b7280", fontSize: 12 }} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    borderRadius: "12px",
                    border: "1px solid #e5e7eb",
                    boxShadow: "0px 4px 12px rgba(0,0,0,0.08)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="users"
                  stroke="url(#colorUsers)"
                  strokeWidth={3}
                  dot={{ r: 5, fill: "#4f46e5", strokeWidth: 2, stroke: "#fff" }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
