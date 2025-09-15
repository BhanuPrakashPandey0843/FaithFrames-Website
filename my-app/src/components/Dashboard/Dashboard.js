"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import {
  FileBarChart2,
  FileText,
  Clock10,
  TrendingDown,
  Sparkles,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import {
  getFirestore,
  collection,
  onSnapshot,
  query,
} from "firebase/firestore";
import { app } from "../../firebase";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const db = getFirestore(app);

const cards = [
  {
    title: "Total Logs",
    value: 1847,
    change: "+12.5% since last week",
    icon: <FileText />,
    color: "bg-green-600 text-white",
  },
  {
    title: "Estimations",
    value: 131,
    change: "+3.5% this month",
    icon: <FileBarChart2 />,
    color: "bg-green-500 text-white",
  },
  {
    title: "Annotations",
    value: 396,
    change: "-2.5% this quarter",
    icon: <TrendingDown />,
    color: "bg-neutral-800 text-white",
  },
  {
    title: "Invoice Due",
    value: "₹96,539",
    change: "Due in 5 days",
    icon: <Clock10 />,
    color: "bg-blue-600 text-white",
  },
];

const status = [
  {
    name: "Data Collection Phase 1",
    status: "Active",
    color: "bg-green-100",
    textColor: "text-green-800",
    icon: <CheckCircle className="text-green-500" />,
  },
  {
    name: "Client Report Generation",
    status: "Pending",
    color: "bg-red-100",
    textColor: "text-red-800",
    icon: <AlertCircle className="text-red-500" />,
  },
];

const invoices = [
  {
    id: "#INV-2025-001",
    client: "TechOps Ltd",
    status: "Paid",
    amount: "₹12,500",
    color: "text-green-600",
  },
  {
    id: "#INV-2025-002",
    client: "Dataflow Inc.",
    status: "Due",
    amount: "₹8,750",
    color: "text-red-600",
  },
];

export default function Dashboard() {
  const [userStats, setUserStats] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "users"));
    const unsub = onSnapshot(q, (snapshot) => {
      // Group by day for chart
      const dailyCounts = {};
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        const created =
          data.updatedAt?.toDate?.() || new Date(data.updatedAt || Date.now());
        const day = created.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
        dailyCounts[day] = (dailyCounts[day] || 0) + 1;
      });

      const chartData = Object.keys(dailyCounts).map((day) => ({
        day,
        users: dailyCounts[day],
      }));

      setUserStats(chartData);
    });

    return () => unsub();
  }, []);

  return (
    <div className="md:ml-64 p-4 md:p-10 space-y-10 bg-gradient-to-br from-slate-50 via-white to-slate-100 min-h-screen transition-all">
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-4xl font-extrabold text-gray-900 flex items-center gap-2"
      >
        Dashboard <Sparkles className="text-yellow-500 animate-pulse" />
      </motion.h1>

      {/* Stats Cards */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: {
            transition: {
              staggerChildren: 0.15,
            },
          },
        }}
      >
        {cards.map((card, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.15, duration: 0.5 }}
          >
            <Card
              className={`${card.color} shadow-2xl rounded-3xl p-6 transition-all hover:scale-[1.04] hover:shadow-3xl`}
            >
              <CardContent className="flex flex-col space-y-3 text-white">
                <div className="flex items-center justify-between">
                  <div className="text-lg font-bold tracking-wide">
                    {card.title}
                  </div>
                  <div className="text-xl">{card.icon}</div>
                </div>
                <div className="text-3xl font-extrabold">{card.value}</div>
                <div className="text-sm opacity-90 italic font-light">
                  {card.change}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* 🔥 User Analytics & Project Info */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.5 }}
      >
        {/* Users Chart - Premium Style */}
        <Card className="p-6 rounded-3xl shadow-xl hover:shadow-2xl transition">
          <h2 className="text-xl font-bold mb-4 text-gray-900">
            User Growth Analytics
          </h2>
          <ResponsiveContainer width="100%" height={320}>
            <LineChart
              data={userStats}
              margin={{ top: 20, right: 30, left: 0, bottom: 10 }}
            >
              {/* Gradient */}
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
                labelStyle={{ fontWeight: "bold", color: "#111827" }}
                itemStyle={{ color: "#4f46e5" }}
              />

              <Line
                type="monotone"
                dataKey="users"
                stroke="url(#colorUsers)"
                strokeWidth={3}
                dot={{ r: 5, fill: "#4f46e5", strokeWidth: 2, stroke: "#fff" }}
                activeDot={{
                  r: 8,
                  fill: "#4f46e5",
                  stroke: "#fff",
                  strokeWidth: 2,
                }}
                isAnimationActive={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Project Logs & Invoice Status */}
        <div className="space-y-6">
          <Card className="p-6 rounded-3xl shadow-xl hover:shadow-2xl transition">
            <h2 className="text-xl font-bold mb-2">Project U/S Logs</h2>
            <div className="space-y-3">
              {status.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-3 p-3 rounded-xl ${item.color} ${item.textColor} font-medium shadow transition-all duration-300`}
                >
                  {item.icon}
                  {item.name}
                </div>
              ))}
            </div>
          </Card>
          <Card className="p-6 rounded-3xl shadow-xl hover:shadow-2xl transition">
            <h2 className="text-xl font-bold mb-2">Invoice Status</h2>
            <div className="space-y-2">
              {invoices.map((inv, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center border-b py-2"
                >
                  <div>
                    <p className="font-semibold">Invoice {inv.id}</p>
                    <p className="text-sm text-gray-600">
                      Client: {inv.client}
                    </p>
                  </div>
                  <div className={`text-lg font-bold ${inv.color}`}>
                    {inv.amount}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </motion.div>
    </div>
  );
}
