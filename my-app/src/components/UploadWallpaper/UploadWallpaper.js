"use client";
import React, { useState } from "react";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import { app } from "../../firebase";

const db = getFirestore(app);

const UploadWallpaper = () => {
  const [form, setForm] = useState({
    title: "",
    category: "",
    country: "",
    location: "",
    rating: "",
    reviews: "",
  });
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!image || !form.title || !form.category) {
      alert("Please fill all required fields");
      return;
    }

    try {
      setLoading(true);

      // ✅ Upload to Cloudinary
      const formData = new FormData();
      formData.append("file", image);
      formData.append("upload_preset", "your_upload_preset"); // from Cloudinary
      formData.append("folder", "religious_wallpapers");

      const res = await fetch(
        "https://api.cloudinary.com/v1_1/your_cloud_name/image/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await res.json();
      const url = data.secure_url;

      // ✅ Save to Firestore
      await addDoc(collection(db, "religiousWallpapers"), {
        id: Date.now(),
        uri: url,
        title: form.title,
        category: form.category,
        country: form.country,
        location: form.location,
        rating: form.rating || "0.0",
        reviews: form.reviews || "0",
        uploadedAt: new Date(),
      });

      alert("Wallpaper uploaded successfully ✅");

      // Reset form
      setForm({
        title: "",
        category: "",
        country: "",
        location: "",
        rating: "",
        reviews: "",
      });
      setImage(null);
    } catch (error) {
      console.error("Upload failed", error);
      alert("Upload failed. Try again.");
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
          {/* Title */}
          <input
            type="text"
            name="title"
            placeholder="Enter Wallpaper Title"
            value={form.title}
            onChange={handleChange}
            className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-indigo-400 focus:outline-none text-gray-800 font-medium"
            required
          />

          {/* Category */}
          <select
            name="category"
            value={form.category}
            onChange={handleChange}
            className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-purple-400 focus:outline-none text-gray-800 font-medium"
            required
          >
            <option value="">Select Category</option>
            <option value="Hindu">Hindu</option>
            <option value="Islamic">Islamic</option>
            <option value="Christian">Christian</option>
            <option value="Sikh">Sikh</option>
            <option value="Buddhist">Buddhist</option>
          </select>

          {/* Extra Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              name="country"
              placeholder="Enter Country"
              value={form.country}
              onChange={handleChange}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none text-gray-700"
            />
            <input
              type="text"
              name="location"
              placeholder="Enter Location"
              value={form.location}
              onChange={handleChange}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-400 focus:outline-none text-gray-700"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="number"
              step="0.1"
              name="rating"
              placeholder="Rating (e.g., 4.5)"
              value={form.rating}
              onChange={handleChange}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-400 focus:outline-none text-gray-700"
            />
            <input
              type="number"
              name="reviews"
              placeholder="Reviews (e.g., 120)"
              value={form.reviews}
              onChange={handleChange}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-yellow-400 focus:outline-none text-gray-700"
            />
          </div>

          {/* File Upload */}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImage(e.target.files[0])}
            className="w-full p-4 border rounded-lg bg-gray-50 cursor-pointer focus:ring-2 focus:ring-indigo-400 focus:outline-none"
            required
          />

          {/* Submit */}
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
