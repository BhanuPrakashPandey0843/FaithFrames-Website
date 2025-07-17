import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import {
  BadgeCheck,
  Clock10,
  FileBarChart2,
  FileText,
  Smartphone,
  TabletSmartphone,
  MonitorCheck,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertCircle,
  RefreshCcw,
  Sparkles
} from "lucide-react";

const cards = [
  { title: "Total Logs", value: 1847, change: "+12.5% since last week", icon: <FileText />, color: "bg-green-600 text-white" },
  { title: "Estimations", value: 131, change: "+3.5% this month", icon: <FileBarChart2 />, color: "bg-green-500 text-white" },
  { title: "Annotations", value: 396, change: "-2.5% this quarter", icon: <TrendingDown />, color: "bg-neutral-800 text-white" },
  { title: "Invoice Due", value: "₹96,539", change: "Due in 5 days", icon: <Clock10 />, color: "bg-blue-600 text-white" },
];

const status = [
  { name: "Data Collection Phase 1", status: "Active", color: "bg-green-100", textColor: "text-green-800", icon: <CheckCircle className="text-green-500" /> },
  { name: "Client Report Generation", status: "Pending", color: "bg-red-100", textColor: "text-red-800", icon: <AlertCircle className="text-red-500" /> },
];

const invoices = [
  { id: "#INV-2025-001", client: "TechOps Ltd", status: "Paid", amount: "₹12,500", color: "text-green-600" },
  { id: "#INV-2025-002", client: "Dataflow Inc.", status: "Due", amount: "₹8,750", color: "text-red-600" },
];

const features = [
  { title: "Real-Time Sync", description: "Data updates in real-time across devices.", icon: <RefreshCcw className="text-blue-500 animate-spin-slow" /> },
  { title: "Enhanced UX", description: "Beautiful transitions and responsive layout.", icon: <Sparkles className="text-purple-500 animate-bounce" /> },
  { title: "Multi-Device Support", description: "Optimized for mobile, tablet, and desktop.", icon: <TabletSmartphone className="text-yellow-600 animate-pulse" /> },
  { title: "Smart Analytics", description: "Auto-generated insights and trends.", icon: <TrendingUp className="text-emerald-600 animate-wiggle" /> },
];

export default function Dashboard() {
  useEffect(() => {}, []);

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
            <Card className={`${card.color} shadow-2xl rounded-3xl p-6 transition-all hover:scale-[1.04] hover:shadow-3xl`}>
              <CardContent className="flex flex-col space-y-3 text-white">
                <div className="flex items-center justify-between">
                  <div className="text-lg font-bold tracking-wide">{card.title}</div>
                  <div className="text-xl">{card.icon}</div>
                </div>
                <div className="text-3xl font-extrabold">{card.value}</div>
                <div className="text-sm opacity-90 italic font-light">{card.change}</div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Display Analytics and Project Info */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.5 }}
      >
        <Card className="p-6 rounded-3xl shadow-xl hover:shadow-2xl transition">
          <h2 className="text-xl font-bold mb-2">Display Analytics</h2>
          <div className="flex justify-evenly items-center text-center mt-4">
            <div className="text-center space-y-1">
              <Smartphone className="mx-auto text-green-600 animate-bounce" />
              <p className="text-sm font-medium">Mobile</p>
            </div>
            <div className="text-center space-y-1">
              <TabletSmartphone className="mx-auto text-yellow-500 animate-pulse" />
              <p className="text-sm font-medium">Tablet</p>
            </div>
            <div className="text-center space-y-1">
              <MonitorCheck className="mx-auto text-red-500 animate-wiggle" />
              <p className="text-sm font-medium">Desktop</p>
            </div>
          </div>
        </Card>

        {/* Project Logs & Invoice Status */}
        <div className="space-y-6">
          <Card className="p-6 rounded-3xl shadow-xl hover:shadow-2xl transition">
            <h2 className="text-xl font-bold mb-2">Project U/S Logs</h2>
            <div className="space-y-3">
              {status.map((item, idx) => (
                <div key={idx} className={`flex items-center gap-3 p-3 rounded-xl ${item.color} ${item.textColor} font-medium shadow transition-all duration-300`}>
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
                <div key={idx} className="flex justify-between items-center border-b py-2">
                  <div>
                    <p className="font-semibold">Invoice {inv.id}</p>
                    <p className="text-sm text-gray-600">Client: {inv.client}</p>
                  </div>
                  <div className={`text-lg font-bold ${inv.color}`}>{inv.amount}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </motion.div>

      {/* Feature Highlights */}
      <motion.div
        className="bg-white rounded-3xl shadow-xl p-6 space-y-4 hover:shadow-2xl transition"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-2xl font-bold text-gray-900">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="bg-gradient-to-br from-gray-50 to-slate-100 p-4 rounded-xl flex flex-col items-start gap-2 shadow hover:shadow-md transition-all duration-300 text-gray-800"
            >
              <div className="text-2xl">{feature.icon}</div>
              <h3 className="font-bold text-lg text-gray-900">{feature.title}</h3>
              <p className="text-gray-600 text-sm leading-snug">{feature.description}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}