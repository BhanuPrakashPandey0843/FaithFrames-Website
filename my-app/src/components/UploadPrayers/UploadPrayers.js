"use client";
import React, { useState, useEffect, useCallback } from "react";
import { uploadImageToCloudinary } from "../../lib/cloudinary";
import { validateRequiredText, validateImageFile } from "../../lib/validation";
import { adminCreate, adminUpdate, adminDelete, fetchAdminContent } from "../../lib/adminApi";
import { todayDisplayDateKey } from "../../lib/prayerSchedule";

function createdAtMs(p) {
  const v = p?.createdAt;
  if (!v) return 0;
  if (typeof v === "string") {
    const t = new Date(v).getTime();
    return Number.isNaN(t) ? 0 : t;
  }
  if (typeof v.seconds === "number") return v.seconds * 1000;
  if (typeof v._seconds === "number") return v._seconds * 1000;
  return 0;
}

function imageSrc(p) {
  const url = p?.bgurl || p?.image || p?.imageUrl || "";
  return String(url).trim();
}

export default function UploadPrayers() {
  const [verse, setVerse] = useState("");
  const [reference, setReference] = useState("");
  const [displayDate, setDisplayDate] = useState(todayDisplayDateKey());
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [prayers, setPrayers] = useState([]);
  const [editId, setEditId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const prayersPerPage = 5;

  const loadPrayers = useCallback(async () => {
    try {
      const result = await fetchAdminContent("dailyPrayers");
      setPrayers(result.items || []);
    } catch (err) {
      console.error("[UploadPrayers] load error:", err);
      setError(err.message || "Failed to load prayers.");
    }
  }, []);

  useEffect(() => {
    loadPrayers();
  }, [loadPrayers]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const verseCheck = validateRequiredText(verse, "Prayer text", 2000);
    if (!verseCheck.ok) {
      setError(verseCheck.message);
      return;
    }
    const refCheck = validateRequiredText(reference, "Reference", 200);
    if (!refCheck.ok) {
      setError(refCheck.message);
      return;
    }
    if (!displayDate) {
      setError("Please choose the date this prayer should appear in the Prayer Room.");
      return;
    }
    if (imageFile) {
      const imgCheck = validateImageFile(imageFile);
      if (!imgCheck.ok) {
        setError(imgCheck.message);
        return;
      }
    }

    try {
      setUploading(true);
      let imageUrl = editId ? imageSrc(prayers.find((p) => p.id === editId) || {}) : "";

      if (imageFile) {
        imageUrl = await uploadImageToCloudinary(imageFile, "faithframes/prayers");
      }

      const payload = {
        verse: verseCheck.value,
        reference: refCheck.value,
        displayDate,
        ...(imageUrl ? { bgurl: imageUrl } : {}),
      };

      if (editId) {
        await adminUpdate("dailyPrayers", editId, payload);
        setSuccess("Prayer updated. It will appear in the Prayer Room on the selected date.");
        setEditId(null);
      } else {
        await adminCreate("dailyPrayers", payload);
        setSuccess("Prayer saved. It will appear in the Prayer Room on the selected date.");
      }
      resetForm();
      loadPrayers();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Error:", err);
      setError(err.message || "Failed to save prayer.");
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setVerse("");
    setReference("");
    setDisplayDate(todayDisplayDateKey());
    setImageFile(null);
    if (previewUrl && previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setEditId(null);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this prayer?")) return;
    try {
      await adminDelete("dailyPrayers", id);
      loadPrayers();
    } catch (err) {
      console.error("Delete error:", err);
      setError(err.message || "Failed to delete.");
    }
  };

  const handleEdit = (prayer) => {
    setEditId(prayer.id);
    setVerse(prayer.verse || "");
    setReference(prayer.reference || "");
    setDisplayDate(prayer.displayDate || todayDisplayDateKey());
    setImageFile(null);
    if (previewUrl && previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(imageSrc(prayer) || null);
    setError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImageFile(file || null);
    if (file) {
      if (previewUrl && previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const filteredPrayers = prayers
    .filter(
      (p) =>
        p.verse?.toLowerCase().includes(search.toLowerCase()) ||
        p.reference?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => createdAtMs(b) - createdAtMs(a));

  const indexOfLast = currentPage * prayersPerPage;
  const indexOfFirst = indexOfLast - prayersPerPage;
  const currentPrayers = filteredPrayers.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredPrayers.length / prayersPerPage);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2 text-indigo-700 text-center">
        Daily Prayers Admin Panel
      </h1>
      <p className="text-center text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 max-w-2xl mx-auto mb-6 text-sm">
        This is the correct panel for the app&apos;s <strong>Library &gt; Prayer Room</strong> screen.
        Choose the display date below — the prayer appears in the app on that day, not only on the day you created it.
      </p>

      {error && (
        <p className="mb-4 max-w-3xl mx-auto text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 text-sm">{error}</p>
      )}
      {success && (
        <p className="mb-4 max-w-3xl mx-auto text-green-700 bg-green-50 border border-green-200 rounded-lg p-3 text-sm">{success}</p>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-2xl shadow-xl border max-w-3xl mx-auto mb-8 space-y-4"
      >
        <input
          type="text"
          value={verse}
          onChange={(e) => setVerse(e.target.value)}
          placeholder="Prayer text"
          className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <input
          type="text"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="Reference (e.g., Matthew 5:9)"
          className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <label className="block">
          <span className="block text-sm font-semibold text-gray-700 mb-1">Display date in Prayer Room</span>
          <input
            type="date"
            value={displayDate}
            onChange={(e) => setDisplayDate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            required
          />
          <span className="mt-1 block text-xs text-gray-500">
            Created today but scheduled for a later day will stay hidden until that date.
          </span>
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {previewUrl && (
          <div className="mt-2 relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Preview"
              referrerPolicy="no-referrer"
              className="w-full max-w-sm rounded-lg shadow-md border mx-auto"
            />
            <button
              type="button"
              onClick={() => {
                setImageFile(null);
                if (previewUrl.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
                setPreviewUrl(null);
              }}
              className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded hover:bg-red-600"
            >
              ✕
            </button>
          </div>
        )}
        <div className="flex gap-3 justify-center">
          <button
            type="submit"
            disabled={uploading}
            className={`${
              editId
                ? "bg-green-600 hover:bg-green-700"
                : "bg-indigo-600 hover:bg-indigo-700"
            } text-white px-6 py-3 rounded-lg font-semibold shadow-md transition disabled:opacity-50`}
          >
            {uploading
              ? "Uploading..."
              : editId
              ? "Update Prayer"
              : "Upload Prayer"}
          </button>
          {editId && (
            <button
              type="button"
              onClick={resetForm}
              className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold shadow-md"
            >
              Cancel Edit
            </button>
          )}
        </div>
      </form>

      <div className="max-w-3xl mx-auto mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search prayers..."
          className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-xl border max-w-3xl mx-auto">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 text-center">
          All Uploaded Prayers
        </h2>
        {currentPrayers.length === 0 ? (
          <p className="text-gray-500 italic text-center">
            No prayers found.
          </p>
        ) : (
          <ul className="space-y-4">
            {currentPrayers.map((p) => {
              const src = imageSrc(p);
              return (
                <li
                  key={p.id}
                  className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl shadow-sm border ${
                    editId === p.id
                      ? "bg-yellow-100 border-yellow-400"
                      : "bg-gray-50"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-800 font-medium text-lg">{p.verse}</p>
                    <p className="text-sm text-indigo-600">{p.reference}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Display date: <strong>{p.displayDate || "legacy (created date)"}</strong>
                    </p>
                    {src ? (
                      <div className="mt-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={src}
                          alt="Prayer background"
                          referrerPolicy="no-referrer"
                          className="w-full max-w-sm rounded-lg shadow-md border mx-auto"
                        />
                        <a
                          href={src}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block mt-1 text-xs text-blue-500 underline text-center"
                        >
                          View Image Link
                        </a>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 mt-2 italic">No image uploaded</p>
                    )}
                  </div>
                  <div className="flex gap-3 justify-center md:justify-start">
                    <button
                      onClick={() => handleEdit(p)}
                      className="px-4 py-2 text-sm bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
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
            <span className="px-2 text-sm text-gray-700">
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
