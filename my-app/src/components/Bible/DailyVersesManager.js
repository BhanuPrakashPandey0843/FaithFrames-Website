"use client";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Sparkles,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
} from "lucide-react";

const DAILY_VERSES_DATA = [
  { id: "1", reference: "John 3:16", text: "For God so loved the world, that he gave his only born Son, that whoever believes in him should not perish, but have eternal life.", isActive: true, createdAt: new Date() },
  { id: "2", reference: "Psalm 23:1", text: "The LORD is my shepherd; I shall lack nothing.", isActive: true, createdAt: new Date() },
  { id: "3", reference: "Philippians 4:13", text: "I can do all things through Christ who strengthens me.", isActive: true, createdAt: new Date() },
  { id: "4", reference: "Jeremiah 29:11", text: "For I know the thoughts that I think toward you, says the LORD, thoughts of peace, and not of evil, to give you hope and a future.", isActive: true, createdAt: new Date() },
];

export default function DailyVersesManager() {
  const [verses, setVerses] = useState(DAILY_VERSES_DATA);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVerse, setEditingVerse] = useState(null);

  const loadVerses = useCallback(async () => {
    setLoading(true);
    try {
      setVerses(DAILY_VERSES_DATA);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVerses();
  }, [loadVerses]);

  const handleSave = (verseData) => {
    if (editingVerse) {
      setVerses(verses.map(v => (v.id === editingVerse.id ? { ...v, ...verseData } : v)));
    } else {
      setVerses([...verses, { ...verseData, id: Date.now().toString(), createdAt: new Date(), isActive: true }]);
    }
    setIsModalOpen(false);
    setEditingVerse(null);
  };

  const handleDelete = (id) => {
    setVerses(verses.filter(v => v.id !== id));
  };

  const toggleActive = (id) => {
    setVerses(verses.map(v => (v.id === id ? { ...v, isActive: !v.isActive } : v)));
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
              <Sparkles className="text-amber-600" /> Daily Verses
            </h1>
            <p className="text-gray-500 mt-1">Manage your daily verses for the app.</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-3 rounded-2xl bg-amber-600 text-white shadow-lg font-semibold hover:bg-amber-700 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Verse
          </button>
        </motion.div>

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {verses.map((verse, idx) => (
              <motion.div
                key={verse.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900">{verse.reference}</h3>
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full ${
                          verse.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {verse.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <p className="text-gray-600">{verse.text}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleActive(verse.id)}
                      className="p-2 rounded-xl hover:bg-gray-100"
                    >
                      {verse.isActive ? <XCircle className="w-5 h-5 text-gray-500" /> : <CheckCircle2 className="w-5 h-5 text-gray-500" />}
                    </button>
                    <button
                      onClick={() => {
                        setEditingVerse(verse);
                        setIsModalOpen(true);
                      }}
                      className="p-2 rounded-xl hover:bg-gray-100"
                    >
                      <Edit className="w-5 h-5 text-gray-500" />
                    </button>
                    <button
                      onClick={() => handleDelete(verse.id)}
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
          <VerseModal
            verse={editingVerse}
            onSave={handleSave}
            onClose={() => {
              setIsModalOpen(false);
              setEditingVerse(null);
            }}
          />
        )}
      </div>
    </div>
  );
}

function VerseModal({ verse, onSave, onClose }) {
  const [reference, setReference] = useState(verse?.reference || "");
  const [text, setText] = useState(verse?.text || "");

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]">
      <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{verse ? "Edit Verse" : "New Verse"}</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100">
            <XCircle className="w-6 h-6 text-gray-500" />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Reference</label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-amber-500 focus:outline-none"
              placeholder="e.g. John 3:16"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Verse Text</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-amber-500 focus:outline-none h-32 resize-none"
              placeholder="Type your verse here"
            />
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={onClose} className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold">
              Cancel
            </button>
            <button
              onClick={() => onSave({ reference, text })}
              className="flex-1 px-4 py-3 rounded-xl bg-amber-600 text-white font-semibold"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
