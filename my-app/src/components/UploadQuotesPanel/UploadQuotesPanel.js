"use client";
/**
 * UploadQuotesPanel.js
 * ────────────────────
 * Admin panel for managing quotes.
 *
 * Firestore schema (matches mobile Quote type):
 *   text      : string
 *   author    : string  (optional)
 *   category  : string  (optional)
 *   bgurl     : string  (optional Cloudinary image URL)
 *   createdAt : Timestamp
 */
import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { uploadImageToCloudinary } from "../../lib/cloudinary";
import { validateRequiredText, validateImageFile } from "../../lib/validation";
import { adminCreate, adminUpdate, adminDelete } from "../../lib/adminApi";

const CATEGORIES = ["Faith", "Hope", "Love", "Prayer", "Wisdom", "Courage", "Grace", "General"];

const BLANK_FORM = { text: "", author: "", category: "General" };

export default function UploadQuotesPanel() {
  const [form, setForm] = useState(BLANK_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [quotes, setQuotes] = useState([]);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ─── Real-time listener ─────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "quotes"), orderBy("createdAt", "desc")),
      (snapshot) => {
        setQuotes(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (err) => {
        console.error("[UploadQuotesPanel] listener error:", err);
      }
    );
    return () => unsub();
  }, []);

  // ─── Image handling ─────────────────────────────────────────────────────
  const handleImageChange = (e) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    if (previewUrl && previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const clearImage = () => {
    if (previewUrl && previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setImageFile(null);
    setPreviewUrl(null);
  };

  // ─── Submit ──────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const textCheck = validateRequiredText(form.text, "Quote text", 500);
    if (!textCheck.ok) { setError(textCheck.message); return; }

    if (imageFile) {
      const imgCheck = validateImageFile(imageFile);
      if (!imgCheck.ok) { setError(imgCheck.message); return; }
    }

    try {
      setLoading(true);
      let bgurl = editId
        ? (quotes.find((q) => q.id === editId)?.bgurl ?? "")
        : "";

      if (imageFile) {
        bgurl = await uploadImageToCloudinary(imageFile, "faithframes/quotes");
      }

      const payload = {
        text: textCheck.value,
        author: form.author.trim(),
        category: form.category,
        ...(bgurl ? { bgurl } : {}),
      };

      if (editId) {
        await adminUpdate("quotes", editId, payload);
        setSuccess("Quote updated.");
        setEditId(null);
      } else {
        await adminCreate("quotes", payload);
        setSuccess("Quote added.");
      }

      setForm(BLANK_FORM);
      clearImage();
    } catch (err) {
      console.error("[UploadQuotesPanel] submit error:", err);
      setError(err.message || "Failed to save. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ─── Edit ────────────────────────────────────────────────────────────────
  const handleEdit = (q) => {
    setForm({
      text: q.text || "",
      author: q.author || "",
      category: q.category || "General",
    });
    setPreviewUrl(q.bgurl || null);
    setImageFile(null);
    setEditId(q.id);
    setError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ─── Delete ──────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!confirm("Delete this quote? This cannot be undone.")) return;
    try {
      await adminDelete("quotes", id);
    } catch (err) {
      console.error("[UploadQuotesPanel] delete error:", err);
      alert("Failed to delete quote.");
    }
  };

  // ─── Cancel edit ─────────────────────────────────────────────────────────
  const cancelEdit = () => {
    setForm(BLANK_FORM);
    clearImage();
    setEditId(null);
    setError("");
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-indigo-700">Upload Quotes Panel</h1>

      {error && <p className="mb-4 text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 text-sm">{error}</p>}
      {success && <p className="mb-4 text-green-700 bg-green-50 border border-green-200 rounded-lg p-3 text-sm">{success}</p>}

      {/* Upload Form */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 bg-white shadow-xl p-6 rounded-2xl border mb-8"
      >
        <h2 className="text-xl font-semibold text-gray-800">
          {editId ? "✏️ Edit Quote" : "✨ Add New Quote"}
        </h2>

        <textarea
          value={form.text}
          onChange={(e) => setForm({ ...form, text: e.target.value })}
          placeholder="Quote text *"
          maxLength={500}
          className="border border-gray-300 rounded-lg p-3 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
          required
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            value={form.author}
            onChange={(e) => setForm({ ...form, author: e.target.value })}
            placeholder="Author (optional)"
            maxLength={100}
            className="border border-gray-300 rounded-lg p-3 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="border border-gray-300 rounded-lg p-3 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Background Image (optional)
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="border border-gray-300 rounded-lg p-3 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full"
          />
        </div>

        {previewUrl && (
          <div className="relative">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full max-w-sm rounded-lg shadow-md border"
            />
            <button
              type="button"
              onClick={clearImage}
              className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-md hover:bg-red-600"
            >
              ✕ Remove
            </button>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className={`${
              editId ? "bg-green-600 hover:bg-green-700" : "bg-indigo-600 hover:bg-indigo-700"
            } text-white px-6 py-3 rounded-lg font-semibold shadow-md transition disabled:opacity-50`}
          >
            {loading ? "Saving…" : editId ? "Update Quote" : "Upload Quote"}
          </button>
          {editId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold shadow-md transition"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Quotes List */}
      <div className="bg-white shadow-lg rounded-xl p-6 border">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">
          All Uploaded Quotes ({quotes.length})
        </h2>
        {quotes.length === 0 ? (
          <p className="text-gray-500 italic">No quotes uploaded yet. Add your first one above.</p>
        ) : (
          <ul className="space-y-3">
            {quotes.map((q) => (
              <li
                key={q.id}
                className={`flex flex-col gap-2 p-4 rounded-lg shadow-sm border ${
                  editId === q.id ? "bg-yellow-100 border-yellow-400" : "bg-gray-50"
                }`}
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <p className="text-gray-800 font-medium">&ldquo;{q.text}&rdquo;</p>
                    {q.author && (
                      <p className="text-sm text-indigo-600 mt-0.5">— {q.author}</p>
                    )}
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {q.category && (
                        <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-xs font-medium">
                          {q.category}
                        </span>
                      )}
                      {q.bgurl && (
                        <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs font-medium">
                          Has Image
                        </span>
                      )}
                    </div>
                    {q.bgurl && (
                      <img
                        src={q.bgurl}
                        alt="Quote bg"
                        className="mt-2 w-full max-w-xs rounded-lg border shadow-sm"
                      />
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(q)}
                      className="px-3 py-1 text-sm bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(q.id)}
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
