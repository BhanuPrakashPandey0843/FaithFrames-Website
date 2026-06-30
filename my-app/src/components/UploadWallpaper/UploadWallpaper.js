"use client";
import React, { useState, useEffect, useCallback } from "react";
import { uploadImageToCloudinary } from "../../lib/cloudinary";
import { validateImageFile, validateRequiredText } from "../../lib/validation";
import { adminCreate, adminDelete, fetchAdminContent } from "../../lib/adminApi";
import { useToast } from "@/components/ui/Toast";

const UploadWallpaper = () => {
  const [title, setTitle] = useState("");
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");
  const [wallpapers, setWallpapers] = useState([]);
  const { addToast } = useToast();

  const loadWallpapers = useCallback(async () => {
    setFetching(true);
    try {
      const response = await fetchAdminContent("religiousWallpapers");
      setWallpapers(response.items || []);
    } catch (err) {
      console.error("Error loading wallpapers:", err);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    loadWallpapers();
  }, [loadWallpapers]);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setError("");

    const titleCheck = validateRequiredText(title, "Title", 120);
    if (!titleCheck.ok) {
      setError(titleCheck.message);
      return;
    }

    const imageCheck = validateImageFile(image);
    if (!imageCheck.ok) {
      setError(imageCheck.message);
      return;
    }

    try {
      setLoading(true);
      const url = await uploadImageToCloudinary(image, "faithframes/wallpapers");

      await adminCreate("religiousWallpapers", {
        uri: url,
        title: titleCheck.value,
      });

      setTitle("");
      setImage(null);
      setImagePreview(null);
      addToast({ type: "success", message: "Wallpaper uploaded successfully!" });
      loadWallpapers();
    } catch (uploadError) {
      console.error("Upload failed", uploadError);
      setError(uploadError.message || "Upload failed. Try again.");
      addToast({ type: "error", message: "Failed to upload wallpaper!" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this wallpaper?")) return;
    try {
      await adminDelete("religiousWallpapers", id);
      addToast({ type: "success", message: "Wallpaper deleted!" });
      loadWallpapers();
    } catch (err) {
      console.error("Delete failed:", err);
      addToast({ type: "error", message: "Failed to delete wallpaper!" });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white p-6 md:p-12 font-sans">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold mb-8 text-gray-900 text-center bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          Wallpaper Manager
        </h1>

        {/* Upload Form Section */}
        <div className="mb-12">
          <div className="bg-white border border-gray-200 rounded-3xl shadow-lg p-6 md:p-10 hover:shadow-xl transition">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Upload New Wallpaper
            </h2>

            <form onSubmit={handleUpload} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Wallpaper Title</label>
                <input
                  type="text"
                  placeholder="Enter a beautiful title..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full p-4 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-400 focus:border-indigo-500 outline-none text-gray-800 font-medium text-lg transition"
                  required
                  maxLength={120}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Select Image</label>
                <div className={`border-2 border-dashed rounded-2xl p-8 text-center transition ${image ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400 hover:bg-gray-50'}`}>
                  {imagePreview ? (
                    <div className="space-y-4">
                      <img src={imagePreview} alt="Preview" className="max-h-64 mx-auto rounded-xl shadow-lg" />
                      <button
                        type="button"
                        onClick={() => { setImage(null); setImagePreview(null); }}
                        className="text-sm text-red-600 hover:text-red-700 font-semibold"
                      >
                        Change Image
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <svg className="w-16 h-16 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <div className="text-gray-600 text-lg">Click to select or drag and drop</div>
                      <div className="text-sm text-gray-400 mt-1">PNG, JPG, GIF up to 10MB</div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                        required
                      />
                    </label>
                  )}
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm font-medium">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-4 font-bold rounded-2xl text-lg transition flex items-center justify-center gap-2 ${
                  loading
                    ? "bg-gray-400 text-white cursor-not-allowed"
                    : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl"
                }`}
              >
                {loading ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Upload Wallpaper
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Wallpapers Gallery Section */}
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Your Wallpapers ({wallpapers.length})
          </h2>

          {fetching ? (
            <div className="flex flex-col items-center justify-center py-20">
              <svg className="w-12 h-12 animate-spin text-indigo-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-gray-500 mt-4 text-lg">Loading wallpapers...</p>
            </div>
          ) : wallpapers.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 rounded-3xl border border-gray-200">
              <svg className="w-20 h-20 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-500 text-xl font-medium">No wallpapers yet</p>
              <p className="text-gray-400 mt-2">Upload your first wallpaper above!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {wallpapers.map((wallpaper) => (
                <div key={wallpaper.id} className="group bg-white rounded-3xl shadow-md overflow-hidden border border-gray-200 hover:shadow-2xl transition-all duration-300">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    {wallpaper.uri ? (
                      <img src={wallpaper.uri} alt={wallpaper.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                        <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <button
                        onClick={() => handleDelete(wallpaper.id)}
                        className="absolute bottom-4 left-1/2 transform -translate-x-1/2 w-3/4 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg transition"
                      >
                        Delete Wallpaper
                      </button>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 truncate">{wallpaper.title}</h3>
                    {wallpaper.createdAt && (
                      <p className="text-sm text-gray-500 mt-2">
                        {new Date(wallpaper.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadWallpaper;
