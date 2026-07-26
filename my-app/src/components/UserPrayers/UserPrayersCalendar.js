"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Inbox,
  CheckCircle2,
  XCircle,
  Clock,
  X,
  Eye,
  Tag,
  User,
  FileText,
  Trash2,
} from "lucide-react";
import { fetchUserPrayers, updateUserPrayer, deleteUserPrayer, fetchUserPrayerStats } from "../../lib/adminApi";

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

function startOfWeek(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday-start
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function fmt(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function UserPrayersCalendar() {
  const today = useMemo(() => new Date(), []);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [counts, setCounts] = useState({});
  const [selectedDate, setSelectedDate] = useState(() => fmt(new Date()));
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dayLoading, setDayLoading] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(null);
  const [preview, setPreview] = useState(null);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  // Load the 7 days' counts by fetching full this week from stats/byDate, but that
  // stats by default only includes last 7 days relative to "now". For an arbitrary week
  // we query the entire collection and bucket locally. Given small data set it's fine.
  const loadCounts = useCallback(async () => {
    setLoading(true);
    try {
      // Grab up to 500 prayers spanning the week.
      const res = await fetchUserPrayers({ page: 1, pageSize: 500 });
      const map = {};
      (res.items || []).forEach((p) => {
        if (!p.createdAt) return;
        const d = new Date(p.createdAt);
        const inWindow =
          d.getTime() >= weekStart.getTime() &&
          d.getTime() < weekStart.getTime() + 7 * 86400000;
        if (!inWindow) return;
        const key = fmt(d);
        map[key] = (map[key] || 0) + 1;
      });
      setCounts(map);
      setError("");
    } catch (err) {
      setError(err.message || "Failed to load calendar data.");
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  // Load prayers for selected date whenever it changes
  const loadDay = useCallback(async () => {
    if (!selectedDate) return;
    setDayLoading(true);
    try {
      const res = await fetchUserPrayers({ page: 1, pageSize: 100, date: selectedDate });
      setItems(res.items || []);
    } catch (err) {
      setError(err.message || "Failed to load prayers for this day.");
    } finally {
      setDayLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadDay();
  }, [loadDay]);

  const handleStatus = useCallback(
    async (id, s) => {
      setBusy(`${id}-${s}`);
      try {
        await updateUserPrayer(id, { status: s });
        setItems((prev) => prev.map((p) => (p.id === id ? { ...p, status: s } : p)));
        setPreview((prev) => (prev && prev.id === id ? { ...prev, status: s } : prev));
      } catch (err) {
        alert(err.message || "Failed to update status.");
      } finally {
        setBusy(null);
      }
    },
    []
  );

  const handleDelete = useCallback(
    async (id) => {
      if (!window.confirm("Delete this prayer permanently?")) return;
      setBusy(`${id}-delete`);
      try {
        await deleteUserPrayer(id);
        setItems((prev) => prev.filter((p) => p.id !== id));
        setPreview((prev) => (prev && prev.id === id ? null : prev));
      } catch (err) {
        alert(err.message || "Failed to delete prayer.");
      } finally {
        setBusy(null);
      }
    },
    []
  );

  const maxCount = Math.max(1, ...Object.values(counts), 0);

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
              <CalendarIcon className="text-blue-600" /> Prayer Calendar
            </h1>
            <p className="text-gray-500 mt-1">View prayers submitted each day. Click a day to see all prayers from that date.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setWeekStart((ws) => {
                  const d = new Date(ws);
                  d.setDate(d.getDate() - 7);
                  return d;
                })
              }
              className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-white border border-gray-200 shadow-sm hover:bg-gray-50 text-gray-700"
              aria-label="Previous week"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setWeekStart(startOfWeek(new Date()))}
              className="h-11 px-5 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-sm shadow-lg hover:opacity-95 transition"
            >
              This week
            </button>
            <button
              onClick={() =>
                setWeekStart((ws) => {
                  const d = new Date(ws);
                  d.setDate(d.getDate() + 7);
                  return d;
                })
              }
              className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-white border border-gray-200 shadow-sm hover:bg-gray-50 text-gray-700"
              aria-label="Next week"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </motion.div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Week range label + grid */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-2">
          <div className="px-4 md:px-6 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <span className="text-lg font-extrabold text-gray-900">
                {weekDays[0].toLocaleDateString(undefined, { month: "long", day: "numeric" })} —{" "}
                {weekDays[6].toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-gray-500">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-500" /> Pending
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Approved
              </span>
              <span className="inline-flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5 text-rose-500" /> Rejected
              </span>
            </div>
          </div>

          {/* Week grid */}
          <div className="grid grid-cols-7 gap-1.5 p-3 md:p-4">
            {loading
              ? Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="h-28 rounded-2xl bg-gray-100 animate-pulse" />
                ))
              : weekDays.map((d) => {
                  const key = fmt(d);
                  const cnt = counts[key] || 0;
                  const selected = selectedDate === key;
                  const isToday = sameDay(d, today);
                  const pct = maxCount ? (cnt / maxCount) * 100 : 0;
                  return (
                    <button
                      key={key}
                      onClick={() => setSelectedDate(key)}
                      className="group relative rounded-2xl p-3 md:p-4 text-left transition border-2"
                      style={{
                        background: selected
                          ? "linear-gradient(135deg, #2563eb, #4f46e5)"
                          : isToday
                          ? "linear-gradient(135deg, #eff6ff, #eef2ff)"
                          : "#fafafa",
                        borderColor: selected ? "#2563eb" : isToday ? "#93c5fd" : "transparent",
                      }}
                    >
                      <div
                        className={`text-[11px] md:text-xs font-bold uppercase tracking-wider mb-2 ${
                          selected ? "text-white/80" : "text-gray-400"
                        }`}
                      >
                        {d.toLocaleDateString(undefined, { weekday: "short" })}
                      </div>
                      <div
                        className={`text-xl md:text-2xl font-extrabold ${
                          selected ? "text-white" : isToday ? "text-blue-600" : "text-gray-900"
                        }`}
                      >
                        {d.getDate()}
                      </div>
                      <div
                        className={`text-[10px] md:text-xs font-bold mt-1 ${
                          selected ? "text-white/90" : "text-gray-500"
                        }`}
                      >
                        {d.toLocaleDateString(undefined, { month: "short" })}
                      </div>

                      {/* Count bar */}
                      <div
                        className={`mt-3 rounded-xl overflow-hidden ${selected ? "bg-white/20" : "bg-gray-100"}`}
                        style={{ height: 8 }}
                      >
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(pct, cnt > 0 ? 8 : 0)}%` }}
                          transition={{ duration: 0.6 }}
                          className="h-full rounded-xl"
                          style={{
                            background: selected
                              ? "rgba(255,255,255,0.9)"
                              : "linear-gradient(90deg, #3b82f6, #6366f1)",
                          }}
                        />
                      </div>
                      <div
                        className={`mt-2 inline-flex items-center gap-1 text-[10px] md:text-xs font-extrabold ${
                          selected ? "text-white" : cnt > 0 ? "text-blue-600" : "text-gray-400"
                        }`}
                      >
                        <Inbox className="w-3 h-3 md:w-3.5 md:h-3.5" />
                        {cnt} prayer{cnt === 1 ? "" : "s"}
                      </div>
                    </button>
                  );
                })}
          </div>
        </div>

        {/* Selected day prayers list */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6 md:p-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Prayers ·{" "}
                {new Date(selectedDate + "T00:00:00").toLocaleDateString(undefined, {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {items.length} prayer{items.length === 1 ? "" : "s"} submitted this day
              </p>
            </div>
          </div>

          {dayLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 rounded-2xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : items.length ? (
            <div className="space-y-3">
              {items.map((p) => (
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
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border border-purple-200 bg-purple-50 text-purple-700">
                            Anonymous
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-medium text-gray-500 flex flex-wrap gap-2">
                        <span>By {p.anonymous ? "Anonymous" : p.username || "Unknown"}</span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1">
                          <Tag className="w-3 h-3 text-blue-500" /> {p.category}
                        </span>
                        <span>·</span>
                        <span>{p.createdAt ? new Date(p.createdAt).toLocaleTimeString() : "—"}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                        {p.description || p.content?.slice(0, 180)}
                        {(p.description || p.content)?.length > 180 ? "…" : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => setPreview(p)}
                        className="p-2 rounded-xl hover:bg-slate-100 text-gray-600 hover:text-blue-600 transition"
                        title="Preview"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {p.status !== "approved" && (
                        <button
                          onClick={() => handleStatus(p.id, "approved")}
                          disabled={!!busy}
                          className="p-2 rounded-xl hover:bg-emerald-50 text-emerald-600 transition disabled:opacity-40"
                          title="Approve"
                        >
                          {busy === `${p.id}-approved` ? (
                            <div className="w-4 h-4 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      {p.status !== "rejected" && (
                        <button
                          onClick={() => handleStatus(p.id, "rejected")}
                          disabled={!!busy}
                          className="p-2 rounded-xl hover:bg-rose-50 text-rose-600 transition disabled:opacity-40"
                          title="Reject"
                        >
                          {busy === `${p.id}-rejected` ? (
                            <div className="w-4 h-4 border-2 border-rose-200 border-t-rose-600 rounded-full animate-spin" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(p.id)}
                        disabled={!!busy}
                        className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-rose-600 transition disabled:opacity-40"
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
            <div className="text-sm text-gray-400 text-center py-16">
              <div className="mx-auto w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-3">
                <CalendarIcon className="w-8 h-8 text-gray-400" />
              </div>
              <div className="text-lg font-bold text-gray-700">No prayers this day</div>
              <div className="mt-1">Prayers submitted on this date will appear here.</div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Preview Modal (reuse pattern from Manager) */}
      <AnimatePresence>
        {preview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 md:p-8"
            onClick={() => setPreview(null)}
          >
            <motion.div
              initial={{ scale: 0.96, y: 10, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, y: 10, opacity: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="flex items-start justify-between gap-4 px-6 md:px-8 pt-6 pb-4 border-b border-gray-100">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {statusBadge(preview.status)}
                    {preview.anonymous && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-purple-200 bg-purple-50 text-purple-700">
                        Anonymous
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-50 border border-gray-200 text-xs font-semibold text-gray-700">
                      <Tag className="w-3 h-3 text-blue-600" />
                      {preview.category}
                    </span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-gray-900 truncate">{preview.title}</h2>
                  <div className="text-sm text-gray-500 mt-1 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      {preview.anonymous ? "Anonymous" : preview.username || "Unknown"}
                    </span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1.5">
                      {preview.createdAt ? new Date(preview.createdAt).toLocaleString() : "—"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setPreview(null)}
                  className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition flex-shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 md:px-8 py-6 space-y-6">
                {preview.description && (
                  <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 p-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-1 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5" /> Description
                    </div>
                    <div className="text-gray-800 font-medium">{preview.description}</div>
                  </div>
                )}
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                    Full Prayer
                  </div>
                  <div className="text-gray-800 whitespace-pre-wrap leading-relaxed text-[15px]">
                    {preview.content}
                  </div>
                </div>
              </div>
              <div className="px-6 md:px-8 py-5 border-t border-gray-100 flex flex-wrap items-center justify-end gap-2 bg-slate-50/60">
                {preview.status !== "approved" && (
                  <button
                    onClick={() => handleStatus(preview.id, "approved")}
                    disabled={!!busy}
                    className="px-5 py-2.5 rounded-2xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition inline-flex items-center gap-2 disabled:opacity-50"
                  >
                    Approve
                  </button>
                )}
                {preview.status !== "rejected" && (
                  <button
                    onClick={() => handleStatus(preview.id, "rejected")}
                    disabled={!!busy}
                    className="px-5 py-2.5 rounded-2xl bg-white border border-rose-200 text-rose-700 font-semibold hover:bg-rose-50 transition inline-flex items-center gap-2 disabled:opacity-50"
                  >
                    Reject
                  </button>
                )}
                <button
                  onClick={() => handleDelete(preview.id)}
                  disabled={!!busy}
                  className="px-5 py-2.5 rounded-2xl bg-white border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition inline-flex items-center gap-2 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
