"use client";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Inbox,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  ClipboardList,
  Calendar as CalendarIcon,
  BarChart3,
  ArrowRight,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Trash2,
} from "lucide-react";
import {
  fetchUserPrayerStats,
  fetchUserPrayers,
  updateUserPrayer,
  deleteUserPrayer,
} from "../../lib/adminApi";
import { USER_PRAYER_CATEGORIES } from "../../lib/adminCollections";

const STAT_CARDS = [
  { key: "total", label: "Total Prayers", icon: Inbox, color: "from-blue-600 to-blue-500" },
  { key: "pending", label: "Pending Review", icon: Clock, color: "from-amber-600 to-amber-500" },
  { key: "approved", label: "Approved", icon: CheckCircle2, color: "from-emerald-600 to-emerald-500" },
  { key: "rejected", label: "Rejected", icon: XCircle, color: "from-rose-600 to-rose-500" },
  { key: "today", label: "Submitted Today", icon: TrendingUp, color: "from-indigo-600 to-indigo-500" },
  { key: "thisWeek", label: "This Week", icon: CalendarIcon, color: "from-purple-600 to-purple-500" },
];

const statusBadge = (status) => {
  const map = {
    pending: "bg-amber-100 text-amber-700 border-amber-200",
    approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
    rejected: "bg-rose-100 text-rose-700 border-rose-200",
  };
  const labels = { pending: "Pending", approved: "Approved", rejected: "Rejected" };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
        map[status] || map.pending
      }`}
    >
      {labels[status] || "Pending"}
    </span>
  );
};

export default function UserPrayersDashboard() {
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    try {
      const [s, r] = await Promise.all([
        fetchUserPrayerStats(),
        fetchUserPrayers({ page: 1, pageSize: 5 }),
      ]);
      setStats(s);
      setRecent(r.items || []);
      setError("");
    } catch (err) {
      setError(err.message || "Failed to load prayer data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleStatus = useCallback(
    async (id, status) => {
      setBusy(`${id}-${status}`);
      try {
        await updateUserPrayer(id, { status });
        setRecent((prev) =>
          prev.map((p) => (p.id === id ? { ...p, status } : p))
        );
      } finally {
        setBusy(null);
      }
    },
    []
  );

  const handleDelete = useCallback(
    async (id) => {
      if (!window.confirm("Delete this prayer permanently? This cannot be undone.")) return;
      setBusy(`${id}-delete`);
      try {
        await deleteUserPrayer(id);
        setRecent((prev) => prev.filter((p) => p.id !== id));
      } finally {
        setBusy(null);
      }
    },
    []
  );

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
              <Inbox className="text-blue-600" /> User Prayers
            </h1>
            <p className="text-gray-500 mt-1">
              Moderate prayers submitted by your community. Approve what should appear publicly.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/admin/user-prayers/manage"
              className="px-5 py-3 rounded-2xl bg-white border border-gray-200 shadow-sm font-semibold text-gray-700 hover:shadow-md transition flex items-center gap-2"
            >
              <ClipboardList className="w-4 h-4" /> Manage
            </Link>
            <Link
              href="/admin/user-prayers/calendar"
              className="px-5 py-3 rounded-2xl bg-white border border-gray-200 shadow-sm font-semibold text-gray-700 hover:shadow-md transition flex items-center gap-2"
            >
              <CalendarIcon className="w-4 h-4" /> Calendar
            </Link>
            <Link
              href="/admin/user-prayers/analytics"
              className="px-5 py-3 rounded-2xl bg-blue-600 text-white shadow-lg font-semibold hover:bg-blue-700 transition flex items-center gap-2"
            >
              <BarChart3 className="w-4 h-4" /> Analytics
            </Link>
          </div>
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

        {/* Category distribution */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 md:p-8"
        >
          <h2 className="text-xl font-bold text-gray-900 mb-5">Categories</h2>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {USER_PRAYER_CATEGORIES.map((cat) => {
                const count = stats?.byCategory?.[cat] ?? 0;
                const total = stats?.total ?? 1;
                const pct = Math.round((count / total) * 100);
                return (
                  <div
                    key={cat}
                    className="rounded-2xl p-4 bg-gradient-to-br from-slate-50 to-white border border-gray-100"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-gray-700 truncate">{cat}</div>
                      <div className="text-lg font-extrabold text-blue-600">{count}</div>
                    </div>
                    <div className="h-2 mt-3 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Last 7 days bar */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 md:p-8"
        >
          <h2 className="text-xl font-bold text-gray-900 mb-5">Submissions — Last 7 Days</h2>
          {loading ? (
            <div className="flex items-end justify-between gap-3 h-40">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="flex-1 rounded-xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : stats?.byDate?.length ? (
            <div className="flex items-end justify-between gap-3 h-40">
              {stats.byDate.map((d, i) => {
                const max = Math.max(1, ...stats.byDate.map((x) => x.count));
                const h = (d.count / max) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div className="text-xs font-semibold text-gray-500">{d.count}</div>
                    <div className="w-full bg-gray-50 rounded-xl overflow-hidden flex items-end" style={{ height: "85%" }}>
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${Math.max(h, d.count > 0 ? 6 : 0)}%` }}
                        transition={{ duration: 0.5, delay: i * 0.05 }}
                        className="w-full bg-gradient-to-t from-blue-500 to-indigo-400 rounded-xl"
                      />
                    </div>
                    <div className="text-xs font-medium text-gray-600">{d.label}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-gray-400 text-center py-12">No submission data yet.</div>
          )}
        </motion.div>

        {/* Recent prayers */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 md:p-8"
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-gray-900">Recent Submissions</h2>
            <Link
              href="/admin/user-prayers/manage"
              className="text-sm font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
            >
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-20 rounded-2xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : recent.length ? (
            <div className="space-y-3">
              {recent.map((p) => (
                <div
                  key={p.id}
                  className="rounded-2xl border border-gray-100 p-4 hover:shadow-sm transition bg-gradient-to-br from-white to-slate-50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="text-base font-bold text-gray-900 truncate">{p.title}</h3>
                        {statusBadge(p.status)}
                        {p.anonymous && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border border-purple-200 bg-purple-50 text-purple-700">
                            Anonymous
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-medium text-gray-500 flex flex-wrap gap-2">
                        <span>By {p.anonymous ? "Anonymous" : p.username || "Unknown"}</span>
                        <span>·</span>
                        <span>{p.category}</span>
                        <span>·</span>
                        <span>{p.createdAt ? new Date(p.createdAt).toLocaleString() : "—"}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                        {p.description || p.content?.slice(0, 180)}
                        {(p.description || p.content)?.length > 180 ? "…" : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {p.status !== "approved" && (
                        <button
                          onClick={() => handleStatus(p.id, "approved")}
                          disabled={!!busy}
                          className="p-2 rounded-xl hover:bg-emerald-50 text-emerald-600 transition disabled:opacity-50"
                          title="Approve"
                        >
                          {busy === `${p.id}-approved` ? (
                            <div className="w-4 h-4 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                          ) : (
                            <ThumbsUp className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      {p.status !== "rejected" && (
                        <button
                          onClick={() => handleStatus(p.id, "rejected")}
                          disabled={!!busy}
                          className="p-2 rounded-xl hover:bg-rose-50 text-rose-600 transition disabled:opacity-50"
                          title="Reject"
                        >
                          {busy === `${p.id}-rejected` ? (
                            <div className="w-4 h-4 border-2 border-rose-200 border-t-rose-600 rounded-full animate-spin" />
                          ) : (
                            <ThumbsDown className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(p.id)}
                        disabled={!!busy}
                        className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-rose-600 transition disabled:opacity-50"
                        title="Delete"
                      >
                        {busy === `${p.id}-delete` ? (
                          <div className="w-4 h-4 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-400 text-center py-12">
              No prayers submitted yet. They will appear here once users submit.
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
