"use client";
import React, { useState, useEffect } from "react";
import Sidebar from "../Sidebar/Sidebar";
import { db } from "../../firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

export default function DailyVerseAdminPanel() {
  const [verse, setVerse] = useState("");
  const [reference, setReference] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [verses, setVerses] = useState([]);
  const [editId, setEditId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const versesPerPage = 5;

  // 🔹 Fetch verses in real-time
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "dailyVerses"), (snapshot) => {
      setVerses(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      );
    });
    return () => unsub();
  }, []);

  // 🔹 Upload Image to Cloudinary
  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    // ✅ Must match your Cloudinary unsigned preset
    formData.append("upload_preset", "faithframes_uploads");

    // ✅ Store files inside your asset folder
    formData.append("folder", "faithframes/uploadverce");

    try {
      const response = await fetch(
        "https://api.cloudinary.com/v1_1/dhliwva4d/image/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Cloudinary upload failed");
      }

      console.log("✅ Cloudinary Response:", data);
      return data.secure_url; // ✅ Save this in Firestore
    } catch (err) {
      console.error("❌ Cloudinary upload error:", err);
      throw err;
    }
  };

  // 🔹 Handle Upload (Image + Verse Data)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!verse.trim() || !reference.trim()) {
      alert("Please enter both verse and reference.");
      return;
    }

    try {
      setUploading(true);
      let imageUrl = "";

      if (imageFile) {
        imageUrl = await uploadToCloudinary(imageFile);
      }

      if (editId) {
        await updateDoc(doc(db, "dailyVerses", editId), {
          verse,
          reference,
          ...(imageUrl && { bgurl: imageUrl }),
        });
        setEditId(null);
      } else {
        await addDoc(collection(db, "dailyVerses"), {
          verse,
          reference,
          bgurl: imageUrl,
          createdAt: serverTimestamp(),
        });
      }

      resetForm();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error("🔥 Error saving verse: ", error);
      alert(`Something went wrong: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  // 🔹 Reset form
  const resetForm = () => {
    setVerse("");
    setReference("");
    setImageFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setEditId(null);
  };

  // 🔹 Delete Verse
  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this verse?")) return;
    try {
      await deleteDoc(doc(db, "dailyVerses", id));
    } catch (error) {
      console.error("🔥 Error deleting verse: ", error);
      alert("Failed to delete verse.");
    }
  };

  // 🔹 Edit Verse
  const handleEdit = (verseObj) => {
    setEditId(verseObj.id);
    setVerse(verseObj.verse);
    setReference(verseObj.reference);
    setPreviewUrl(verseObj.bgurl || null);
  };

  // 🔹 Handle Image Preview
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImageFile(file);
    if (file) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      const preview = URL.createObjectURL(file);
      setPreviewUrl(preview);
    }
  };

  // 🔍 Filtered verses
  const filteredVerses = verses
    .filter(
      (v) =>
        v.verse?.toLowerCase().includes(search.toLowerCase()) ||
        v.reference?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);

  // 📄 Pagination logic
  const indexOfLast = currentPage * versesPerPage;
  const indexOfFirst = indexOfLast - versesPerPage;
  const currentVerses = filteredVerses.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredVerses.length / versesPerPage);

  return (
    <div className="flex bg-gray-50 min-h-screen">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 ml-20 md:ml-64 p-6 md:p-10 transition-all duration-500">
        <h1 className="text-3xl font-bold mb-6 text-indigo-700">
          Daily Verse Admin Panel
        </h1>

        {/* Upload Form */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 bg-white shadow-xl p-6 rounded-2xl border mb-8"
        >
          <input
            type="text"
            value={verse}
            onChange={(e) => setVerse(e.target.value)}
            placeholder="Verse text"
            className="border border-gray-300 rounded-lg p-3 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Reference (e.g., John 3:16)"
            className="border border-gray-300 rounded-lg p-3 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="border border-gray-300 rounded-lg p-3 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          {previewUrl && (
            <div className="mt-2 relative">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full max-w-sm rounded-lg shadow-md border"
              />
              <button
                type="button"
                onClick={() => {
                  setImageFile(null);
                  URL.revokeObjectURL(previewUrl);
                  setPreviewUrl(null);
                }}
                className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-md hover:bg-red-600"
              >
                ✕
              </button>
            </div>
          )}

          <div className="flex gap-3">
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
                ? "Update Verse"
                : "Upload Verse"}
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

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by verse or reference..."
            className="w-full border border-gray-300 rounded-lg p-3 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Verse List */}
        <div className="bg-white shadow-xl rounded-2xl p-6 border">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            All Uploaded Verses
          </h2>
          {currentVerses.length === 0 ? (
            <p className="text-gray-500 italic">
              No verses found. Try adding or searching.
            </p>
          ) : (
            <ul className="space-y-4">
              {currentVerses.map((v) => (
                <li
                  key={v.id}
                  className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl shadow-sm border ${
                    editId === v.id
                      ? "bg-yellow-100 border-yellow-400"
                      : "bg-gray-50"
                  }`}
                >
                  <div className="flex-1">
                    <p className="text-gray-800 font-medium text-lg">
                      {v.verse}
                    </p>
                    <p className="text-sm text-indigo-600">{v.reference}</p>
                    {v.bgurl && (
                      <div className="mt-2">
                        <img
                          src={v.bgurl}
                          alt="Background"
                          className="w-full max-w-sm rounded-lg shadow-md border"
                        />
                        <a
                          href={v.bgurl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block mt-1 text-xs text-blue-500 underline"
                        >
                          View Image Link
                        </a>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3">
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center mt-6 gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
              >
                Prev
              </button>
              <span className="px-2">
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
