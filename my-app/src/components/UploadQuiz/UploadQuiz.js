"use client";
/**
 * UploadQuiz.js
 * ─────────────
 * Admin panel for managing quiz questions.
 *
 * Firestore schema (matches mobile FirestoreQuestion type):
 *   question    : string
 *   options     : string[]   (exactly 4 items)
 *   correctIndex: number     (0-3, index into options[])
 *   category    : string     (one of QUIZ_CATEGORIES — stored exactly, no lowercasing)
 *   difficulty  : string     ('easy' | 'medium' | 'hard')
 *   reference   : string     (optional scripture ref)
 *   explanation : string     (optional)
 *   createdAt   : Timestamp
 *   updatedAt   : Timestamp  (on edits)
 *
 * NOTE: correctIndex (number) is saved, NOT correctAnswer (string).
 * The mobile app grades answers by index — not by string comparison.
 *
 * Category & difficulty constants are imported from adminCollections.js
 * (single source of truth shared with the API route).
 */
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { validateRequiredText } from "../../lib/validation";
import { adminCreate, adminUpdate, adminDelete, fetchAdminContent } from "../../lib/adminApi";
import { useToast } from "@/components/ui/Toast";
import { QUIZ_CATEGORIES, QUIZ_DIFFICULTIES } from "../../lib/adminCollections";

// ─── Constants ───────────────────────────────────────────────────────────────

const BLANK_FORM = {
  question: "",
  options: ["", "", "", ""],
  correctIndex: 0,
  category: QUIZ_CATEGORIES[0],
  difficulty: QUIZ_DIFFICULTIES[0],
  reference: "",
  explanation: "",
};

/** Tailwind badge colours per category */
const CATEGORY_COLORS = {
  "Daily Challenges":    "bg-amber-100 text-amber-800 border-amber-200",
  "Bible Knowledge Quiz":"bg-purple-100 text-purple-800 border-purple-200",
  "Old Testament Quiz":  "bg-blue-100 text-blue-800 border-blue-200",
  "New Testament Quiz":  "bg-teal-100 text-teal-800 border-teal-200",
  "Jesus Quiz":          "bg-rose-100 text-rose-800 border-rose-200",
  "Apostle Quiz":        "bg-orange-100 text-orange-800 border-orange-200",
  "Random Quiz":         "bg-indigo-100 text-indigo-800 border-indigo-200",
};

const DIFFICULTY_COLORS = {
  easy:   "bg-emerald-100 text-emerald-800 border-emerald-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  hard:   "bg-red-100 text-red-800 border-red-200",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SelectField({ label, value, onChange, options, required, accentClass = "focus:ring-indigo-400" }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full appearance-none px-3.5 py-3 pr-9 border border-gray-200 rounded-xl bg-white text-gray-800 text-sm cursor-pointer transition focus:outline-none focus:ring-2 focus:border-transparent ${accentClass}`}
        >
          {options.map(({ value: v, label: l }) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Spinner({ className = "w-4 h-4" }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const UploadQuiz = () => {
  const [questions, setQuestions]   = useState([]);
  const [form, setForm]             = useState(BLANK_FORM);
  const [editingId, setEditingId]   = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [fetching, setFetching]     = useState(true);
  const [filterCategory, setFilter] = useState("all");
  const { addToast }                = useToast();

  // Derived options arrays for SelectField
  const categoryOptions = QUIZ_CATEGORIES.map((c) => ({ value: c, label: c }));
  const difficultyOptions = QUIZ_DIFFICULTIES.map((d) => ({
    value: d,
    label: d.charAt(0).toUpperCase() + d.slice(1),
  }));
  const filterOptions = [
    { value: "all", label: "All Categories" },
    ...categoryOptions,
  ];

  // ─── Fetch ───────────────────────────────────────────────────────────────
  const fetchQuestions = useCallback(async () => {
    setFetching(true);
    try {
      const result = await fetchAdminContent("questions");
      setQuestions(result.items || []);
    } catch (err) {
      console.error("[UploadQuiz] fetch error:", err);
      addToast({ type: "error", message: "Failed to load questions." });
    } finally {
      setFetching(false);
    }
  }, [addToast]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  // ─── Validate ────────────────────────────────────────────────────────────
  const validate = () => {
    const qCheck = validateRequiredText(form.question, "Question", 500);
    if (!qCheck.ok) return qCheck.message;

    const filled = form.options.filter((o) => o.trim().length > 0);
    if (filled.length < 2) return "Please provide at least 2 answer options.";
    if (!form.options[form.correctIndex]?.trim()) return "The correct answer option cannot be empty.";

    if (!QUIZ_CATEGORIES.includes(form.category))
      return `Invalid category. Choose one of: ${QUIZ_CATEGORIES.join(", ")}.`;
    if (!QUIZ_DIFFICULTIES.includes(form.difficulty))
      return `Invalid difficulty. Choose one of: ${QUIZ_DIFFICULTIES.join(", ")}.`;

    return null;
  };

  // ─── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const err = validate();
    if (err) { setError(err); return; }

    // Re-index correctIndex against the filtered (non-empty) options array
    const options       = form.options.map((o) => o.trim()).filter(Boolean);
    const correctRaw    = form.options[form.correctIndex]?.trim() || "";
    const correctIndex  = options.indexOf(correctRaw);

    // category is stored EXACTLY as defined in QUIZ_CATEGORIES — no lowercasing
    const payload = {
      question:    form.question.trim(),
      options,
      correctIndex: correctIndex >= 0 ? correctIndex : 0,
      category:    form.category.trim(),
      difficulty:  form.difficulty.trim().toLowerCase(),
      reference:   form.reference.trim(),
      explanation: form.explanation.trim(),
      active:      true,
    };

    try {
      setLoading(true);
      if (editingId) {
        await adminUpdate("questions", editingId, payload);
        addToast({ type: "success", message: "Question updated successfully." });
        setEditingId(null);
      } else {
        await adminCreate("questions", payload);
        addToast({ type: "success", message: "Question added successfully." });
      }
      setForm(BLANK_FORM);
      await fetchQuestions();
    } catch (err) {
      console.error("[UploadQuiz] submit error:", err);
      const msg = err.message || "Failed to save question. Please try again.";
      setError(msg);
      addToast({ type: "error", message: msg });
    } finally {
      setLoading(false);
    }
  };

  // ─── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!confirm("Delete this question? This cannot be undone.")) return;
    try {
      await adminDelete("questions", id);
      addToast({ type: "success", message: "Question deleted." });
      await fetchQuestions();
    } catch (err) {
      console.error("[UploadQuiz] delete error:", err);
      addToast({ type: "error", message: "Failed to delete question." });
    }
  };

  // ─── Edit ─────────────────────────────────────────────────────────────────
  const handleEdit = (q) => {
    // Guard: if stored category isn't in the valid list, fall back gracefully
    const category   = QUIZ_CATEGORIES.includes(q.category)   ? q.category   : QUIZ_CATEGORIES[0];
    const difficulty = QUIZ_DIFFICULTIES.includes(q.difficulty) ? q.difficulty : QUIZ_DIFFICULTIES[0];

    setForm({
      question:     q.question || "",
      options:      Array.isArray(q.options) && q.options.length === 4
                      ? q.options
                      : ["", "", "", ""],
      correctIndex: typeof q.correctIndex === "number" ? q.correctIndex : 0,
      category,
      difficulty,
      reference:    q.reference || "",
      explanation:  q.explanation || "",
    });
    setEditingId(q.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ─── Bulk JSON upload ─────────────────────────────────────────────────────
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setError("");

    try {
      const text     = await file.text();
      const jsonData = JSON.parse(text);
      if (!Array.isArray(jsonData))
        throw new Error("JSON must be an array of question objects.");

      setLoading(true);
      let added = 0, skipped = 0;

      for (const q of jsonData) {
        if (!q.question || !Array.isArray(q.options) || typeof q.correctIndex !== "number") {
          console.warn("[UploadQuiz] Skipping malformed entry:", q);
          skipped++;
          continue;
        }

        const options = q.options.map((o) => String(o).trim()).filter(Boolean);

        // category must be an exact QUIZ_CATEGORIES member — no lowercasing
        const rawCat  = String(q.category || "").trim();
        const category = QUIZ_CATEGORIES.includes(rawCat) ? rawCat : QUIZ_CATEGORIES[0];

        const rawDiff    = String(q.difficulty || "").trim().toLowerCase();
        const difficulty = QUIZ_DIFFICULTIES.includes(rawDiff) ? rawDiff : QUIZ_DIFFICULTIES[0];

        await adminCreate("questions", {
          question:    String(q.question).trim(),
          options,
          correctIndex: Math.min(Number(q.correctIndex), Math.max(options.length - 1, 0)),
          category,
          difficulty,
          reference:   q.reference   || "",
          explanation: q.explanation || "",
          active:      true,
        });
        added++;
      }

      addToast({
        type:     "success",
        message:  `Bulk upload complete — ${added} added${skipped ? `, ${skipped} skipped` : ""}.`,
        duration: 6000,
      });
      await fetchQuestions();
    } catch (err) {
      const msg = "Invalid JSON file: " + err.message;
      setError(msg);
      addToast({ type: "error", message: msg });
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  // ─── Derived list ─────────────────────────────────────────────────────────
  const visible = filterCategory === "all"
    ? questions
    : questions.filter((q) => q.category === filterCategory);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/40 p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* ── Page Header ────────────────────────────────────────────────── */}
        <div className="text-center py-2">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight">
            Quiz Manager
          </h1>
          <p className="mt-1.5 text-sm text-gray-400">
            Create and manage quiz questions · {QUIZ_CATEGORIES.length} categories available
          </p>
        </div>

        {/* ── Error Banner ───────────────────────────────────────────────── */}
        <AnimatePresence>
          {error && (
            <motion.div
              key="error-banner"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm"
            >
              <span className="text-base mt-0.5 flex-shrink-0">⚠️</span>
              <span className="flex-1">{error}</span>
              <button
                onClick={() => setError("")}
                className="text-red-400 hover:text-red-600 transition text-base leading-none"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Bulk Upload Card ───────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">📥</span>
              <div>
                <p className="font-semibold text-gray-800 text-sm">Bulk Upload</p>
                <p className="text-xs text-gray-400">
                  JSON array of{" "}
                  <code className="bg-gray-100 px-1 py-0.5 rounded text-[11px]">
                    {"{ question, options[4], correctIndex, category, difficulty }"}
                  </code>
                </p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <label
              className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-8 cursor-pointer transition ${
                loading
                  ? "opacity-50 cursor-not-allowed border-gray-200 bg-gray-50"
                  : "border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/30"
              }`}
            >
              <span className="text-3xl">📂</span>
              <span className="text-sm font-medium text-gray-600">
                Click to choose a <code className="text-indigo-600">.json</code> file
              </span>
              <span className="text-[11px] text-gray-400 text-center max-w-md">
                Valid categories: {QUIZ_CATEGORIES.join(" · ")}
              </span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                disabled={loading}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* ── Add / Edit Form Card ───────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Header */}
          <div className={`px-6 py-4 border-b border-gray-100 ${editingId ? "bg-amber-50" : "bg-indigo-50/50"}`}>
            <h2 className="text-base font-bold text-gray-900">
              {editingId ? "✏️  Edit Question" : "➕  Add New Question"}
            </h2>
            {editingId && (
              <p className="text-xs text-amber-700 mt-0.5">
                You are editing an existing question — changes will overwrite the stored entry.
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">

            {/* Question text */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Question <span className="text-red-500">*</span>
              </label>
              <textarea
                placeholder="Type your quiz question here…"
                className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder:text-gray-400 min-h-[88px] resize-none focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition"
                value={form.question}
                onChange={(e) => setForm({ ...form, question: e.target.value })}
                maxLength={500}
              />
              <p className="text-[11px] text-gray-400 mt-1 text-right">
                {form.question.length}/500
              </p>
            </div>

            {/* Options */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Answer Options <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-400 mb-3">
                Click the radio button beside the correct answer.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {form.options.map((opt, i) => {
                  const isCorrect = form.correctIndex === i;
                  return (
                    <label
                      key={i}
                      className={`flex items-center gap-3 px-3.5 py-3 border-2 rounded-xl cursor-pointer transition select-none ${
                        isCorrect
                          ? "border-green-400 bg-green-50/70"
                          : "border-gray-200 hover:border-gray-300 bg-white"
                      }`}
                    >
                      <input
                        type="radio"
                        name="correctIndex"
                        value={i}
                        checked={isCorrect}
                        onChange={() => setForm({ ...form, correctIndex: i })}
                        className="accent-green-500 w-4 h-4 flex-shrink-0"
                      />
                      <input
                        type="text"
                        placeholder={`Option ${i + 1}${isCorrect ? " ✓ correct" : ""}`}
                        className="flex-1 bg-transparent text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none min-w-0"
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...form.options];
                          newOpts[i] = e.target.value;
                          setForm({ ...form, options: newOpts });
                        }}
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Category & Difficulty */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectField
                label="Category"
                required
                value={form.category}
                onChange={(v) => setForm({ ...form, category: v })}
                options={categoryOptions}
                accentClass="focus:ring-indigo-400"
              />
              <SelectField
                label="Difficulty"
                required
                value={form.difficulty}
                onChange={(v) => setForm({ ...form, difficulty: v })}
                options={difficultyOptions}
                accentClass="focus:ring-orange-400"
              />
            </div>

            {/* Reference & Explanation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Scripture Reference
                </label>
                <input
                  type="text"
                  placeholder="e.g. John 3:16"
                  className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
                  value={form.reference}
                  onChange={(e) => setForm({ ...form, reference: e.target.value })}
                  maxLength={100}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Explanation
                </label>
                <input
                  type="text"
                  placeholder="Shown after answer is revealed"
                  className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition"
                  value={form.explanation}
                  onChange={(e) => setForm({ ...form, explanation: e.target.value })}
                  maxLength={500}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={loading}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${
                  editingId
                    ? "bg-amber-400 hover:bg-amber-500 text-gray-900"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white"
                }`}
              >
                {loading ? (
                  <>
                    <Spinner />
                    Saving…
                  </>
                ) : editingId ? "Update Question" : "Add Question"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => { setForm(BLANK_FORM); setEditingId(null); setError(""); }}
                  className="px-5 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-semibold text-sm transition"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* ── Questions List ─────────────────────────────────────────────── */}
        <div>
          {/* List Header + Filter */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <h2 className="text-xl font-bold text-gray-900">
              Questions
              {!fetching && (
                <span className="ml-2 text-sm font-normal text-gray-400">
                  ({visible.length}
                  {filterCategory !== "all" ? ` of ${questions.length}` : ""})
                </span>
              )}
            </h2>
            <SelectField
              label=""
              value={filterCategory}
              onChange={setFilter}
              options={filterOptions}
              accentClass="focus:ring-indigo-400"
            />
          </div>

          {/* Loading skeleton */}
          {fetching ? (
            <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
              <Spinner className="w-6 h-6 text-indigo-400" />
              <p className="text-sm">Loading questions…</p>
            </div>
          ) : visible.length === 0 ? (
            <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-2xl bg-white/60">
              <p className="text-gray-400 text-sm">
                {filterCategory === "all"
                  ? "No questions yet. Add one above."
                  : `No questions in "${filterCategory}".`}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              <AnimatePresence>
                {visible.map((q) => {
                  const catColor  = CATEGORY_COLORS[q.category]  || "bg-gray-100 text-gray-700 border-gray-200";
                  const diffColor = DIFFICULTY_COLORS[q.difficulty] || "bg-gray-100 text-gray-700 border-gray-200";
                  return (
                    <motion.div
                      key={q.id}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -14 }}
                      className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5 flex flex-col md:flex-row justify-between items-start gap-4 hover:shadow-md transition"
                    >
                      {/* Question body */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm leading-snug mb-3">
                          {q.question}
                        </p>

                        <ol className="list-decimal pl-5 text-sm text-gray-600 space-y-1 mb-3">
                          {(q.options || []).map((opt, i) => (
                            <li
                              key={i}
                              className={
                                i === q.correctIndex
                                  ? "text-green-700 font-semibold"
                                  : ""
                              }
                            >
                              {opt}{i === q.correctIndex && " ✓"}
                            </li>
                          ))}
                        </ol>

                        {/* Badges */}
                        <div className="flex flex-wrap gap-2">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${catColor}`}>
                            {q.category || "Uncategorized"}
                          </span>
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${diffColor}`}>
                            {(q.difficulty || "easy").charAt(0).toUpperCase() +
                             (q.difficulty || "easy").slice(1)}
                          </span>
                          {q.reference && (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold border bg-sky-50 text-sky-700 border-sky-200">
                              📖 {q.reference}
                            </span>
                          )}
                        </div>

                        {q.explanation && (
                          <p className="mt-2 text-[11px] text-gray-400 italic">
                            💡 {q.explanation}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleEdit(q)}
                          className="px-4 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-800 font-semibold text-xs transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(q.id)}
                          className="px-4 py-2 rounded-xl bg-red-100 hover:bg-red-200 text-red-700 font-semibold text-xs transition"
                        >
                          Delete
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadQuiz;
