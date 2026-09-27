"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Inbox,
  Search,
  X,
  CheckCircle2,
  XCircle,
  ThumbsUp,
  ThumbsDown,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Clock,
  SlidersHorizontal,
  User,
  CalendarDays,
  FileText,
  RefreshCw,
} from "lucide-react";
import {
  fetchUserPrayers,
  updateUserPrayer,
  deleteUserPrayer,
} from "../../lib/adminApi";
import { todayDisplayDateKey } from "../../lib/prayerSchedule";

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

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
];

const PAGE_SIZES = [10, 20, 50];

export default function UserPrayersManager() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("newest");
  const [dateFilter, setDateFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(null);
  const [preview, setPreview] = useState(null);
  const [debounced, setDebounced] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [approveTarget, setApproveTarget] = useState(null);
  const [approveDate, setApproveDate] = useState(todayDisplayDateKey());

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 280);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchUserPrayers({
        page,
        pageSize,
        search: debounced,
        status,
        sort,
        date: dateFilter,
      });
      setItems(res.items || []);
      setTotal(res.total || 0);
      setError("");
    } catch (err) {
      setError(err.message || "Failed to load prayers.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debounced, status, sort, dateFilter]);

  useEffect(() => {
    load();
  }, [load]);

  // reset to page 1 when filter/search/sort changes
  useEffect(() => {
    setPage(1);
  }, [debounced, status, sort, dateFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleStatus = useCallback(
    async (id, s, displayDate) => {
      setBusy(`${id}-${s}`);
      try {
        const payload = { status: s };
        if (s === "approved") payload.displayDate = displayDate || todayDisplayDateKey();
        await updateUserPrayer(id, payload);
        setItems((prev) =>
          prev.map((p) =>
            p.id === id ? { ...p, status: s, ...(payload.displayDate ? { displayDate: payload.displayDate } : {}) } : p
          )
        );
        setPreview((prev) =>
          prev && prev.id === id
            ? { ...prev, status: s, ...(payload.displayDate ? { displayDate: payload.displayDate } : {}) }
            : prev
        );
        setApproveTarget(null);
      } catch (err) {
        alert(err.message || "Failed to update status.");
      } finally {
        setBusy(null);
      }
    },
    []
  );

  const requestApprove = useCallback((prayer) => {
    setApproveTarget(prayer);
    setApproveDate(prayer.displayDate || todayDisplayDateKey());
  }, []);

  const handleDelete = useCallback(
    async (id) => {
      if (!window.confirm("Delete this prayer permanently? This cannot be undone.")) return;
      setBusy(`${id}-delete`);
      try {
        await deleteUserPrayer(id);
        setItems((prev) => prev.filter((p) => p.id !== id));
        setPreview((prev) => (prev && prev.id === id ? null : prev));
        setTotal((t) => Math.max(0, t - 1));
      } catch (err) {
        alert(err.message || "Failed to delete prayer.");
      } finally {
        setBusy(null);
      }
    },
    []
  );

  const resultsInfo = useMemo(() => {
    const from = (page - 1) * pageSize + 1;
    const to = Math.min(page * pageSize, total);
    return total ? `${from.toLocaleString()}–${to.toLocaleString()} of ${total.toLocaleString()}` : "No results";
  }, [page, pageSize, total]);

  const quickFilters = [
    { key: "all", label: "All", color: "text-gray-700 bg-gray-100 hover:bg-gray-200" },
    { key: "pending", label: "Pending", color: "text-amber-700 bg-amber-100 hover:bg-amber-200" },
    { key: "approved", label: "Approved", color: "text-emerald-700 bg-emerald-100 hover:bg-emerald-200" },
    { key: "rejected", label: "Rejected", color: "text-rose-700 bg-rose-100 hover:bg-rose-200" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 flex items-center gap-2">
              <Inbox className="text-blue-600" /> Manage User Prayers
            </h1>
            <p className="text-gray-500 mt-1">Review and approve prayers. Approved items appear in the app Prayer Room on the display date you choose — this page is moderation, not a second public feed.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setSearch("");
                setStatus("all");
                setDateFilter("");
                setSort("newest");
                setPage(1);
              }}
              className="px-4 py-2.5 rounded-2xl bg-white border border-gray-200 shadow-sm font-semibold text-gray-700 hover:shadow-md transition inline-flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Reset
            </button>
          </div>
        </motion.div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Status quick chips */}
        <div className="flex flex-wrap gap-2">
          {quickFilters.map((q) => (
            <button
              key={q.key}
              onClick={() => setStatus(q.key)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                status === q.key
                  ? q.color + " ring-2 ring-offset-1 ring-gray-300"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {q.label}
            </button>
          ))}
        </div>

        {/* Search + Filters */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5"
        >
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search prayer title, description, content, user name..."
                className="w-full h-12 pl-12 pr-10 rounded-2xl bg-gray-50 border border-gray-200 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-200"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>
            <button
              onClick={() => setFiltersOpen((o) => !o)}
              className={`inline-flex items-center justify-center gap-2 px-5 h-12 rounded-2xl font-semibold border transition ${
                filtersOpen || dateFilter
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" /> Filters
            </button>
          </div>

          <AnimatePresence>
            {filtersOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                    >
                      <option value="all">All Statuses</option>
                      <option value="pending">Pending</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Date</label>
                    <input
                      type="date"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Sort</label>
                    <div className="flex gap-2 flex-wrap">
                      {SORT_OPTIONS.map((s) => (
                        <button
                          key={s.value}
                          onClick={() => setSort(s.value)}
                          className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${
                            sort === s.value
                              ? "bg-blue-600 text-white"
                              : "bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100"
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Results header */}
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-600">{resultsInfo}</div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-600">Per page</label>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="h-9 px-3 rounded-xl bg-white border border-gray-200 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
            >
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Table / List */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-20 rounded-2xl bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : items.length ? (
            <div className="divide-y divide-gray-100">
              <div className="hidden md:grid md:grid-cols-12 px-6 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-gray-100 text-xs font-bold uppercase tracking-wider text-gray-500 gap-4">
                <div className="col-span-6">Prayer</div>
                <div className="col-span-2">User</div>
                <div className="col-span-2">Submitted</div>
                <div className="col-span-2 text-right">Actions</div>
              </div>
              <AnimatePresence initial={false}>
                {items.map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="grid grid-cols-1 md:grid-cols-12 px-6 py-5 items-center gap-4 hover:bg-slate-50/60 transition"
                  >
                    <div className="md:col-span-6 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-bold text-gray-900 truncate">{p.title}</h3>
                        {statusBadge(p.status)}
                        {p.anonymous && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border border-purple-200 bg-purple-50 text-purple-700">
                            Anonymous
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {p.description || p.content?.slice(0, 140)}
                        {(p.description || p.content)?.length > 140 ? "…" : ""}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-white" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-800 truncate">
                            {p.anonymous ? "Anonymous" : p.username || "Unknown"}
                          </div>
                          <div className="text-[11px] text-gray-400 font-medium truncate">
                            {p.userId?.slice(0, 8)}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600">
                        <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
                        {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "—"}
                      </div>
                      <div className="text-[11px] text-gray-400 font-medium mt-0.5">
                        {p.displayDate ? `Shows ${p.displayDate}` : p.createdAt ? new Date(p.createdAt).toLocaleTimeString() : ""}
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setPreview(p)}
                          className="p-2 rounded-xl hover:bg-slate-100 text-gray-600 hover:text-blue-600 transition"
                          title="Preview full prayer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {p.status !== "approved" && (
                          <button
                            onClick={() => requestApprove(p)}
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
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="px-6 py-20 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                <Inbox className="w-8 h-8 text-gray-400" />
              </div>
              <div className="text-lg font-bold text-gray-800">No prayers match your filters</div>
              <div className="text-sm text-gray-500 mt-1">Try adjusting your search or filters.</div>
            </div>
          )}
        </div>

        {/* Pagination */}
        {total > 0 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500 font-medium">
              Page <span className="text-gray-800 font-bold">{page}</span> of{" "}
              <span className="text-gray-800 font-bold">{totalPages}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1 hidden sm:flex">
                {Array.from({ length: Math.min(7, totalPages) }).map((_, i) => {
                  let n;
                  if (totalPages <= 7) {
                    n = i + 1;
                  } else if (page <= 4) {
                    n = i + 1;
                  } else if (page >= totalPages - 3) {
                    n = totalPages - 6 + i;
                  } else {
                    n = page - 3 + i;
                  }
                  return (
                    <button
                      key={n}
                      onClick={() => setPage(n)}
                      className={`w-10 h-10 rounded-xl font-bold text-sm transition ${
                        page === n
                          ? "bg-blue-600 text-white"
                          : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Preview Modal */}
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
                  </div>
                  <h2 className="text-2xl font-extrabold text-gray-900 truncate">{preview.title}</h2>
                  <div className="text-sm text-gray-500 mt-1 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      {preview.anonymous ? "Anonymous" : preview.username || "Unknown"}
                    </span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5" />
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
                  <div className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Full Prayer
                  </div>
                  <div className="text-gray-800 whitespace-pre-wrap leading-relaxed text-[15px]">
                    {preview.content}
                  </div>
                </div>
              </div>
              <div className="px-6 md:px-8 py-5 border-t border-gray-100 flex flex-wrap items-center justify-end gap-2 bg-slate-50/60">
                {preview.status !== "approved" && (
                  <button
                    onClick={() => requestApprove(preview)}
                    disabled={!!busy}
                    className="px-5 py-2.5 rounded-2xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition inline-flex items-center gap-2 disabled:opacity-50"
                  >
                    {busy === `${preview.id}-approved` ? (
                      <div className="w-4 h-4 border-2 border-emerald-200 border-t-white rounded-full animate-spin" />
                    ) : (
                      <ThumbsUp className="w-4 h-4" />
                    )}
                    Approve
                  </button>
                )}
                {preview.status !== "rejected" && (
                  <button
                    onClick={() => handleStatus(preview.id, "rejected")}
                    disabled={!!busy}
                    className="px-5 py-2.5 rounded-2xl bg-white border border-rose-200 text-rose-700 font-semibold hover:bg-rose-50 transition inline-flex items-center gap-2 disabled:opacity-50"
                  >
                    {busy === `${preview.id}-rejected` ? (
                      <div className="w-4 h-4 border-2 border-rose-200 border-t-rose-700 rounded-full animate-spin" />
                    ) : (
                      <ThumbsDown className="w-4 h-4" />
                    )}
                    Reject
                  </button>
                )}
                <button
                  onClick={() => handleDelete(preview.id)}
                  disabled={!!busy}
                  className="px-5 py-2.5 rounded-2xl bg-white border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition inline-flex items-center gap-2 disabled:opacity-50"
                >
                  {busy === `${preview.id}-delete` ? (
                    <div className="w-4 h-4 border-2 border-gray-200 border-t-gray-700 rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {approveTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setApproveTarget(null)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-4"
            >
              <h3 className="text-xl font-extrabold text-gray-900">Approve for Prayer Room</h3>
              <p className="text-sm text-gray-600">
                This prayer will appear on the same Prayer Room feed as admin-uploaded prayers, using the same card layout, on the date you choose.
              </p>
              <label className="block">
                <span className="block text-xs font-semibold text-gray-600 mb-1.5">Display date</span>
                <input
                  type="date"
                  value={approveDate}
                  onChange={(e) => setApproveDate(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
                />
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setApproveTarget(null)}
                  className="px-4 py-2.5 rounded-2xl bg-white border border-gray-200 text-gray-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleStatus(approveTarget.id, "approved", approveDate)}
                  disabled={!!busy || !approveDate}
                  className="px-4 py-2.5 rounded-2xl bg-emerald-600 text-white font-semibold disabled:opacity-50"
                >
                  Approve & schedule
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
