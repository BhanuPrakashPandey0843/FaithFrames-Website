"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  BadgeAlert,
  ChevronLeft,
  ChevronRight,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { adminCreateUser, adminUpdateUser, adminDeleteUser } from "../../lib/adminApi";
import { fetchNonPremiumUsers, sendSubscriptionReminders } from "../../services/nonPremium";
import { useToast } from "@/components/ui/Toast";
import MembershipTabs from "../Membership/MembershipTabs";
import ReminderModal from "../Membership/ReminderModal";

const DAY_MS = 24 * 60 * 60 * 1000;
const EMPTY_FORM = { name: "", email: "", address: "", photoURL: "" };

function formatDate(iso) {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return "—";
  return new Date(ms).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function timeAgo(iso) {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return "—";
  const diff = Math.max(0, Date.now() - ms);
  if (diff < 60 * 1000) return "Just now";
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))}m ago`;
  if (diff < DAY_MS) return `${Math.floor(diff / (60 * 60 * 1000))}h ago`;
  if (diff < 30 * DAY_MS) return `${Math.floor(diff / DAY_MS)}d ago`;
  return formatDate(iso);
}

/**
 * Profile section = every account that has NOT bought a subscription.
 * (Paying users live under "Premium Users".) From here the admin can manage the
 * profile and send subscription reminders to one user, a selection, or everyone
 * matching the current filters.
 */
const ProfileManager = () => {
  const { addToast } = useToast();

  const [users, setUsers] = useState([]);
  const [counts, setCounts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // Filters / sorting / paging
  const [search, setSearch] = useState("");
  const [quickFilter, setQuickFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Selection + reminder dialog
  const [selected, setSelected] = useState(() => new Set());
  const [reminderRecipients, setReminderRecipients] = useState(null);

  // Add / edit profile form
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const loadUsers = useCallback(async ({ silent = false } = {}) => {
    try {
      if (silent) setRefreshing(true);
      else setLoading(true);

      const result = await fetchNonPremiumUsers();
      setUsers(result.users);
      setCounts(result.counts);
      setError("");

      // Drop selections for users that are gone or have become premium.
      const stillListed = new Set(result.users.map((u) => u.id));
      setSelected((prev) => new Set([...prev].filter((id) => stillListed.has(id))));
    } catch (err) {
      setError(err.message || "Failed to load users.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const weekAgo = Date.now() - 7 * DAY_MS;
    return {
      never: users.filter((u) => u.reminderCount === 0).length,
      remindedThisWeek: users.filter((u) => Date.parse(u.lastReminderAt) >= weekAgo).length,
      joinedThisWeek: users.filter((u) => Date.parse(u.createdAt) >= weekAgo).length,
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    const weekAgo = Date.now() - 7 * DAY_MS;
    return users.filter((u) => {
      if (query && !u.name.toLowerCase().includes(query) && !u.email.toLowerCase().includes(query)) {
        return false;
      }
      switch (quickFilter) {
        case "never":
          return u.reminderCount === 0;
        case "reminded":
          return u.reminderCount > 0;
        case "new":
          return Date.parse(u.createdAt) >= weekAgo;
        default:
          return true;
      }
    });
  }, [users, search, quickFilter]);

  const sortedUsers = useMemo(() => {
    const created = (u) => Date.parse(u.createdAt) || 0;
    const reminded = (u) => Date.parse(u.lastReminderAt) || 0;
    const list = [...filteredUsers];
    switch (sortBy) {
      case "oldest":
        list.sort((a, b) => created(a) - created(b));
        break;
      case "name":
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "least-reminded":
        list.sort((a, b) => reminded(a) - reminded(b) || created(b) - created(a));
        break;
      default:
        list.sort((a, b) => created(b) - created(a));
    }
    return list;
  }, [filteredUsers, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageUsers = sortedUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
    setPage(1);
  }, [search, quickFilter, sortBy, pageSize]);

  const selectedUsers = useMemo(() => users.filter((u) => selected.has(u.id)), [users, selected]);
  const pageAllSelected = pageUsers.length > 0 && pageUsers.every((u) => selected.has(u.id));
  const allFilteredSelected = sortedUsers.length > 0 && sortedUsers.every((u) => selected.has(u.id));
  const filtersActive = search.trim() !== "" || quickFilter !== "all";

  // ── Selection ─────────────────────────────────────────────────────────────
  const toggleOne = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      pageUsers.forEach((u) => {
        if (pageAllSelected) next.delete(u.id);
        else next.add(u.id);
      });
      return next;
    });
  };

  const selectAllFiltered = () => setSelected(new Set(sortedUsers.map((u) => u.id)));
  const clearSelection = () => setSelected(new Set());

  // ── Reminders ─────────────────────────────────────────────────────────────
  const handleSendReminders = async ({ title, message, force }, onProgress) => {
    const ids = reminderRecipients.map((u) => u.id);
    const result = await sendSubscriptionReminders(ids, { title, message, force }, onProgress);

    setReminderRecipients(null);
    clearSelection();

    const skippedParts = [];
    if (result.skipped.recentlyReminded) skippedParts.push(`${result.skipped.recentlyReminded} reminded recently`);
    if (result.skipped.optedOut) skippedParts.push(`${result.skipped.optedOut} opted out`);
    if (result.skipped.premium) skippedParts.push(`${result.skipped.premium} already premium`);
    if (result.skipped.missing) skippedParts.push(`${result.skipped.missing} no longer exist`);

    addToast({
      type: result.sent > 0 ? "success" : "warning",
      message:
        `Reminder sent to ${result.sent} user${result.sent === 1 ? "" : "s"}.` +
        (skippedParts.length ? ` Skipped: ${skippedParts.join(", ")}.` : ""),
      duration: 7000,
    });

    await loadUsers({ silent: true });
  };

  // ── Profile add / edit / delete ──────────────────────────────────────────
  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      addToast({ type: "warning", message: "Name and email are required." });
      return;
    }

    try {
      setSaving(true);
      if (editingId) {
        await adminUpdateUser(editingId, form);
        addToast({ type: "success", message: "User updated.", duration: 3000 });
      } else {
        await adminCreateUser(form);
        addToast({ type: "success", message: "User added.", duration: 3000 });
      }
      resetForm();
      await loadUsers({ silent: true });
    } catch (err) {
      addToast({ type: "error", message: err.message || "Failed to save user." });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (user) => {
    setForm({
      name: user.name || "",
      email: user.email || "",
      address: user.address || "",
      photoURL: user.photoURL || "",
    });
    setEditingId(user.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (user) => {
    if (!confirm(`Delete ${user.name || user.email || "this user"}? This cannot be undone.`)) return;
    try {
      await adminDeleteUser(user.id);
      addToast({ type: "success", message: "User deleted.", duration: 3000 });
      await loadUsers({ silent: true });
    } catch (err) {
      addToast({ type: "error", message: err.message || "Failed to delete user." });
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const statCards = [
    { label: "Non-Premium Users", value: counts?.nonPremium ?? users.length, hint: "Accounts without a subscription", tone: "text-gray-900" },
    { label: "Never Reminded", value: stats.never, hint: "Haven't received a reminder yet", tone: "text-indigo-600" },
    { label: "Reminded This Week", value: stats.remindedThisWeek, hint: "Reminder sent in the last 7 days", tone: "text-emerald-600" },
    { label: "Joined This Week", value: stats.joinedThisWeek, hint: "New sign-ups in the last 7 days", tone: "text-sky-600" },
  ];

  return (
    <div className="space-y-8 bg-gradient-to-br from-slate-50 via-white to-slate-100 min-h-screen pb-12 font-sans">
      <MembershipTabs
        active="non-premium"
        premiumCount={counts?.premium}
        nonPremiumCount={counts?.nonPremium}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Profile · Non-Premium Users</h1>
          <p className="text-sm text-gray-500 mt-1">
            Accounts that have signed up but not bought a subscription. Remind them to go premium.
          </p>
        </motion.div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => loadUsers({ silent: true })}
            disabled={loading || refreshing}
            className="flex items-center gap-2 bg-white border border-gray-200 hover:border-indigo-400 hover:text-indigo-600 text-gray-700 font-semibold px-4 py-2.5 rounded-xl shadow-sm transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-indigo-500" : ""}`} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
          <button
            type="button"
            onClick={() => (showForm ? resetForm() : setShowForm(true))}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow transition"
          >
            {showForm ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            {showForm ? "Close" : "Add User"}
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="bg-rose-50 border border-rose-200 rounded-2xl p-5 flex items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <BadgeAlert className="text-rose-500 w-6 h-6 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-rose-800">Couldn&apos;t load users</h3>
              <p className="text-rose-600 text-sm mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => loadUsers()}
            className="bg-white border border-rose-200 hover:bg-rose-100/50 text-rose-700 text-xs font-bold px-4 py-2 rounded-xl transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-3xl p-6 shadow-md border border-gray-150">
            <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">{card.label}</span>
            <div className="mt-4">
              <span className={`text-3xl font-black ${card.tone}`}>{loading ? "…" : card.value.toLocaleString()}</span>
              <div className="text-xs text-gray-500 font-medium mt-1">{card.hint}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / edit profile */}
      <AnimatePresence initial={false}>
        {showForm && (
          <motion.form
            key="profile-form"
            onSubmit={handleSubmit}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white border border-gray-200 rounded-3xl shadow-md overflow-hidden"
          >
            <div className="p-6 md:p-8 space-y-5">
              <h2 className="text-xl font-semibold text-gray-800">{editingId ? "Edit User" : "Add New User"}</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  type="text"
                  name="name"
                  placeholder="Full Name"
                  value={form.name}
                  onChange={handleChange}
                  className="p-3 border rounded-xl focus:ring-2 focus:ring-indigo-400 focus:outline-none text-gray-800"
                  required
                />
                <input
                  type="email"
                  name="email"
                  placeholder="Email Address"
                  value={form.email}
                  onChange={handleChange}
                  className="p-3 border rounded-xl focus:ring-2 focus:ring-indigo-400 focus:outline-none text-gray-800"
                  required
                />
              </div>

              <input
                type="text"
                name="address"
                placeholder="Address"
                value={form.address}
                onChange={handleChange}
                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-400 focus:outline-none text-gray-800"
              />

              <input
                type="url"
                name="photoURL"
                placeholder="Profile Image URL"
                value={form.photoURL}
                onChange={handleChange}
                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-400 focus:outline-none text-gray-800"
              />

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                >
                  {saving ? "Saving..." : editingId ? "Update User" : "Add User"}
                </button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Filters + bulk actions */}
      <div className="bg-white rounded-3xl p-6 border border-gray-150 shadow-md space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 lg:items-center">
          <div className="relative w-full lg:max-w-md">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-gray-400" />
            </span>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:outline-none text-gray-800 text-sm font-medium transition"
            />
          </div>

          <select
            value={quickFilter}
            onChange={(e) => setQuickFilter(e.target.value)}
            aria-label="Filter users"
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="all">All users</option>
            <option value="never">Never reminded</option>
            <option value="reminded">Already reminded</option>
            <option value="new">Joined in last 7 days</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label="Sort users"
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="newest">Sort: Newest first</option>
            <option value="oldest">Sort: Oldest first</option>
            <option value="name">Sort: Name (A–Z)</option>
            <option value="least-reminded">Sort: Not reminded longest</option>
          </select>

          <div className="flex items-center gap-3 lg:ml-auto">
            <span className="text-xs font-bold text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5 uppercase whitespace-nowrap">
              Found: {sortedUsers.length.toLocaleString()}
            </span>
            {filtersActive && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setQuickFilter("all");
                }}
                className="text-xs font-semibold text-rose-500 hover:text-rose-600 transition whitespace-nowrap"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setReminderRecipients(selectedUsers)}
            disabled={selectedUsers.length === 0}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Bell className="w-4 h-4" />
            Remind selected ({selectedUsers.length.toLocaleString()})
          </button>
          <button
            type="button"
            onClick={() => setReminderRecipients(sortedUsers)}
            disabled={sortedUsers.length === 0}
            className="flex items-center gap-2 bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 text-sm font-bold px-4 py-2.5 rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Bell className="w-4 h-4" />
            {filtersActive ? "Remind all matching" : "Remind all"} ({sortedUsers.length.toLocaleString()})
          </button>

          {selectedUsers.length > 0 && (
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span className="font-semibold">{selectedUsers.length.toLocaleString()} selected</span>
              {!allFilteredSelected && (
                <button type="button" onClick={selectAllFiltered} className="font-semibold text-indigo-600 hover:underline">
                  Select all {sortedUsers.length.toLocaleString()}
                </button>
              )}
              <button type="button" onClick={clearSelection} className="font-semibold text-gray-500 hover:underline">
                Clear selection
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Users table */}
      {loading ? (
        <div className="bg-white rounded-3xl border border-gray-150 shadow-md p-6 space-y-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 animate-pulse">
              <div className="w-10 h-10 bg-gray-200 rounded-full" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-40 bg-gray-200 rounded" />
                <div className="h-3 w-56 bg-gray-200 rounded" />
              </div>
              <div className="h-4 w-24 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      ) : sortedUsers.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-150 shadow-md p-16 text-center space-y-3">
          <h2 className="text-2xl font-black text-gray-800">
            {users.length === 0 ? "No non-premium users" : "No users match your filters"}
          </h2>
          <p className="text-gray-500 max-w-md mx-auto text-sm">
            {users.length === 0
              ? "Every account has purchased a subscription, or no one has signed up yet."
              : "Try a different search term or clear the filters above."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-gray-150 shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse text-left">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-150 text-gray-400 text-xs font-bold uppercase tracking-wider">
                    <th className="p-4 pl-6 w-10">
                      <input
                        type="checkbox"
                        checked={pageAllSelected}
                        onChange={togglePage}
                        aria-label="Select all users on this page"
                        className="rounded border-gray-300"
                      />
                    </th>
                    <th className="p-4">User</th>
                    <th className="p-4">Joined</th>
                    <th className="p-4">Last Active</th>
                    <th className="p-4">Reminders</th>
                    <th className="p-4 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                  {pageUsers.map((user) => {
                    const previous =
                      user.subscriptionStatus && user.subscriptionStatus !== "none" && user.subscriptionStatus !== "inactive"
                        ? user.subscriptionStatus.replace(/_/g, " ")
                        : "";
                    return (
                      <tr
                        key={user.id}
                        className={`transition-colors duration-150 ${
                          editingId === user.id ? "bg-amber-50/60" : selected.has(user.id) ? "bg-indigo-50/40" : "hover:bg-slate-50/50"
                        }`}
                      >
                        <td className="p-4 pl-6">
                          <input
                            type="checkbox"
                            checked={selected.has(user.id)}
                            onChange={() => toggleOne(user.id)}
                            aria-label={`Select ${user.name || user.email}`}
                            className="rounded border-gray-300"
                          />
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {user.photoURL ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={user.photoURL}
                                alt=""
                                className="w-10 h-10 rounded-full border border-gray-200 object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 flex-shrink-0 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center font-bold text-sm">
                                {(user.name || user.email || "?").charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="font-semibold text-gray-900 truncate max-w-[220px]">
                                {user.name || "Unnamed user"}
                              </div>
                              <div className="text-xs text-gray-400 truncate max-w-[220px]">{user.email || "No email"}</div>
                              {previous && (
                                <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
                                  Previous subscription: {previous}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-xs text-gray-500 whitespace-nowrap">{formatDate(user.createdAt)}</td>
                        <td className="p-4 text-xs text-gray-500 whitespace-nowrap">{timeAgo(user.lastActive)}</td>
                        <td className="p-4">
                          {user.reminderCount === 0 ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border bg-gray-50 text-gray-500 border-gray-200">
                              Never reminded
                            </span>
                          ) : (
                            <div>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border bg-indigo-50 text-indigo-700 border-indigo-200/60">
                                Reminded ×{user.reminderCount}
                              </span>
                              <div className="text-xs text-gray-400 mt-0.5">Last: {timeAgo(user.lastReminderAt)}</div>
                            </div>
                          )}
                        </td>
                        <td className="p-4 pr-6">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setReminderRecipients([user])}
                              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-sm transition"
                            >
                              <Bell className="w-3.5 h-3.5" />
                              Remind
                            </button>
                            <button
                              type="button"
                              onClick={() => handleEdit(user)}
                              aria-label={`Edit ${user.name || user.email}`}
                              title="Edit"
                              className="p-2 rounded-xl text-gray-500 hover:bg-amber-50 hover:text-amber-600 transition"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(user)}
                              aria-label={`Delete ${user.name || user.email}`}
                              title="Delete"
                              className="p-2 rounded-xl text-gray-500 hover:bg-rose-50 hover:text-rose-600 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 px-2">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Show</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value={10}>10 per page</option>
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
              </select>
              <span>of {sortedUsers.length.toLocaleString()} users</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-2 border border-gray-200 bg-white hover:border-indigo-400 rounded-xl disabled:opacity-40 transition"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-bold text-gray-700 bg-white border border-gray-250 px-3 py-1.5 rounded-xl">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-2 border border-gray-200 bg-white hover:border-indigo-400 rounded-xl disabled:opacity-40 transition"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {reminderRecipients && (
        <ReminderModal
          recipients={reminderRecipients}
          onClose={() => setReminderRecipients(null)}
          onSend={handleSendReminders}
        />
      )}
    </div>
  );
};

export default ProfileManager;
