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
 *   category    : string     ('bible' | 'jesus' | 'old' | 'new' | 'mixed')
 *   difficulty  : string     ('easy' | 'medium' | 'hard')
 *   reference   : string     (optional scripture ref)
 *   explanation : string     (optional)
 *   createdAt   : Timestamp
 *   updatedAt   : Timestamp  (on edits)
 *
 * NOTE: we save correctIndex (number), NOT correctAnswer (string).
 * The mobile app grades answers by index — not by string comparison.
 */
import React, { useState, useEffect, useCallback } from "react";
import { db } from "../../firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { validateRequiredText } from "../../lib/validation";
import { adminCreate, adminUpdate, adminDelete } from "../../lib/adminApi";
import { useToast } from "@/components/ui/Toast";

const CATEGORIES = ["bible", "jesus", "old", "new", "mixed"];
const DIFFICULTIES = ["easy", "medium", "hard"];

const BLANK_FORM = {
  question: "",
  options: ["", "", "", ""],
  correctIndex: 0,
  category: "bible",
  difficulty: "easy",
  reference: "",
  explanation: "",
};

const UploadQuiz = () => {
  const [questions, setQuestions] = useState([]);
  const [form, setForm] = useState(BLANK_FORM);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [fetching, setFetching] = useState(true);
  const { addToast } = useToast();

  // ─── Fetch questions ──────────────────────────────────────────────────────
  const fetchQuestions = useCallback(async () => {
    if (!db) return; // Exit if db not initialized

    setFetching(true);
    try {
      const questionsRef = collection(db, "questions");
      const snapshot = await getDocs(query(questionsRef, orderBy("createdAt", "desc")));
      setQuestions(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error("[UploadQuiz] fetch error:", err);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  // ─── Validate ─────────────────────────────────────────────────────────────
  const validate = () => {
    const qCheck = validateRequiredText(form.question, "Question", 500);
    if (!qCheck.ok) return qCheck.message;

    const filledOptions = form.options.filter((o) => o.trim().length > 0);
    if (filledOptions.length < 2) return "Please provide at least 2 answer options.";
    if (form.options[form.correctIndex]?.trim() === "") return "The correct answer option cannot be empty.";
    return null;
  };

  // ─── Submit (add or update) ───────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const err = validate();
    if (err) { setError(err); return; }

    const options = form.options.map((o) => o.trim()).filter(Boolean);
    const correctRaw = form.options[form.correctIndex]?.trim() || "";
    const correctIndex = options.indexOf(correctRaw);

    const payload = {
      question: form.question.trim(),
      options,
      correctIndex: correctIndex >= 0 ? correctIndex : 0,
      category: form.category.trim().toLowerCase(),
      difficulty: form.difficulty.trim().toLowerCase(),
      reference: form.reference.trim(),
      explanation: form.explanation.trim(),
      active: true,
    };

    try {
      setLoading(true);
      if (editingId) {
        await adminUpdate("questions", editingId, payload);
        setSuccess("Question updated successfully.");
        setEditingId(null);
      } else {
        await adminCreate("questions", payload);
        setSuccess("Question added successfully.");
      }
      setForm(BLANK_FORM);
      await fetchQuestions();
    } catch (err) {
      console.error("[UploadQuiz] submit error:", err);
      setError(err.message || "Failed to save question. Try again.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Delete ───────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!confirm("Delete this question? This cannot be undone.")) return;
    try {
      await adminDelete("questions", id);
      await fetchQuestions();
    } catch (err) {
      console.error("[UploadQuiz] delete error:", err);
      alert("Failed to delete question.");
    }
  };

  // ─── Edit ─────────────────────────────────────────────────────────────────
  const handleEdit = (q) => {
    setForm({
      question: q.question || "",
      // Support legacy correctAnswer string format — convert if needed
      options: Array.isArray(q.options) && q.options.length === 4
        ? q.options
        : ["", "", "", ""],
      correctIndex: typeof q.correctIndex === "number" ? q.correctIndex : 0,
      category: q.category || "bible",
      difficulty: q.difficulty || "easy",
      reference: q.reference || "",
      explanation: q.explanation || "",
    });
    setEditingId(q.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ─── Bulk JSON upload ─────────────────────────────────────────────────────
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setError("");
    setSuccess("");

    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);
      if (!Array.isArray(jsonData)) throw new Error("JSON must be an array of question objects.");

      setLoading(true);
      let count = 0;
      for (const q of jsonData) {
        if (!q.question || !Array.isArray(q.options) || typeof q.correctIndex !== "number") {
          console.warn("[UploadQuiz] Skipping malformed question:", q);
          continue;
        }
        const options = q.options.map((o) => String(o).trim()).filter(Boolean);
        await adminCreate("questions", {
          question: String(q.question).trim(),
          options,
          correctIndex: Math.min(Number(q.correctIndex), Math.max(options.length - 1, 0)),
          category: String(q.category || "bible").trim().toLowerCase(),
          difficulty: String(q.difficulty || "easy").trim().toLowerCase(),
          reference: q.reference || "",
          explanation: q.explanation || "",
          active: true,
        });
        count++;
      }
      setSuccess(`Bulk upload complete — ${count} question(s) added.`);
      await fetchQuestions();
    } catch (err) {
      setError("Invalid JSON file: " + err.message);
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-50 p-6 md:p-12 font-sans">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold mb-8 text-gray-900 text-center">
          Quiz Manager
        </h1>

        {/* Status messages */}
        {error && <p className="mb-4 text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 text-sm">{error}</p>}
        {success && <p className="mb-4 text-green-700 bg-green-50 border border-green-200 rounded-lg p-3 text-sm">{success}</p>}

        {/* Bulk Upload */}
        <div className="bg-white border border-gray-300 p-6 rounded-2xl shadow-md mb-8 hover:shadow-lg transition flex flex-col items-center justify-center text-center">
          <p className="text-lg font-semibold mb-1 text-gray-700">Bulk Upload Questions (JSON)</p>
          <p className="text-xs text-gray-500 mb-4">
            Array of <code className="bg-gray-100 px-1 rounded">&#123; question, options[4], correctIndex, category, difficulty, reference?, explanation? &#125;</code>
          </p>
          <input
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            disabled={loading}
            className="w-full sm:w-1/2 text-sm text-gray-600 border border-gray-300 rounded-lg cursor-pointer bg-gray-100 p-3 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50"
          />
        </div>

        {/* Add / Edit Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-gray-200 rounded-2xl shadow-md p-6 mb-10 hover:shadow-lg transition space-y-4"
        >
          <h2 className="text-2xl font-semibold text-gray-900">
            {editingId ? "✏️ Edit Question" : "➕ Add New Question"}
          </h2>

          {/* Question text */}
          <textarea
            placeholder="Enter Question *"
            className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-indigo-400 focus:outline-none text-gray-800 font-medium min-h-[80px]"
            value={form.question}
            onChange={(e) => setForm({ ...form, question: e.target.value })}
            required
            maxLength={500}
          />

          {/* Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Answer Options (mark the correct one)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {form.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correctIndex"
                    value={i}
                    checked={form.correctIndex === i}
                    onChange={() => setForm({ ...form, correctIndex: i })}
                    className="accent-indigo-600 w-4 h-4 flex-shrink-0"
                    title={`Mark Option ${i + 1} as correct`}
                  />
                  <input
                    type="text"
                    placeholder={`Option ${i + 1}${i === form.correctIndex ? " ✓ (correct)" : ""}`}
                    className={`flex-1 p-3 border rounded-lg focus:ring-2 focus:ring-indigo-400 focus:outline-none text-gray-700 ${
                      form.correctIndex === i ? "border-green-400 bg-green-50" : ""
                    }`}
                    value={opt}
                    onChange={(e) => {
                      const newOptions = [...form.options];
                      newOptions[i] = e.target.value;
                      setForm({ ...form, options: newOptions });
                    }}
                  />
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Select the radio button next to the correct answer option.
            </p>
          </div>

          {/* Category & Difficulty */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400 focus:outline-none text-gray-700"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
              <select
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-orange-400 focus:outline-none text-gray-700"
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Reference & Explanation */}
          <input
            type="text"
            placeholder="Scripture reference (e.g., John 3:16)"
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none text-gray-700"
            value={form.reference}
            onChange={(e) => setForm({ ...form, reference: e.target.value })}
            maxLength={100}
          />
          <textarea
            placeholder="Explanation (shown after answer is revealed)"
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none text-gray-700 min-h-[60px]"
            value={form.explanation}
            onChange={(e) => setForm({ ...form, explanation: e.target.value })}
            maxLength={500}
          />

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 py-3 font-semibold rounded-2xl transition text-lg disabled:opacity-50 ${
                editingId
                  ? "bg-yellow-400 hover:bg-yellow-500 text-gray-90"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white"
              }`}
            >
              {loading ? "Saving…" : editingId ? "Update Question" : "Add Question"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={() => { setForm(BLANK_FORM); setEditingId(null); setError(""); }}
                className="px-6 py-3 rounded-2xl bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold transition"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        {/* Questions List */}
        <div>
          <h2 className="text-3xl font-semibold mb-6 text-gray-900">
            All Questions{!fetching && ` (${questions.length})`}
          </h2>
          {fetching ? (
            <p className="text-gray-400 italic text-center py-12">Loading questions…</p>
          ) : questions.length === 0 ? (
            <p className="text-gray-400 italic text-center py-12">No questions yet. Add one above.</p>
          ) : (
            <div className="grid gap-6">
              <AnimatePresence>
                {questions.map((q) => (
                  <motion.div
                    key={q.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-white border border-gray-200 rounded-2xl shadow-md p-6 flex flex-col md:flex-row justify-between items-start hover:shadow-lg transition"
                  >
                    <div className="mb-4 md:mb-0 flex-1">
                      <p className="font-bold text-lg text-gray-900 mb-2">{q.question}</p>
                      <ol className="list-decimal pl-6 text-gray-700 mb-2 space-y-1">
                        {(q.options || []).map((opt, i) => (
                          <li
                            key={i}
                            className={i === q.correctIndex ? "text-green-700 font-semibold" : ""}
                          >
                            {opt} {i === q.correctIndex && "✓"}
                          </li>
                        ))}
                      </ol>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                          {q.category || "Uncategorized"}
                        </span>
                        <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
                          {q.difficulty || "easy"}
                        </span>
                        {q.reference && (
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                            {q.reference}
                          </span>
                        )}
                      </div>
                      {q.explanation && (
                        <p className="text-gray-500 mt-2 text-sm italic">💡 {q.explanation}</p>
                      )}
                    </div>

                    <div className="flex flex-col md:flex-row gap-3 flex-shrink-0">
                      <button
                        onClick={() => handleEdit(q)}
                        className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 px-5 py-2 rounded-2xl font-medium transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(q.id)}
                        className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-2xl font-medium transition"
                      >
                        Delete
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadQuiz;
