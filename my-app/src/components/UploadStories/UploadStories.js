"use client";

import React, { useState, useEffect, useMemo } from "react";
import { db } from "../../firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { uploadImageToCloudinary } from "../../lib/cloudinary";
import { validateImageFile, validateRequiredText } from "../../lib/validation";
import { adminCreate, adminUpdate, adminDelete } from "../../lib/adminApi";

const STATUS_FILTERS = [
  { id: "all", label: "All" },
  { id: "published", label: "Published" },
  { id: "unpublished", label: "Unpublished" },
  { id: "featured", label: "Featured" },
];

const BLANK_FORM = {
  title: "",
  prophetName: "",
  shortdescription: "",
  fullstory: "",
  readingtime: "",
  coverimage: "",
  featured: false,
  published: true,
};

function formatDate(timestamp) {
  if (!timestamp) return "-";
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function UploadStories() {
  const [stories, setStories] = useState([]);
  const [form, setForm] = useState(BLANK_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [viewStory, setViewStory] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    const q = query(collection(db, "stories"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        setStories(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      },
      (err) => {
        console.error("[UploadStories] listener error:", err);
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!loading) return undefined;
    let progress = 0;
    setUploadProgress(10);
    const interval = setInterval(() => {
      progress = Math.min(progress + 12, 90);
      setUploadProgress(progress);
    }, 180);
    return () => clearInterval(interval);
  }, [loading]);

  const clearImage = () => {
    if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    setImageFile(null);
    setPreviewUrl(null);
  };

  const handleFileSelect = (file) => {
    if (!file) return;
    clearImage();
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0] ?? null;
    handleFileSelect(file);
  };

  const resetForm = () => {
    setForm(BLANK_FORM);
    setEditId(null);
    clearImage();
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    const titleCheck = validateRequiredText(form.title, "Story title", 140);
    if (!titleCheck.ok) return setError(titleCheck.message);
    const prophetCheck = validateRequiredText(form.prophetName, "Prophet name", 80);
    if (!prophetCheck.ok) return setError(prophetCheck.message);
    const shortCheck = validateRequiredText(form.shortdescription, "Short description", 180);
    if (!shortCheck.ok) return setError(shortCheck.message);
    const fullCheck = validateRequiredText(form.fullstory, "Full story", 500);
    if (!fullCheck.ok) return setError(fullCheck.message);
    const readingCheck = validateRequiredText(form.readingtime, "Reading time", 40);
    if (!readingCheck.ok) return setError(readingCheck.message);

    try {
      setLoading(true);
      let coverUrl = form.coverimage;
      if (imageFile) {
        const imageCheck = validateImageFile(imageFile);
        if (!imageCheck.ok) throw new Error(imageCheck.message);
        coverUrl = await uploadImageToCloudinary(imageFile, "faithframes/stories");
      }

      const payload = {
        title: titleCheck.value,
        name: prophetCheck.value,
        shortdescription: shortCheck.value,
        fullstory: fullCheck.value,
        readingtime: readingCheck.value,
        coverimage: coverUrl,
        featured: Boolean(form.featured),
        published: Boolean(form.published),
        author: "admin",
      };

      if (editId) {
        await adminUpdate("stories", editId, payload);
        setSuccess("Story updated successfully.");
      } else {
        await adminCreate("stories", payload);
        setSuccess("Story created successfully.");
      }

      resetForm();
      setShowForm(false);
    } catch (submitError) {
      console.error("[UploadStories] submit error:", submitError);
      setError(submitError?.message || "Failed to save story. Please try again.");
    } finally {
      setLoading(false);
      setUploadProgress(100);
      window.setTimeout(() => setUploadProgress(0), 500);
    }
  };

  const handleEdit = (story) => {
    setForm({
      title: story.title || "",
      prophetName: story.name || "",
      shortdescription: story.shortdescription || "",
      fullstory: story.fullstory || "",
      readingtime: story.readingtime || "",
      coverimage: story.coverimage || "",
      featured: story.featured === true,
      published: story.published !== false,
    });
    clearImage();
    setEditId(story.id);
    setShowForm(true);
    setError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this story? This action cannot be undone.")) return;
    try {
      await adminDelete("stories", id);
      setSuccess("Story deleted.");
      if (viewStory?.id === id) setViewStory(null);
    } catch (deleteError) {
      console.error("[UploadStories] delete error:", deleteError);
      setError(deleteError?.message || "Failed to delete story.");
    }
  };

  const handleTogglePublished = async (story) => {
    try {
      await adminUpdate("stories", story.id, { published: !story.published });
      setSuccess("Publication status updated.");
    } catch (err) {
      console.error("[UploadStories] toggle publish error:", err);
      setError("Failed to update published status.");
    }
  };

  const handleToggleFeatured = async (story) => {
    try {
      await adminUpdate("stories", story.id, { featured: !story.featured });
      setSuccess("Featured status updated.");
    } catch (err) {
      console.error("[UploadStories] toggle featured error:", err);
      setError("Failed to update featured status.");
    }
  };

  const filteredStories = useMemo(() => {
    return stories
      .filter((story) => {
        const matchesSearch = [story.title, story.name, story.shortdescription]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(search.toLowerCase()));

        if (!matchesSearch) return false;
        if (filter === "published") return story.published === true;
        if (filter === "unpublished") return story.published === false;
        if (filter === "featured") return story.featured === true;
        return true;
      })
      .slice(0, 120);
  }, [stories, search, filter]);

  const totalCount = stories.length;
  const featuredCount = stories.filter((story) => story.featured).length;

  return (
    <div className="min-h-screen bg-gray-100 p-6 md:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-indigo-600 font-semibold">
              Prophet Stories Management
            </p>
            <h1 className="text-4xl font-bold text-slate-900 mt-2">
              Upload & manage stories
            </h1>
          </div>
          <div className="flex flex-wrap gap-3 justify-end">
            <button
              type="button"
              onClick={() => setShowForm((open) => !open)}
              className="inline-flex items-center justify-center rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700"
            >
              {showForm ? "Hide Story Form" : editId ? "Edit Story" : "Add Story"}
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Total stories</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{totalCount}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Featured stories</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{featuredCount}</p>
          </div>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-500">Search & filter</p>
            <div className="mt-4 space-y-3">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search stories..."
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500"
              />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500"
              >
                {STATUS_FILTERS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {(error || success) && (
          <div className="rounded-3xl border p-4 text-sm shadow-sm transition">
            {error ? (
              <p className="text-red-700 bg-red-50 border border-red-100 rounded-2xl p-4">{error}</p>
            ) : (
              <p className="text-green-700 bg-emerald-50 border border-emerald-100 rounded-2xl p-4">{success}</p>
            )}
          </div>
        )}

        {showForm && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">
                  {editId ? "Edit Prophet Story" : "Add New Prophet Story"}
                </h2>
                <p className="text-sm text-slate-500">
                  Add a title, prophet name, cover image, and the full story.
                </p>
              </div>
              {uploadProgress > 0 && (
                <div className="w-full md:w-64 rounded-full bg-slate-100 overflow-hidden mt-3 md:mt-0">
                  <div
                    className="h-2 bg-indigo-600 transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  Story Title
                  <input
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="The Story of Prophet Musa (AS)"
                    className="w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500"
                    required
                    maxLength={140}
                  />
                </label>
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  Prophet Name
                  <input
                    value={form.prophetName}
                    onChange={(e) => setForm({ ...form, prophetName: e.target.value })}
                    placeholder="Musa (AS)"
                    className="w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500"
                    required
                    maxLength={80}
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  Reading Time
                  <input
                    value={form.readingtime}
                    onChange={(e) => setForm({ ...form, readingtime: e.target.value })}
                    placeholder="5 min"
                    className="w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500"
                    required
                    maxLength={40}
                  />
                </label>
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  Short Description
                  <textarea
                    value={form.shortdescription}
                    onChange={(e) => setForm({ ...form, shortdescription: e.target.value })}
                    placeholder="A summary of the prophet's journey."
                    className="w-full min-h-[120px] resize-none rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500"
                    required
                    maxLength={180}
                  />
                </label>
              </div>

              <label className="space-y-2 text-sm font-medium text-slate-700">
                Full Story Content
                <textarea
                  value={form.fullstory}
                  onChange={(e) => setForm({ ...form, fullstory: e.target.value })}
                  placeholder="Write the complete story content here."
                  className="w-full min-h-[220px] resize-none rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-indigo-500"
                  required
                />
              </label>

              <div
                className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center transition hover:border-indigo-400 hover:bg-white"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                <p className="text-sm font-semibold text-slate-900">Cover Image Upload</p>
                <p className="mt-2 text-sm text-slate-500">
                  Drag an image here or click to select a file. JPEG/PNG under 5MB.
                </p>
                <div className="mt-4 flex justify-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
                    className="cursor-pointer"
                  />
                </div>
                {previewUrl && (
                  <div className="relative mx-auto mt-4 max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                    <img src={previewUrl} alt="Cover preview" className="w-full object-cover" />
                    <button
                      type="button"
                      onClick={clearImage}
                      className="absolute right-3 top-3 rounded-full bg-slate-900/80 px-3 py-1 text-sm font-semibold text-white hover:bg-slate-900"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <label className="inline-flex items-center gap-3 rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-indigo-500">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                    className="h-5 w-5 rounded border-slate-300 text-indigo-600"
                  />
                  Featured story
                </label>
                <label className="inline-flex items-center gap-3 rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-indigo-500">
                  <input
                    type="checkbox"
                    checked={form.published}
                    onChange={(e) => setForm({ ...form, published: e.target.checked })}
                    className="h-5 w-5 rounded border-slate-300 text-indigo-600"
                  />
                  Published
                </label>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-3xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Saving story…" : editId ? "Update Story" : "Create Story"}
                </button>
                {editId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-3xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>
            </form>
          </section>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Stories table</h2>
              <p className="text-sm text-slate-500">View, edit, feature, publish, or delete any story.</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
              Showing {filteredStories.length} of {totalCount}
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-[0.16em] text-[11px]">
                <tr>
                  <th className="px-4 py-4 text-left">Image</th>
                  <th className="px-4 py-4 text-left">Title</th>
                  <th className="px-4 py-4 text-left">Prophet</th>
                  <th className="px-4 py-4 text-center">Featured</th>
                  <th className="px-4 py-4 text-center">Published</th>
                  <th className="px-4 py-4 text-right">Views</th>
                  <th className="px-4 py-4 text-left">Created</th>
                  <th className="px-4 py-4 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredStories.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                      No stories match your search or filter.
                    </td>
                  </tr>
                ) : (
                  filteredStories.map((story) => (
                    <tr key={story.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-4 align-top">
                        <div className="h-20 w-28 overflow-hidden rounded-3xl bg-slate-100 shadow-sm">
                          {story.coverimage ? (
                            <img
                              src={story.coverimage}
                              alt={story.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-slate-400">
                              No image
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 align-top max-w-[240px] truncate">
                        <div className="font-semibold text-slate-900">{story.title}</div>
                        <div className="mt-1 truncate text-slate-500">{story.shortdescription}</div>
                      </td>
                      <td className="px-4 py-4 align-top text-slate-700">{story.name}</td>
                      <td className="px-4 py-4 align-top text-center">
                        <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${story.featured ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                          {story.featured ? "Yes" : "No"}
                        </span>
                      </td>
                      <td className="px-4 py-4 align-top text-center">
                        <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${story.published ? "bg-indigo-100 text-indigo-700" : "bg-rose-100 text-rose-700"}`}>
                          {story.published ? "Live" : "Draft"}
                        </span>
                      </td>
                      <td className="px-4 py-4 align-top text-right text-slate-700">{story.views ?? 0}</td>
                      <td className="px-4 py-4 align-top text-slate-500">{formatDate(story.createdAt)}</td>
                      <td className="px-4 py-4 align-top">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => setViewStory(story)}
                            className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleEdit(story)}
                            className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(story.id)}
                            className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => handleTogglePublished(story)}
                            className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100"
                          >
                            {story.published ? "Unpublish" : "Publish"}
                          </button>
                          <button
                            onClick={() => handleToggleFeatured(story)}
                            className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-100"
                          >
                            {story.featured ? "Unfeature" : "Feature"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {viewStory && (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Story preview</h2>
                <p className="text-sm text-slate-500">Review the selected story before publishing or editing.</p>
              </div>
              <button
                onClick={() => setViewStory(null)}
                className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Close preview
              </button>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-100">
                {viewStory.coverimage ? (
                  <img src={viewStory.coverimage} alt={viewStory.title} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full min-h-[280px] items-center justify-center text-slate-400">No cover image</div>
                )}
              </div>
              <div className="space-y-4">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{viewStory.name}</p>
                  <h3 className="mt-2 text-3xl font-semibold text-slate-900">{viewStory.title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{viewStory.shortdescription}</p>
                  <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-600">
                    <span className="rounded-full bg-white px-3 py-2 shadow-sm">{viewStory.readingtime}</span>
                    <span className="rounded-full bg-white px-3 py-2 shadow-sm">{viewStory.published ? "Published" : "Draft"}</span>
                    {viewStory.featured && <span className="rounded-full bg-white px-3 py-2 shadow-sm">Featured</span>}
                  </div>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-5">
                  <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Story content</h4>
                  <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700">{viewStory.fullstory}</p>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
