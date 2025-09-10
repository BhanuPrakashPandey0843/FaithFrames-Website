"use client";
import React, { useState, useEffect } from "react";
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

export default function UploadPrayers() {
  const [verse, setVerse] = useState("");
  const [reference, setReference] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [prayers, setPrayers] = useState([]);
  const [editId, setEditId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const prayersPerPage = 5;

  // ✅ Fetch daily prayers from Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "dailyprayers"), (snapshot) => {
      setPrayers(
        snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }))
      );
    });
    return () => unsub();
  }, []);

  // ✅ Upload image to Cloudinary
  const uploadToCloudinary = async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "faithframes_uploads");
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
        throw new Error(data.error?.message || "Upload failed");
      }
      return data.secure_url;
    } catch (err) {
      console.error("Upload error:", err);
      throw err;
    }
  };

  // ✅ Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!verse.trim() || !reference.trim()) {
      alert("Please fill in both the verse and reference.");
      return;
    }
    try {
      setUploading(true);
      let imageUrl = "";

      if (imageFile) {
        imageUrl = await uploadToCloudinary(imageFile);
      }

      if (editId) {
        await updateDoc(doc(db, "dailyprayers", editId), {
          verse,
          reference,
          ...(imageUrl && { bgurl: imageUrl }),
        });
        setEditId(null);
      } else {
        await addDoc(collection(db, "dailyprayers"), {
          verse,
          reference,
          bgurl: imageUrl,
          createdAt: serverTimestamp(),
        });
      }
      resetForm();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to save prayer.");
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setVerse("");
    setReference("");
    setImageFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setEditId(null);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this prayer?")) return;
    try {
      await deleteDoc(doc(db, "dailyprayers", id));
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete.");
    }
  };

  const handleEdit = (prayer) => {
    setEditId(prayer.id);
    setVerse(prayer.verse);
    setReference(prayer.reference);
    setPreviewUrl(prayer.bgurl || null);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImageFile(file);
    if (file) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const filteredPrayers = prayers
    .filter(
      (p) =>
        p.verse?.toLowerCase().includes(search.toLowerCase()) ||
        p.reference?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds);

  const indexOfLast = currentPage * prayersPerPage;
  const indexOfFirst = indexOfLast - prayersPerPage;
  const currentPrayers = filteredPrayers.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredPrayers.length / prayersPerPage);

  return (
    <div className="flex bg-gray-100 min-h-screen">
      <main className="flex-1 ml-20 md:ml-64 p-6 md:p-10 transition-all duration-500">
        <h1 className="text-3xl font-bold mb-6 text-indigo-700 text-center">
          Daily Prayers Admin Panel
        </h1>

        <form
          onSubmit={handleSubmit}
          className="bg-white p-6 rounded-2xl shadow-xl border max-w-3xl mx-auto mb-8 space-y-4"
        >
          <input
            type="text"
            value={verse}
            onChange={(e) => setVerse(e.target.value)}
            placeholder="Prayer text"
            className="border border-gray-300 rounded-lg p-3 text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Reference (e.g., Matthew 5:9)"
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
                className="w-full max-w-sm rounded-lg shadow-md border mx-auto"
              />
              <button
                type="button"
                onClick={() => {
                  setImageFile(null);
                  URL.revokeObjectURL(previewUrl);
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
              {currentPrayers.map((p) => (
                <li
                  key={p.id}
                  className={`flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl shadow-sm border ${
                    editId === p.id
                      ? "bg-yellow-100 border-yellow-400"
                      : "bg-gray-50"
                  }`}
                >
                  <div className="flex-1">
                    <p className="text-gray-800 font-medium text-lg">{p.verse}</p>
                    <p className="text-sm text-indigo-600">{p.reference}</p>
                    {p.bgurl && (
                      <div className="mt-2">
                        <img
                          src={p.bgurl}
                          alt="Background"
                          className="w-full max-w-sm rounded-lg shadow-md border mx-auto"
                        />
                        <a
                          href={p.bgurl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block mt-1 text-xs text-blue-500 underline text-center"
                        >
                          View Image Link
                        </a>
                      </div>
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
      </main>
    </div>
  );
}
