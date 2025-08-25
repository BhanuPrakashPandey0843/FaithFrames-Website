"use client";
import React, { useState } from "react";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import { app } from "../../../../firebase";

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
        id: Date.now(), // simple unique ID
        uri: url,
        title: form.title,
        category: form.category,
        country: form.country,
        location: form.location,
        rating: form.rating || "0.0",
        reviews: form.reviews || "0",
        uploadedAt: new Date(),
      });

      alert("Wallpaper uploaded successfully ");

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
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-purple-100 to-yellow-100 p-6">
      <div className="bg-white shadow-2xl rounded-2xl p-8 w-full max-w-lg">
        <h1 className="text-2xl font-bold text-center mb-6 text-purple-800">
          📿 Upload Religious Wallpaper
        </h1>

        <form onSubmit={handleUpload} className="space-y-4">
          {/* Title */}
          <input
            type="text"
            name="title"
            placeholder="Enter Wallpaper Title"
            value={form.title}
            onChange={handleChange}
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />

          {/* Category */}
          <select
            name="category"
            value={form.category}
            onChange={handleChange}
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
          >
            <option value="">Select Category</option>
            <option value="Hindu"> Hindu</option>
            <option value="Islamic"> Islamic</option>
            <option value="Christian"> Christian</option>
            <option value="Sikh"> Sikh</option>
            <option value="Buddhist"> Buddhist</option>
          </select>

          {/* Extra Fields */}
          <input
            type="text"
            name="country"
            placeholder="Enter Country"
            value={form.country}
            onChange={handleChange}
            className="w-full p-3 border rounded-lg"
          />
          <input
            type="text"
            name="location"
            placeholder="Enter Location"
            value={form.location}
            onChange={handleChange}
            className="w-full p-3 border rounded-lg"
          />
          <input
            type="number"
            step="0.1"
            name="rating"
            placeholder="Rating (e.g., 4.5)"
            value={form.rating}
            onChange={handleChange}
            className="w-full p-3 border rounded-lg"
          />
          <input
            type="number"
            name="reviews"
            placeholder="Reviews (e.g., 120)"
            value={form.reviews}
            onChange={handleChange}
            className="w-full p-3 border rounded-lg"
          />

          {/* File Upload */}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImage(e.target.files[0])}
            className="w-full p-3 border rounded-lg"
          />

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-700 text-white py-3 rounded-xl font-semibold hover:bg-purple-800 transition-all"
          >
            {loading ? "Uploading..." : "Upload Wallpaper "}
          </button>
        </form>
      </div>
    </div>
  );
};

export default UploadWallpaper;


