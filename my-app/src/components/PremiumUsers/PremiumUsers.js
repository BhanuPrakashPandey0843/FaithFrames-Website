"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crown,
  Search,
  RefreshCw,
  ArrowUpDown,
  Smartphone,
  Calendar,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  User,
  BadgeAlert,
  CreditCard,
} from "lucide-react";
import { fetchPremiumUsers, fetchPremiumStats, refreshPremiumData } from "../../services/premium";
import { useToast } from "@/components/ui/Toast";

export default function PremiumUsers() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({
    totalPremiumUsers: 0,
    totalRevenue: 0,
    activeSubscriptions: 0,
    expiryWarnings: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  
  // UI states
  const { addToast } = useToast();
  
  // Search, Filters & Sorting states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [planFilter, setPlanFilter] = useState("All");
  const [gatewayFilter, setGatewayFilter] = useState("All");
  const [platformFilter, setPlatformFilter] = useState("All");
  
  const [sortField, setSortField] = useState("purchaseDate");
  const [sortOrder, setSortOrder] = useState("desc");
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError("");

      const [usersData, statsData] = await Promise.all([
        isRefresh ? refreshPremiumData() : fetchPremiumUsers(),
        fetchPremiumStats(),
      ]);

      setUsers(usersData);
      setStats(statsData);

      if (isRefresh) {
        addToast({
          type: "success",
          message: "Premium users statistics and data updated successfully.",
          duration: 3000,
        });
      }
    } catch (err) {
      console.error(err);
      setError("Failed to retrieve premium users directory. Please check database permissions.");
      addToast({
        type: "error",
        message: "Failed to reload dashboard data.",
        duration: 4000,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtering Logic
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // 1. Search term match
      const query = searchTerm.toLowerCase().trim();
      const matchesSearch =
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        (user.transactionId && user.transactionId.toLowerCase().includes(query)) ||
        (user.id && user.id.toLowerCase().includes(query));

      // 2. Status match
      const matchesStatus =
        statusFilter === "All" || user.subscriptionStatus === statusFilter;

      // 3. Plan match
      const matchesPlan =
        planFilter === "All" || user.premiumPlan === planFilter;

      // 4. Gateway match
      const matchesGateway =
        gatewayFilter === "All" || user.paymentGateway === gatewayFilter;

      // 5. Platform match
      const matchesPlatform =
        platformFilter === "All" || user.platform === platformFilter;

      return matchesSearch && matchesStatus && matchesPlan && matchesGateway && matchesPlatform;
    });
  }, [users, searchTerm, statusFilter, planFilter, gatewayFilter, platformFilter]);

  // Sorting Logic
  const sortedUsers = useMemo(() => {
    const data = [...filteredUsers];
    data.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Handle null/undefined/dates
      if (sortField === "purchaseDate" || sortField === "expiryDate" || sortField === "lastLogin") {
        aVal = aVal && aVal !== "N/A" ? new Date(aVal).getTime() : 0;
        bVal = bVal && bVal !== "N/A" ? new Date(bVal).getTime() : 0;
      }

      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = (bVal || "").toString().toLowerCase();
      }

      if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
      if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
    return data;
  }, [filteredUsers, sortField, sortOrder]);

  // Pagination Logic
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedUsers.slice(startIndex, startIndex + pageSize);
  }, [sortedUsers, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedUsers.length / pageSize) || 1;

  // Reset page on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, planFilter, gatewayFilter, platformFilter, pageSize]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const resetFilters = () => {
    setSearchTerm("");
    setStatusFilter("All");
    setPlanFilter("All");
    setGatewayFilter("All");
    setPlatformFilter("All");
    addToast({
      type: "info",
      message: "Filters reset to defaults.",
      duration: 2000,
    });
  };

  // Status Badge classes helper
  const getStatusBadge = (status) => {
    switch (status) {
      case "Active":
        return "bg-emerald-50 text-emerald-700 border-emerald-200/60";
      case "Expired":
        return "bg-rose-50 text-rose-700 border-rose-200/60";
      case "Cancelled":
        return "bg-amber-50 text-amber-700 border-amber-200/60";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  return (
    <div className="space-y-8 bg-gradient-to-br from-slate-50 via-white to-slate-100 min-h-screen pb-12 font-sans">
      
      {/* ─── Dashboard Header ─── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            Premium Users <Crown className="text-amber-500 fill-amber-400 w-8 h-8 animate-pulse" />
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage memberships, platform distributions, and payment audits.
          </p>
        </motion.div>
        
        <div className="flex items-center gap-3">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => loadData(true)}
            disabled={loading || refreshing}
            className="flex items-center gap-2 bg-white border border-gray-200 hover:border-indigo-400 hover:text-indigo-600 text-gray-700 font-semibold px-4 py-2.5 rounded-xl shadow-sm hover:shadow transition-all duration-300 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-indigo-500" : ""}`} />
            {refreshing ? "Refreshing..." : "Refresh Data"}
          </motion.button>
        </div>
      </div>

      {/* ─── Analytics Cards ─── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4 animate-pulse">
              <div className="flex justify-between items-center">
                <div className="h-4 w-24 bg-gray-200 rounded"></div>
                <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
              </div>
              <div className="h-8 w-16 bg-gray-200 rounded"></div>
              <div className="h-3 w-32 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
          }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {/* Card 1: Total Premium */}
          <motion.div
            variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
            className="bg-white rounded-3xl p-6 shadow-md hover:shadow-xl transition-all border border-gray-150 flex flex-col justify-between"
          >
            <div className="flex justify-between items-start">
              <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Premium Members</span>
              <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Crown className="w-5 h-5 fill-indigo-100" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-black text-gray-900">{stats.totalPremiumUsers}</span>
              <div className="text-xs text-indigo-500 font-semibold flex items-center gap-1 mt-1">
                <TrendingUp className="w-3.5 h-3.5" /> Total accounts registered
              </div>
            </div>
          </motion.div>

          {/* Card 2: Revenue */}
          <motion.div
            variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
            className="bg-white rounded-3xl p-6 shadow-md hover:shadow-xl transition-all border border-gray-150 flex flex-col justify-between"
          >
            <div className="flex justify-between items-start">
              <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Gross Income</span>
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-black text-gray-900">${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              <div className="text-xs text-emerald-600 font-semibold mt-1">
                Verified payment gateways
              </div>
            </div>
          </motion.div>

          {/* Card 3: Active Subscriptions */}
          <motion.div
            variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
            className="bg-white rounded-3xl p-6 shadow-md hover:shadow-xl transition-all border border-gray-150 flex flex-col justify-between"
          >
            <div className="flex justify-between items-start">
              <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Active Services</span>
              <div className="p-2.5 bg-sky-50 text-sky-600 rounded-2xl">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-black text-gray-900">{stats.activeSubscriptions}</span>
              <div className="text-xs text-sky-500 font-semibold mt-1">
                {stats.totalPremiumUsers ? Math.round((stats.activeSubscriptions / stats.totalPremiumUsers) * 100) : 0}% active retention rate
              </div>
            </div>
          </motion.div>

          {/* Card 4: Expiry Warnings */}
          <motion.div
            variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
            className={`bg-white rounded-3xl p-6 shadow-md hover:shadow-xl transition-all border flex flex-col justify-between ${
              stats.expiryWarnings > 0 ? "border-rose-100 bg-rose-50/10" : "border-gray-150"
            }`}
          >
            <div className="flex justify-between items-start">
              <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Expiring Soon</span>
              <div className={`p-2.5 rounded-2xl ${stats.expiryWarnings > 0 ? "bg-rose-150/40 text-rose-600" : "bg-gray-50 text-gray-400"}`}>
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <span className={`text-3xl font-black ${stats.expiryWarnings > 0 ? "text-rose-600" : "text-gray-900"}`}>{stats.expiryWarnings}</span>
              <div className={`text-xs font-semibold mt-1 ${stats.expiryWarnings > 0 ? "text-rose-500" : "text-gray-500"}`}>
                Renewals due in next 7 days
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* ─── Filters & Search ─── */}
      <div className="bg-white rounded-3xl p-6 border border-gray-150 shadow-md space-y-4">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          
          {/* Search bar */}
          <div className="relative w-full lg:max-w-md">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-gray-400" />
            </span>
            <input
              type="text"
              placeholder="Search by name, email, transaction..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:outline-none text-gray-800 text-sm font-medium transition"
            />
          </div>

          {/* Reset Filters / Stats Info */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
            <span className="text-xs font-bold text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5 uppercase">
              Found: {filteredUsers.length} Users
            </span>
            {(searchTerm || statusFilter !== "All" || planFilter !== "All" || gatewayFilter !== "All" || platformFilter !== "All") && (
              <button
                onClick={resetFilters}
                className="text-xs font-semibold text-rose-500 hover:text-rose-600 transition"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Advanced Filters grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-gray-100">
          
          {/* Filter 1: Plan */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Plan Type</label>
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
            >
              <option value="All">All Plans</option>
              <option value="Lifetime Access">Lifetime Access</option>
              <option value="Monthly Pass">Monthly Pass</option>
              <option value="Yearly Devotion">Yearly Devotion</option>
            </select>
          </div>

          {/* Filter 2: Status */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Membership Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Expired">Expired</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Filter 3: Payment Gateway */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Payment Gateway</label>
            <select
              value={gatewayFilter}
              onChange={(e) => setGatewayFilter(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
            >
              <option value="All">All Gateways</option>
              <option value="Stripe">Stripe</option>
              <option value="Razorpay">Razorpay</option>
              <option value="Google Play">Google Play</option>
              <option value="Apple In-App">Apple In-App</option>
            </select>
          </div>

          {/* Filter 4: Platform */}
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Device Platform</label>
            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition"
            >
              <option value="All">All Platforms</option>
              <option value="Android">Android</option>
              <option value="iOS">iOS</option>
            </select>
          </div>
        </div>
      </div>

      {/* ─── Error Alert State ─── */}
      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-rose-50 border border-rose-200 rounded-2xl p-6 flex items-center justify-between shadow-sm"
        >
          <div className="flex items-center gap-3">
            <BadgeAlert className="text-rose-500 w-6 h-6 flex-shrink-0" />
            <div>
              <h3 className="font-bold text-rose-800 text-base">Backend sync failed</h3>
              <p className="text-rose-600 text-sm mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={() => loadData()}
            className="bg-white border border-rose-200 hover:bg-rose-100/50 text-rose-700 text-xs font-bold px-4 py-2 rounded-xl transition"
          >
            Retry Connection
          </button>
        </motion.div>
      )}

      {/* ─── Table Content / Grid View ─── */}
      {loading ? (
        <div className="bg-white rounded-3xl border border-gray-150 shadow-md p-6 space-y-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex flex-col md:flex-row items-center gap-4 justify-between animate-pulse">
              <div className="flex items-center gap-3 w-full md:w-1/3">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-32 bg-gray-200 rounded"></div>
                  <div className="h-3 w-48 bg-gray-200 rounded"></div>
                </div>
              </div>
              <div className="h-4 w-24 bg-gray-200 rounded"></div>
              <div className="h-4 w-20 bg-gray-200 rounded"></div>
              <div className="h-4 w-32 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : sortedUsers.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl border border-gray-150 shadow-md p-16 text-center space-y-4"
        >
          <div className="inline-flex p-4 bg-indigo-50 text-indigo-500 rounded-full">
            <Crown className="w-12 h-12" />
          </div>
          <h2 className="text-2xl font-black text-gray-800">No premium members found</h2>
          <p className="text-gray-500 max-w-md mx-auto text-sm">
            Try adjusting your search terms or filters above to match existing membership accounts.
          </p>
          <button
            onClick={resetFilters}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-2.5 rounded-xl shadow transition"
          >
            Clear Search & Filters
          </button>
        </motion.div>
      ) : (
        <div className="space-y-4">
          
          {/* Desktop Table View */}
          <div className="hidden lg:block bg-white rounded-3xl border border-gray-150 shadow-md overflow-hidden">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-150 text-gray-400 text-xs font-bold uppercase tracking-wider">
                  <th className="p-4 pl-6">Profile</th>
                  <th className="p-4 cursor-pointer hover:text-gray-700" onClick={() => handleSort("name")}>
                    <div className="flex items-center gap-1.5">
                      Name & Contact <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="p-4">Membership Plan</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 cursor-pointer hover:text-gray-700" onClick={() => handleSort("amountPaid")}>
                    <div className="flex items-center gap-1.5">
                      Paid <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="p-4">Gateway / TX ID</th>
                  <th className="p-4 cursor-pointer hover:text-gray-700" onClick={() => handleSort("purchaseDate")}>
                    <div className="flex items-center gap-1.5">
                      Purchase Date <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="p-4 cursor-pointer hover:text-gray-700" onClick={() => handleSort("expiryDate")}>
                    <div className="flex items-center gap-1.5">
                      Expiry Date <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="p-4 pr-6">Platform</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm text-gray-700">
                <AnimatePresence mode="popLayout">
                  {paginatedUsers.map((user) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-slate-50/50 transition-colors duration-150"
                    >
                      <td className="p-4 pl-6">
                        {user.photoURL ? (
                          <img
                            src={user.photoURL}
                            alt={user.name}
                            className="w-10 h-10 rounded-full border border-gray-200 object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = ""; // triggers fallback icon
                            }}
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center font-bold text-sm">
                            {user.name ? user.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                          </div>
                        )}
                      </td>
                      <td className="p-4 max-w-[200px]">
                        <div className="font-semibold text-gray-900 truncate">{user.name}</div>
                        <div className="text-xs text-gray-400 truncate">{user.email}</div>
                        {user.phoneNumber && <div className="text-xs text-gray-400/80 truncate mt-0.5">{user.phoneNumber}</div>}
                      </td>
                      <td className="p-4">
                        <span className="font-medium text-gray-900">{user.premiumPlan}</span>
                        <div className="text-xs text-gray-400">ID: {user.id.substring(0, 8)}...</div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusBadge(user.subscriptionStatus)}`}>
                          {user.subscriptionStatus}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="font-extrabold text-gray-900">${user.amountPaid.toFixed(2)}</span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1 font-semibold text-gray-700">
                          <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                          {user.paymentGateway}
                        </div>
                        <div className="text-xs font-mono text-gray-400 select-all truncate max-w-[120px]" title={user.transactionId}>
                          {user.transactionId}
                        </div>
                      </td>
                      <td className="p-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          {new Date(user.purchaseDate).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                      </td>
                      <td className="p-4 text-xs text-gray-500 font-semibold">
                        {user.expiryDate === "N/A" ? (
                          <span className="text-gray-400 bg-gray-50 border border-gray-100 rounded-lg px-2 py-0.5">Never</span>
                        ) : (
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            {new Date(user.expiryDate).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                          </div>
                        )}
                        {user.autoRenewal && (
                          <div className="text-[10px] text-emerald-600 font-bold mt-0.5">Auto-renews</div>
                        )}
                      </td>
                      <td className="p-4 pr-6">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-xl">
                          <Smartphone className="w-3.5 h-3.5 text-gray-400" />
                          {user.platform}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Mobile Card-Grid List View */}
          <div className="lg:hidden space-y-4">
            <AnimatePresence mode="popLayout">
              {paginatedUsers.map((user) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-white border border-gray-150 rounded-2xl p-5 shadow-sm space-y-4 hover:shadow transition"
                >
                  <div className="flex items-center gap-3">
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.name}
                        className="w-12 h-12 rounded-full border border-gray-200 object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center font-bold text-lg">
                        {user.name ? user.name.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-900 truncate">{user.name}</div>
                      <div className="text-xs text-gray-400 truncate">{user.email}</div>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusBadge(user.subscriptionStatus)}`}>
                      {user.subscriptionStatus}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-y-3 gap-x-4 pt-3 border-t border-gray-100 text-xs text-gray-600">
                    <div>
                      <span className="block text-gray-400 font-semibold mb-0.5">Membership Plan</span>
                      <span className="font-bold text-gray-800">{user.premiumPlan}</span>
                    </div>
                    <div>
                      <span className="block text-gray-400 font-semibold mb-0.5">Amount Paid</span>
                      <span className="font-extrabold text-gray-900">${user.amountPaid.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="block text-gray-400 font-semibold mb-0.5">Transaction ID</span>
                      <span className="font-mono text-gray-700 truncate block select-all" title={user.transactionId}>
                        {user.transactionId}
                      </span>
                    </div>
                    <div>
                      <span className="block text-gray-400 font-semibold mb-0.5">Payment Gateway</span>
                      <span className="font-bold text-gray-800 flex items-center gap-1">
                        <CreditCard className="w-3 h-3 text-gray-400" />
                        {user.paymentGateway}
                      </span>
                    </div>
                    <div>
                      <span className="block text-gray-400 font-semibold mb-0.5">Purchase Date</span>
                      <span className="font-semibold text-gray-800">
                        {new Date(user.purchaseDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span className="block text-gray-400 font-semibold mb-0.5">Expiry Date</span>
                      <span className="font-semibold text-gray-800">
                        {user.expiryDate === "N/A" ? "Never (Lifetime)" : new Date(user.expiryDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div>
                      <span className="block text-gray-400 font-semibold mb-0.5">Platform</span>
                      <span className="inline-flex items-center gap-1 font-bold text-gray-500 bg-gray-50 border border-gray-150 px-2 py-0.5 rounded-lg mt-0.5">
                        <Smartphone className="w-3 h-3" />
                        {user.platform}
                      </span>
                    </div>
                    {user.phoneNumber && (
                      <div>
                        <span className="block text-gray-400 font-semibold mb-0.5">Phone</span>
                        <span className="font-semibold text-gray-800">{user.phoneNumber}</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 px-2">
            
            {/* Show items selection */}
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Show</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-white border border-gray-200 rounded-lg px-2 py-1 text-sm font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                <option value={5}>5 per page</option>
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
              </select>
              <span>of {sortedUsers.length} premium users</span>
            </div>

            {/* Page buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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
    </div>
  );
}
