"use client";
import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { adminCreate, adminUpdate, adminDelete, fetchAdminContent } from "../../lib/adminApi";
import { useToast } from "@/components/ui/Toast";

const UploadWitness = () => {
  const [witnessPosts, setWitnessPosts] = useState([]);
  const [newPost, setNewPost] = useState({
    title: "",
    message: "",
    imageUrl: "",
    userId: "admin", // default for admin
  });
  const [editingId, setEditingId] = useState(null);
  const { addToast } = useToast();

  // Fetch witness posts
  const fetchPosts = useCallback(async () => {
    try {
      const result = await fetchAdminContent("witnessPosts");
      setWitnessPosts(result.items || []);
    } catch (err) {
      console.error("[UploadWitness] fetch error:", err);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  // Add or update post
  const handleSubmit = async (e) => {
    e.preventDefault();

    const postData = {
      title: newPost.title,
      message: newPost.message,
      imageUrl: newPost.imageUrl,
      userId: newPost.userId || "admin",
      likes: editingId ? newPost.likes || 0 : 0,
    };

    try {
      if (editingId) {
        await adminUpdate("witnessPosts", editingId, postData);
        addToast({ type: "success", message: "Testimony updated!" });
        setEditingId(null);
      } else {
        await adminCreate("witnessPosts", postData);
        addToast({ type: "success", message: "Testimony added!" });
      }
      setNewPost({ title: "", message: "", imageUrl: "", userId: "admin" });
      await fetchPosts();
    } catch (err) {
      console.error(err);
      addToast({ type: "error", message: "Failed to save testimony" });
    }
  };

  // Delete post
  const handleDelete = async (id) => {
    try {
      await adminDelete("witnessPosts", id);
      addToast({ type: "success", message: "Testimony deleted!" });
      await fetchPosts();
    } catch (err) {
      console.error(err);
      addToast({ type: "error", message: "Failed to delete testimony" });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-white p-6 md:p-12 font-sans">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold mb-8 text-gray-900 text-center">
           Witness Manager
        </h1>

        {/* Add/Edit Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-gray-200 rounded-2xl shadow-md p-6 mb-10 hover:shadow-lg transition"
        >
          <h2 className="text-2xl font-semibold mb-6 text-gray-900 flex items-center gap-2">
            {editingId ? " Edit Testimony" : " Add New Testimony"}
          </h2>

          {/* Title */}
          <input
            type="text"
            placeholder="Enter Title"
            className="w-full p-4 border rounded-lg mb-4 focus:ring-2 focus:ring-indigo-400 focus:outline-none text-gray-800 font-medium"
            value={newPost.title}
            onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
            required
          />

          {/* Message */}
          <textarea
            placeholder="Enter Message"
            className="w-full p-4 border rounded-lg mb-4 focus:ring-2 focus:ring-blue-400 focus:outline-none text-gray-800"
            rows="4"
            value={newPost.message}
            onChange={(e) =>
              setNewPost({ ...newPost, message: e.target.value })
            }
            required
          />

          {/* Image URL (Optional) */}
          <input
            type="text"
            placeholder="Image URL (optional)"
            className="w-full p-3 border rounded-lg mb-4 focus:ring-2 focus:ring-purple-400 focus:outline-none text-gray-700"
            value={newPost.imageUrl}
            onChange={(e) =>
              setNewPost({ ...newPost, imageUrl: e.target.value })
            }
          />

          <button
            type="submit"
            className={`w-full py-3 font-semibold rounded-2xl transition text-lg ${
              editingId
                ? "bg-yellow-400 hover:bg-yellow-500 text-gray-900"
                : "bg-indigo-600 hover:bg-indigo-700 text-white"
            }`}
          >
            {editingId ? "Update Testimony" : "Add Testimony"}
          </button>
        </form>

        {/* Posts List */}
        <div>
          <h2 className="text-3xl font-semibold mb-6 text-gray-900">
             All Witness Posts
          </h2>
          <div className="grid gap-6">
            <AnimatePresence>
              {witnessPosts.map((post) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="bg-white border border-gray-200 rounded-2xl shadow-md p-6 flex flex-col md:flex-row justify-between items-start hover:shadow-lg transition"
                >
                  <div className="mb-4 md:mb-0 w-full">
                    {/* Image */}
                    {post.imageUrl && (
                      <img
                        src={post.imageUrl}
                        alt={post.title}
                        className="w-full h-60 object-cover rounded-xl mb-4"
                      />
                    )}

                    {/* Title & Message */}
                    <h3 className="font-bold text-xl text-gray-900 mb-2">
                      {post.title}
                    </h3>
                    <p className="text-gray-700 mb-2">{post.message}</p>

                    {/* Metadata */}
                    <div className="flex flex-wrap gap-3 mt-2">
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                         {post.likes || 0} Likes
                      </span>
                      {post.userId && (
                        <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-medium">
                           {post.userId}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col md:flex-row gap-3">
                    <button
                      onClick={() => {
                        setNewPost(post);
                        setEditingId(post.id);
                      }}
                      className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 px-5 py-2 rounded-2xl font-medium transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-2xl font-medium transition"
                    >
                      Delete
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadWitness;
