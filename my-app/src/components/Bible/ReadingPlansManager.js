"use client";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Calendar,
  Plus,
  Edit,
  Trash2,
  ChevronUp,
  ChevronDown,
  Eye,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
} from "lucide-react";

const READING_PLANS_DATA = [
  {
    id: "1",
    title: "30 Day Faith Journey",
    subtitle: "Foundations of Christian living",
    days: 30,
    color: "#C96A1B",
    isActive: true,
    createdAt: new Date(),
  },
  {
    id: "2",
    title: "90 Day Bible Overview",
    subtitle: "Key stories from Genesis to Revelation",
    days: 90,
    color: "#F3703E",
    isActive: true,
    createdAt: new Date(),
  },
  {
    id: "3",
    title: "365 Day Bible",
    subtitle: "Read through Scripture in one year",
    days: 365,
    color: "#6B8F71",
    isActive: true,
    createdAt: new Date(),
  },
];

export default function ReadingPlansManager() {
  const [plans, setPlans] = useState(READING_PLANS_DATA);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      setPlans(READING_PLANS_DATA);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const handleSave = (planData) => {
    if (editingPlan) {
      setPlans(plans.map(p => (p.id === editingPlan.id ? { ...p, ...planData } : p)));
    } else {
      setPlans([...plans, { ...planData, id: Date.now().toString(), createdAt: new Date(), isActive: true }]);
    }
    setIsModalOpen(false);
    setEditingPlan(null);
  };

  const handleDelete = (id) => {
    setPlans(plans.filter(p => p.id !== id));
  };

  const toggleActive = (id) => {
    setPlans(plans.map(p => (p.id === id ? { ...p, isActive: !p.isActive } : p)));
  };

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
              <Calendar className="text-indigo-600" /> Reading Plans
            </h1>
            <p className="text-gray-500 mt-1">Create and manage reading plans for your users.</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-3 rounded-2xl bg-indigo-600 text-white shadow-lg font-semibold hover:bg-indigo-700 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Plan
          </button>
        </motion.div>

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {plans.map((plan, idx) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-extrabold"
                      style={{ backgroundColor: plan.color }}
                    >
                      {plan.days}
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-bold text-gray-900">{plan.title}</h3>
                        <span
                          className={`text-xs font-bold px-3 py-1 rounded-full ${
                            plan.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {plan.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <p className="text-gray-500">{plan.subtitle}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleActive(plan.id)}
                      className="p-2 rounded-xl hover:bg-gray-100"
                    >
                      {plan.isActive ? <XCircle className="w-5 h-5 text-gray-500" /> : <CheckCircle2 className="w-5 h-5 text-gray-500" />}
                    </button>
                    <button
                      onClick={() => {
                        setEditingPlan(plan);
                        setIsModalOpen(true);
                      }}
                      className="p-2 rounded-xl hover:bg-gray-100"
                    >
                      <Edit className="w-5 h-5 text-gray-500" />
                    </button>
                    <button
                      onClick={() => handleDelete(plan.id)}
                      className="p-2 rounded-xl hover:bg-red-50"
                    >
                      <Trash2 className="w-5 h-5 text-red-500" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {isModalOpen && (
          <PlanModal
            plan={editingPlan}
            onSave={handleSave}
            onClose={() => {
              setIsModalOpen(false);
              setEditingPlan(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

function PlanModal({ plan, onSave, onClose }) {
  const [title, setTitle] = useState(plan?.title || "");
  const [subtitle, setSubtitle] = useState(plan?.subtitle || "");
  const [days, setDays] = useState(plan?.days || 30);
  const [color, setColor] = useState(plan?.color || "#C96A1B");

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]">
      <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{plan ? "Edit Plan" : "New Plan"}</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100">
            <XCircle className="w-6 h-6 text-gray-500" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:outline-none"
              placeholder="Plan title"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Subtitle</label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:outline-none"
              placeholder="Plan subtitle"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Days</label>
            <input
              type="number"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-indigo-500 focus:outline-none"
              placeholder="Number of days"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Color</label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-full h-12 rounded-xl border border-gray-200 cursor-pointer"
            />
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={onClose} className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold">
              Cancel
            </button>
            <button
              onClick={() => onSave({ title, subtitle, days, color })}
              className="flex-1 px-4 py-3 rounded-xl bg-indigo-600 text-white font-semibold"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
