"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  Inbox,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Calendar,
  Tag,
  RefreshCw,
} from "lucide-react";
import { fetchUserPrayerStats } from "../../lib/adminApi";
import { USER_PRAYER_CATEGORIES } from "../../lib/adminCollections";

const STAT_CARDS = [
  { key: "total", label: "Total Prayers", icon: Inbox, color: "from-blue-600 to-blue-500" },
  { key: "pending", label: "Pending", icon: Clock, color: "from-amber-600 to-amber-500" },
  { key: "approved", label: "Approved", icon: CheckCircle2, color: "from-emerald-600 to-emerald-500" },
  { key: "rejected", label: "Rejected", icon: XCircle, color: "from-rose-600 to-rose-500" },
  { key: "today", label: "Today", icon: TrendingUp, color: "from-indigo-600 to-indigo-500" },
  { key: "thisWeek", label: "This Week", icon: Calendar, color: "from-purple-600 to-purple-500" },
];

export default function UserPrayersAnalytics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchUserPrayerStats();
      setStats(data);
      setError("");
    } catch (err) {
      setError(err.message || "Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sortedCategories = useMemo(() => {
    const byCat = stats?.byCategory || {};
    return USER_PRAYER_CATEGORIES.map((c) => ({
      name: c,
      count: byCat[c] || 0,
    })).sort((a, b) => b.count - a.count);
  }, [stats]);

  const total = Math.max(1, stats?.total || 1);

  const approvalRate = useMemo(() => {
    const tot = (stats?.approved || 0) + (stats?.rejected || 0);
    if (!tot) return 0;
    return Math.round((stats.approved / tot) * 100);
  }, [stats]);

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
              <BarChart3 className="text-blue-600" /> Prayer Analytics
            </h1>
            <p className="text-gray-500 mt-1">
              Track submissions over time, moderation results, and category distribution.
            </p>
          </div>
          <button
            onClick={load}
            className="px-5 py-2.5 rounded-2xl bg-white border border-gray-200 shadow-sm font-semibold text-gray-700 hover:shadow-md transition inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </motion.div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
          {STAT_CARDS.map((card, i) => (
            <motion.div
              key={card.key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`rounded-3xl p-5 bg-gradient-to-br ${card.color} text-white shadow-xl relative overflow-hidden`}
            >
              <card.icon className="w-8 h-8 opacity-80 mb-3" />
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 md:p-8"
          >
            <div className="flex items-start justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Approval Rate</h2>
              <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
            </div>
            <div className="flex items-end justify-between gap-6">
              <div className="flex-1">
                <div className="text-5xl font-extrabold text-gray-900">
                  {loading ? (
                    <span className="inline-block w-24 h-14 rounded-xl bg-gray-100 animate-pulse" />
                  ) : (
                    `${approvalRate}%`
                  )}
                </div>
                <div className="text-sm text-gray-500 mt-2">
                  {loading ? (
                    <span className="inline-block w-56 h-4 rounded bg-gray-100 animate-pulse" />
                  ) : (
                    `${stats?.approved || 0} approved · ${stats?.rejected || 0} rejected`
                  )}
                </div>
                <div className="mt-5 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${approvalRate}%` }}
                    transition={{ duration: 1 }}
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full"
                  />
                </div>
              </div>
              <div className="w-36 h-36 relative flex-shrink-0">
                <svg viewBox="0 0 120 120" className="-rotate-90 w-full h-full">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#f3f4f6" strokeWidth="14" />
                  <motion.circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="url(#gApproval)"
                    strokeWidth="14"
                    strokeLinecap="round"
                    initial={{ strokeDasharray: "0 314" }}
                    animate={{
                      strokeDasharray: loading
                        ? "0 314"
                        : `${Math.round((approvalRate / 100) * 314)} 314`,
                    }}
                    transition={{ duration: 1 }}
                  />
                  <defs>
                    <linearGradient id="gApproval" x1="0" x2="1" y1="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" />
                      <stop offset="100%" stopColor="#10b981" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-2xl font-extrabold text-gray-900">
                    {loading ? "…" : `${approvalRate}%`}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 md:p-8"
          >
            <div className="flex items-start justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Status Breakdown</h2>
              <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
            </div>
            {loading ? (
              <div className="space-y-5">
                {[0, 1, 2].map((i) => (
                  <div key={i}>
                    <div className="h-4 w-full rounded bg-gray-100 animate-pulse mb-2" />
                    <div className="h-3 w-3/4 rounded bg-gray-50 animate-pulse" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-5">
                {[
                  { key: "pending", label: "Pending", color: "#f59e0b" },
                  { key: "approved", label: "Approved", color: "#10b981" },
                  { key: "rejected", label: "Rejected", color: "#f43f5e" },
                ].map((s) => {
                  const c = stats?.[s.key] || 0;
                  const pct = Math.round((c / total) * 100);
                  return (
                    <div key={s.key}>
                      <div className="flex items-center justify-between text-sm font-semibold mb-1.5">
                        <span className="text-gray-700">{s.label}</span>
                        <span className="text-gray-900 font-extrabold">
                          {c.toLocaleString()}{" "}
                          <span className="text-gray-400 font-semibold">({pct}%)</span>
                        </span>
                      </div>
                      <div className="h-2.5 rounded-full bg-gray-50 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: s.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 md:p-8"
        >
          <div className="flex flex-wrap items-center justify-between mb-6 gap-2">
            <h2 className="text-xl font-bold text-gray-900">Submissions — Last 7 Days</h2>
            <div className="text-xs text-gray-500 font-semibold">Daily prayer count</div>
          </div>
          {loading ? (
            <div className="flex items-end justify-between gap-3 h-56">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="flex-1 rounded-2xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : stats?.byDate?.length ? (
            <div className="flex items-end justify-between gap-3 h-56">
              {stats.byDate.map((d, i) => {
                const max = Math.max(1, ...stats.byDate.map((x) => x.count));
                const h = (d.count / max) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div className="text-xs font-bold text-gray-500">{d.count || ""}</div>
                    <div className="w-full bg-gray-50 rounded-2xl overflow-hidden flex-1 flex items-end">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max(h, d.count > 0 ? 4 : 0)}%` }}
                        transition={{ duration: 0.7, delay: i * 0.05 }}
                        className="w-full rounded-t-2xl"
                        style={{
                          background: "linear-gradient(180deg, #60a5fa 0%, #2563eb 100%)",
                        }}
                      />
                    </div>
                    <div className="text-xs font-medium text-gray-600">{d.label}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-gray-400 text-center py-16">No data yet.</div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 md:p-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Tag className="w-5 h-5 text-blue-600" /> Category Distribution
            </h2>
          </div>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-16 rounded-2xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sortedCategories.map((cat, i) => {
                const pct = Math.round((cat.count / total) * 100);
                return (
                  <div
                    key={cat.name}
                    className="rounded-2xl p-4 bg-gradient-to-br from-slate-50 to-white border border-gray-100"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                          <span className="text-xs font-extrabold text-white">{i + 1}</span>
                        </div>
                        <div className="text-sm font-bold text-gray-800">{cat.name}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-extrabold text-gray-900">{cat.count}</div>
                        <div className="text-[11px] font-semibold text-gray-500">{pct}%</div>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: i * 0.03 }}
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                      />
                    </div>
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
