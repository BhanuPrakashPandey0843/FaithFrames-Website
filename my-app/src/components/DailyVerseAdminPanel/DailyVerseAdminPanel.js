"use client";
/**
 * DailyVerseAdminPanel.js
 * ────────────────────────
 * Manages the dailyVerses Firestore collection.
 *
 * Firestore schema (matches mobile DailyVerse type):
 *   verse     : string
 *   reference : string
 *   bgurl     : string  (Cloudinary URL, optional)
 *   createdAt : Timestamp
 *
 * Uses shared uploadImageToCloudinary() — no hardcoded Cloudinary config here.
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

export default function DailyVerseAdminPanel() {
  const [verse, setVerse] = useState("");
  const [reference, setReference] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [verses, setVerses] = useState([]);
  const [editId, setEditId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const versesPerPage = 5;

  // ─── Real-time listener ─────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "dailyVerses"), orderBy("createdAt", "desc")),
      (snapshot) => {
        setVerses(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      },
      (err) => {
        console.error("[DailyVerseAdmin] listener error:", err);
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

    const verseCheck = validateRequiredText(verse, "Verse text", 1000);
    if (!verseCheck.ok) { setError(verseCheck.message); return; }

    const refCheck = validateRequiredText(reference, "Reference", 100);
    if (!refCheck.ok) { setError(refCheck.message); return; }

    if (imageFile) {
      const imgCheck = validateImageFile(imageFile);
      if (!imgCheck.ok) { setError(imgCheck.message); return; }
    }

    try {
      setUploading(true);

      // Preserve existing bgurl when editing without a new image
      let imageUrl = editId
        ? (verses.find((v) => v.id === editId)?.bgurl ?? "")
        : "";

      if (imageFile) {
        // Uses shared lib — reads NEXT_PUBLIC_CLOUDINARY_* env vars
        imageUrl = await uploadImageToCloudinary(imageFile, "faithframes/verses");
      }

      const payload = {
        verse: verseCheck.value,
        reference: refCheck.value,
        ...(imageUrl ? { bgurl: imageUrl } : {}),
      };

      if (editId) {
        await adminUpdate("dailyVerses", editId, payload);
        setSuccess("Verse updated successfully.");
        setEditId(null);
      } else {
        await adminCreate("dailyVerses", payload);
        setSuccess("Verse uploaded successfully.");
      }

      resetForm();
      setCurrentPage(1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("[DailyVerseAdmin] submit error:", err);
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setVerse("");
    setReference("");
    clearImage();
    setEditId(null);
    setError("");
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this verse? This cannot be undone.")) return;
    try {
      await adminDelete("dailyVerses", id);
    } catch (err) {
      console.error("[DailyVerseAdmin] delete error:", err);
      alert("Failed to delete verse.");
    }
  };

  const handleEdit = (v) => {
    setEditId(v.id);
    setVerse(v.verse || "");
    setReference(v.reference || "");
    setPreviewUrl(v.bgurl || null);
    setImageFile(null);
    setError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ─── Filter + paginate ───────────────────────────────────────────────────
  const filteredVerses = verses.filter(
    (v) =>
      v.verse?.toLowerCase().includes(search.toLowerCase()) ||
      v.reference?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredVerses.length / versesPerPage);
  const currentVerses = filteredVerses.slice(
    (currentPage - 1) * versesPerPage,
    currentPage * versesPerPage
  );

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6 text-indigo-700">Daily Verse Admin Panel</h1>

      {error && <p className="mb-4 text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 text-sm">{error}</p>}
      {success && <p className="mb-4 text-green-700 bg-green-50 border border-green-200 rounded-lg p-3 text-sm">{success}</p>}

      {/* Upload Form */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 bg-white shadow-xl p-6 rounded-2xl border mb-8"
      >
        <h2 className="text-xl font-semibold text-gray-800">
          {editId ? "✏️ Edit Verse" : "📖 Add New Verse"}
        </h2>

        <textarea
          value={verse}
          onChange={(e) => setVerse(e.target.value)}
          placeholder="Verse text *"
          className="border border-gray-300 rounded-lg p-3 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
          required
          maxLength={1000}
        />
        <input
          type="text"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="Reference (e.g., John 3:16) *"
          className="border border-gray-300 rounded-lg p-3 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          required
          maxLength={100}
        />

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
          <div className="mt-2 relative">
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
            disabled={uploading}
            className={`${
              editId ? "bg-green-600 hover:bg-green-700" : "bg-indigo-600 hover:bg-indigo-700"
            } text-white px-6 py-3 rounded-lg font-semibold shadow-md transition disabled:opacity-50`}
          >
            {uploading ? "Uploading…" : editId ? "Update Verse" : "Upload Verse"}
          </button>
          {editId && (
            <button
              type="button"
              onClick={resetForm}
              className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold shadow-md transition"
            >
              Cancel Edit
            </button>
          )}
        </div>
      </form>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
          placeholder="Search by verse text or reference…"
          className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Verse List */}
      <div className="bg-white shadow-xl rounded-2xl p-6 border">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">
          All Uploaded Verses ({filteredVerses.length})
        </h2>
        {currentVerses.length === 0 ? (
          <p className="text-gray-500 italic">
            {search ? "No verses match your search." : "No verses yet. Add one above."}
          </p>
        ) : (
          <ul className="space-y-4">
            {currentVerses.map((v) => (
              <li
                key={v.id}
                className={`flex flex-col md:flex-row md:items-start justify-between gap-4 p-5 rounded-xl shadow-sm border ${
                  editId === v.id ? "bg-yellow-100 border-yellow-400" : "bg-gray-50"
                }`}
              >
                <div className="flex-1">
                  <p className="text-gray-800 font-medium text-base">{v.verse}</p>
                  <p className="text-sm text-indigo-600 mt-0.5">{v.reference}</p>
                  {v.bgurl && (
                    <div className="mt-2">
                      <img
                        src={v.bgurl}
                        alt="Background"
                        className="w-full max-w-xs rounded-lg shadow-md border"
                      />
                    </div>
                  )}
                </div>
                <div className="flex gap-3 flex-shrink-0">
                  <button
                    onClick={() => handleEdit(v)}
                    className="px-4 py-2 text-sm bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(v.id)}
                    className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center items-center mt-6 gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300"
            >
              Prev
            </button>
            <span className="px-2 text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
