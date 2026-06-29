"use client";
import React, { useState } from "react";
import { uploadImageToCloudinary } from "../../lib/cloudinary";
import { validateImageFile, validateRequiredText } from "../../lib/validation";
import { adminCreate } from "../../lib/adminApi";

const UploadWallpaper = () => {
  const [title, setTitle] = useState("");
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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
      alert("Wallpaper uploaded successfully");
    } catch (uploadError) {
      console.error("Upload failed", uploadError);
      setError(uploadError.message || "Upload failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-50 p-6 md:p-12 font-sans">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold mb-8 text-gray-900 text-center">
          Upload Religious Wallpaper
        </h1>

        <form
          onSubmit={handleUpload}
          className="bg-white border border-gray-200 rounded-2xl shadow-md p-6 md:p-10 hover:shadow-lg transition space-y-5"
        >
          <input
            type="text"
            placeholder="Enter Wallpaper Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-indigo-400 focus:outline-none text-gray-800 font-medium"
            required
            maxLength={120}
          />

          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImage(e.target.files?.[0] ?? null)}
            className="w-full p-4 border rounded-lg bg-gray-50 cursor-pointer focus:ring-2 focus:ring-indigo-400 focus:outline-none"
            required
          />

          {error ? <p className="text-red-600 text-sm">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 font-semibold rounded-2xl transition text-lg ${
              loading
                ? "bg-gray-400 text-white cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700 text-white"
            }`}
          >
            {loading ? "Uploading..." : "Upload Wallpaper"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UploadWallpaper;
