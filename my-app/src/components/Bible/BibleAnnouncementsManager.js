"use client";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
} from "lucide-react";

const ANNOUNCEMENTS_DATA = [
  { id: "1", title: "New Reading Plan", text: "Check out our new 30-day Faith Journey plan!", isActive: true, createdAt: new Date() },
];

export default function BibleAnnouncementsManager() {
  const [announcements, setAnnouncements] = useState(ANNOUNCEMENTS_DATA);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);

  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      setAnnouncements(ANNOUNCEMENTS_DATA);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  const handleSave = (announcementData) => {
    if (editingAnnouncement) {
      setAnnouncements(announcements.map(a => (a.id === editingAnnouncement.id ? { ...a, ...announcementData } : a)));
    } else {
      setAnnouncements([...announcements, { ...announcementData, id: Date.now().toString(), createdAt: new Date(), isActive: true }]);
    }
    setIsModalOpen(false);
    setEditingAnnouncement(null);
  };

  const handleDelete = (id) => {
    setAnnouncements(announcements.filter(a => a.id !== id));
  };

  const toggleActive = (id) => {
    setAnnouncements(announcements.map(a => (a.id === id ? { ...a, isActive: !a.isActive } : a)));
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
              <Bell className="text-pink-600" /> Announcements
            </h1>
            <p className="text-gray-500 mt-1">Manage announcements for the Bible section.</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-3 rounded-2xl bg-pink-600 text-white shadow-lg font-semibold hover:bg-pink-700 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Announcement
          </button>
        </motion.div>

        {loading ? (
          <div className="space-y-3">
            {[0].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement, idx) => (
              <motion.div
                key={announcement.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{announcement.title}</h3>
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full ${
                          announcement.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {announcement.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="text-gray-600">{announcement.text}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleActive(announcement.id)}
                      className="p-2 rounded-xl hover:bg-gray-100"
                    >
                      {announcement.isActive ? <XCircle className="w-5 h-5 text-gray-500" /> : <CheckCircle2 className="w-5 h-5 text-gray-500" />}
                    </button>
                    <button
                      onClick={() => {
                        setEditingAnnouncement(announcement);
                        setIsModalOpen(true);
                      }}
                      className="p-2 rounded-xl hover:bg-gray-100"
                    >
                      <Edit className="w-5 h-5 text-gray-500" />
                    </button>
                    <button
                      onClick={() => handleDelete(announcement.id)}
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
          <AnnouncementModal
            announcement={editingAnnouncement}
            onSave={handleSave}
            onClose={() => {
              setIsModalOpen(false);
              setEditingAnnouncement(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

function AnnouncementModal({ announcement, onSave, onClose }) {
  const [title, setTitle] = useState(announcement?.title || "");
  const [text, setText] = useState(announcement?.text || "");

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]">
      <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{announcement ? "Edit Announcement" : "New Announcement"}</h2>
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
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink-500 focus:outline-none"
              placeholder="Announcement title"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Text</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-pink-500 focus:outline-none h-32 resize-none"
              placeholder="Type your announcement here"
            />
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={onClose} className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold">
              Cancel
            </button>
            <button
              onClick={() => onSave({ title, text })}
              className="flex-1 px-4 py-3 rounded-xl bg-pink-600 text-white font-semibold"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
