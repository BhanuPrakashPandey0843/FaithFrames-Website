"use client";
/**
 * UploadFeaturedStory.js  — Featured Stories module
 * ────────────────────────────────────────────────
 * Firestore collection : "featuredStories"
 * Cloudinary path      : faithframes/featured-stories
 *
 * This component manages FEATURED prophet stories only.
 * Regular stories have their own independent module:
 *   → /admin/uploads/upload-stories  (UploadStories.js)
 *
 * Schema stored in Firestore:
 *   title           : string
 *   name            : string   (prophet / subject name)
 *   shortdescription: string
 *   fullstory       : string
 *   readingtime     : string
 *   coverimage      : string   (Cloudinary secure URL)
 *   published       : boolean
 *   author          : "admin"
 *   createdAt       : Timestamp
 *   updatedAt       : Timestamp (on edit)
 */
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { uploadImageToCloudinary } from "../../lib/cloudinary";
import { validateImageFile, validateRequiredText } from "../../lib/validation";
import { adminCreate, adminUpdate, adminDelete, fetchAdminContent } from "../../lib/adminApi";
import { useToast } from "@/components/ui/Toast";
import { useStoryUpload } from "@/hooks/useStoryUpload";
import { StoryDropzone } from "@/components/shared/StoryDropzone";
import { FEATURED_STORY_CLOUDINARY_FOLDER } from "@/lib/adminCollections";
import { motion, AnimatePresence } from "framer-motion";

// ─── Constants ────────────────────────────────────────────────────────────────

const FIRESTORE_COLLECTION = "featuredStories";

const STATUS_FILTERS = [
  { id: "all",         label: "All" },
  { id: "published",   label: "Published" },
  { id: "unpublished", label: "Unpublished" },
];

const BLANK_FORM = {
  title:            "",
  prophetName:      "",
  shortdescription: "",
  fullstory:        "",
  readingtime:      "",
  coverimage:       "",
  published:        true,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(timestamp) {
  if (!timestamp) return "—";
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day:   "numeric",
    year:  "numeric",
  });
}

function Spinner({ className = "w-4 h-4" }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function UploadFeaturedStory() {
  const { addToast } = useToast();
  const {
    imageFile,
    previewUrl,
    uploadProgress,
    loading,
    clearImage,
    handleFileSelect,
    handleDrop,
    beginUpload,
    finishUpload,
  } = useStoryUpload();

  const [stories,   setStories]   = useState([]);
  const [form,      setForm]      = useState(BLANK_FORM);
  const [editId,    setEditId]    = useState(null);
  const [error,     setError]     = useState("");
  const [search,    setSearch]    = useState("");
  const [filter,    setFilter]    = useState("all");
  const [showForm,  setShowForm]  = useState(false);
  const [viewStory, setViewStory] = useState(null);
  const [fetching,  setFetching]  = useState(true);

  // ─── Load data from server ──────────────────────────────────────────
  const loadStories = useCallback(async () => {
    setFetching(true);
    try {
      const result = await fetchAdminContent(FIRESTORE_COLLECTION);
      setStories(result.items || []);
    } catch (err) {
      console.error("[UploadFeaturedStory] load error:", err);
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    loadStories();
  }, [loadStories]);

  // ─── Form helpers ──────────────────────────────────────────────────────────
  const resetForm = () => {
    setForm(BLANK_FORM);
    setEditId(null);
    clearImage();
    setError("");
  };

  const handleEdit = (story) => {
    setForm({
      title:            story.title            || "",
      prophetName:      story.name             || "",
      shortdescription: story.shortdescription || "",
      fullstory:        story.fullstory        || "",
      readingtime:      story.readingtime      || "",
      coverimage:       story.coverimage       || "",
      published:        story.published !== false,
    });
    clearImage();
    setEditId(story.id);
    setShowForm(true);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ─── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const titleCheck   = validateRequiredText(form.title,            "Story title",       140);
    const prophetCheck = validateRequiredText(form.prophetName,      "Prophet name",       80);
    const shortCheck   = validateRequiredText(form.shortdescription, "Short description", 180);
    const fullCheck    = validateRequiredText(form.fullstory,        "Full story",       5000);
    const readingCheck = validateRequiredText(form.readingtime,      "Reading time",       40);

    const firstErr = [titleCheck, prophetCheck, shortCheck, fullCheck, readingCheck].find((c) => !c.ok);
    if (firstErr) { setError(firstErr.message); return; }

    try {
      beginUpload();
      let coverimage = form.coverimage;

      if (imageFile) {
        const imageCheck = validateImageFile(imageFile);
        if (!imageCheck.ok) throw new Error(imageCheck.message);
        coverimage = await uploadImageToCloudinary(imageFile, FEATURED_STORY_CLOUDINARY_FOLDER);
      }

      const payload = {
        title:            titleCheck.value,
        name:             prophetCheck.value,
        shortdescription: shortCheck.value,
        fullstory:        fullCheck.value,
        readingtime:      readingCheck.value,
        coverimage,
        published:        Boolean(form.published),
        author:           "admin",
      };

      if (editId) {
        await adminUpdate(FIRESTORE_COLLECTION, editId, payload);
        addToast({ type: "success", message: "Featured story updated successfully." });
        setEditId(null);
      } else {
        await adminCreate(FIRESTORE_COLLECTION, payload);
        addToast({ type: "success", message: "Featured story created successfully." });
      }

      resetForm();
      setShowForm(false);
      loadStories();
    } catch (err) {
      console.error("[UploadFeaturedStory] submit error:", err);
      const msg = err?.message || "Failed to save featured story. Please try again.";
      setError(msg);
      addToast({ type: "error", message: msg });
    } finally {
      finishUpload();
    }
  };

  // ─── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!confirm("Delete this featured story? This action cannot be undone.")) return;
    try {
      await adminDelete(FIRESTORE_COLLECTION, id);
      addToast({ type: "success", message: "Featured story deleted." });
      if (viewStory?.id === id) setViewStory(null);
      loadStories();
    } catch (err) {
      console.error("[UploadFeaturedStory] delete error:", err);
      addToast({ type: "error", message: err?.message || "Failed to delete featured story." });
    }
  };

  // ─── Toggle published ──────────────────────────────────────────────────────
  const handleTogglePublished = async (story) => {
    try {
      await adminUpdate(FIRESTORE_COLLECTION, story.id, { published: !story.published });
      addToast({ type: "success", message: `Featured story ${story.published ? "unpublished" : "published"}` });
      loadStories();
    } catch (err) {
      addToast({ type: "error", message: "Failed to update published status." });
    }
  };

  // ─── Filtered list ─────────────────────────────────────────────────────────
  const filteredStories = useMemo(() => {
    return stories
      .filter((s) => {
        const haystack = [s.title, s.name, s.shortdescription].filter(Boolean).join(" ").toLowerCase();
        if (!haystack.includes(search.toLowerCase())) return false;
        if (filter === "published")   return s.published === true;
        if (filter === "unpublished") return s.published === false;
        return true;
      })
      .slice(0, 120);
  }, [stories, search, filter]);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50/20 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* ── Page Header ────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-amber-500 font-semibold mb-1">
              Featured Stories
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
              Featured Prophet Stories
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Manage featured prophet stories · {stories.length} total
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                if (showForm) { resetForm(); }
                setShowForm((o) => !o);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold shadow-sm transition"
            >
              {showForm ? "✕  Hide Form" : editId ? "✏️  Edit Story" : "➕  Add Story"}
            </button>
          </div>
        </div>

        {/* ── Stats row ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total",       value: stories.length },
            { label: "Published",   value: stories.filter((s) => s.published).length },
            { label: "Drafts",      value: stories.filter((s) => !s.published).length },
            { label: "Showing",     value: filteredStories.length },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <p className="text-xs text-slate-400 uppercase tracking-wider">{label}</p>
              <p className="text-2xl font-bold text-slate-900 mt-2">{value}</p>
            </div>
          ))}
        </div>

        {/* ── Error banner ───────────────────────────────────────────────── */}
        <AnimatePresence>
          {error && (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm"
            >
              <span className="mt-0.5 flex-shrink-0">⚠️</span>
              <span className="flex-1">{error}</span>
              <button onClick={() => setError("")} className="text-red-400 hover:text-red-600">✕</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Search & filter ────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, prophet name…"
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition"
          />
          <div className="relative">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="appearance-none pl-3.5 pr-9 py-2.5 border border-gray-200 rounded-xl bg-white text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400 cursor-pointer transition"
            >
              {STATUS_FILTERS.map((f) => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* ── Add / Edit Form ─────────────────────────────────────────────── */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              key="story-form"
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden"
            >
              {/* Form header */}
              <div className={`px-6 py-4 border-b border-gray-100 ${editId ? "bg-amber-50" : "bg-amber-50/30"}`}>
                <h2 className="text-base font-bold text-slate-900">
                  {editId ? "✏️  Edit Featured Story" : "➕  Add New Featured Story"}
                </h2>
                {editId && (
                  <p className="text-xs text-amber-700 mt-0.5">
                    Editing an existing story — save will overwrite the stored entry.
                  </p>
                )}
                {/* Progress bar */}
                {uploadProgress > 0 && (
                  <div className="mt-3 w-full rounded-full bg-slate-200 overflow-hidden h-1.5">
                    <div
                      className="h-full bg-amber-500 transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-5">
                {/* Title + Prophet Name */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Story Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="The Story of Prophet Musa (AS)"
                      className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition"
                      maxLength={140}
                    />
                    <p className="text-[11px] text-gray-400 mt-1 text-right">{form.title.length}/140</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Prophet Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={form.prophetName}
                      onChange={(e) => setForm({ ...form, prophetName: e.target.value })}
                      placeholder="Musa (AS)"
                      className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition"
                      maxLength={80}
                    />
                  </div>
                </div>

                {/* Reading time + Short description */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Reading Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={form.readingtime}
                      onChange={(e) => setForm({ ...form, readingtime: e.target.value })}
                      placeholder="5 min read"
                      className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition"
                      maxLength={40}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Short Description <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={form.shortdescription}
                      onChange={(e) => setForm({ ...form, shortdescription: e.target.value })}
                      placeholder="A brief summary of the prophet's journey…"
                      className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 min-h-[88px] resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition"
                      maxLength={180}
                    />
                    <p className="text-[11px] text-gray-400 mt-1 text-right">{form.shortdescription.length}/180</p>
                  </div>
                </div>

                {/* Full story */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Full Story <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={form.fullstory}
                    onChange={(e) => setForm({ ...form, fullstory: e.target.value })}
                    placeholder="Write the complete story content here…"
                    className="w-full px-3.5 py-3 border border-gray-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 min-h-[200px] resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition"
                  />
                  <p className="text-[11px] text-gray-400 mt-1 text-right">{form.fullstory.length} chars</p>
                </div>

                {/* Cover image dropzone */}
                <StoryDropzone
                  label="Cover Image"
                  previewUrl={previewUrl}
                  onFileSelect={handleFileSelect}
                  onDrop={handleDrop}
                  onClear={clearImage}
                  disabled={loading}
                />

                {/* Published toggle */}
                <label className="inline-flex items-center gap-3 cursor-pointer select-none">
                  <div
                    onClick={() => setForm({ ...form, published: !form.published })}
                    className={`relative w-10 h-6 rounded-full transition-colors ${
                      form.published ? "bg-amber-500" : "bg-gray-300"
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                        form.published ? "translate-x-4" : ""
                      }`}
                    />
                  </div>
                  <span className="text-sm font-medium text-slate-700">
                    {form.published ? "Published (live)" : "Draft (hidden)"}
                  </span>
                </label>

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className={`flex-1 py-3 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${
                      editId
                        ? "bg-amber-400 hover:bg-amber-500 text-gray-900"
                        : "bg-amber-500 hover:bg-amber-600 text-white"
                    }`}
                  >
                    {loading ? <><Spinner /> Saving…</> : editId ? "Update Story" : "Create Story"}
                  </button>
                  {editId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="px-5 py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-semibold transition"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Stories Table ───────────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-900">
              Featured Stories Table
              <span className="ml-2 text-sm font-normal text-slate-400">
                {fetching ? "loading…" : `${filteredStories.length} of ${stories.length}`}
              </span>
            </h2>
          </div>

          {fetching ? (
            <div className="flex flex-col items-center gap-3 py-16 text-gray-400">
              <Spinner className="w-6 h-6 text-amber-400" />
              <p className="text-sm">Loading featured stories…</p>
            </div>
          ) : filteredStories.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-sm">
              No featured stories match your search or filter.
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      {["Image", "Title", "Prophet", "Status", "Created", "Actions"].map((h) => (
                        <th key={h} className="px-4 py-3.5 text-left text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredStories.map((story) => (
                      <tr key={story.id} className="hover:bg-slate-50 transition-colors">
                        {/* Cover thumbnail */}
                        <td className="px-4 py-4">
                          <div className="h-16 w-24 overflow-hidden rounded-xl bg-slate-100 flex-shrink-0">
                            {story.coverimage ? (
                              <img src={story.coverimage} alt={story.title} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full items-center justify-center text-xs text-slate-400">No img</div>
                            )}
                          </div>
                        </td>
                        {/* Title + excerpt */}
                        <td className="px-4 py-4 max-w-[220px]">
                          <p className="font-semibold text-slate-900 truncate">{story.title}</p>
                          <p className="text-xs text-slate-400 truncate mt-0.5">{story.shortdescription}</p>
                        </td>
                        {/* Prophet name */}
                        <td className="px-4 py-4 text-slate-600 whitespace-nowrap">{story.name}</td>
                        {/* Status badge */}
                        <td className="px-4 py-4">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                            story.published
                              ? "bg-amber-100 text-amber-700"
                              : "bg-rose-100 text-rose-700"
                          }`}>
                            {story.published ? "Live" : "Draft"}
                          </span>
                        </td>
                        {/* Created date */}
                        <td className="px-4 py-4 text-slate-400 whitespace-nowrap text-xs">
                          {formatDate(story.createdAt)}
                        </td>
                        {/* Action buttons */}
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              onClick={() => setViewStory(viewStory?.id === story.id ? null : story)}
                              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                            >
                              {viewStory?.id === story.id ? "Close" : "View"}
                            </button>
                            <button
                              onClick={() => handleEdit(story)}
                              className="px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800 text-xs font-semibold hover:bg-amber-200 transition"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleTogglePublished(story)}
                              className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition"
                            >
                              {story.published ? "Unpublish" : "Publish"}
                            </button>
                            <button
                              onClick={() => handleDelete(story.id)}
                              className="px-3 py-1.5 rounded-lg bg-red-100 text-red-700 text-xs font-semibold hover:bg-red-200 transition"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card-Grid List View */}
              <div className="lg:hidden space-y-4 p-4 bg-slate-50/50 rounded-b-2xl">
                {filteredStories.map((story) => (
                  <div
                    key={story.id}
                    className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4"
                  >
                    <div className="flex gap-4">
                      <div className="h-16 w-24 overflow-hidden rounded-xl bg-slate-100 flex-shrink-0">
                        {story.coverimage ? (
                          <img src={story.coverimage} alt={story.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-slate-400">No img</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-slate-900 truncate">{story.title}</h3>
                        <p className="text-xs text-slate-400 truncate mt-0.5">{story.shortdescription}</p>
                        <p className="text-xs font-medium text-slate-500 mt-1">Prophet: {story.name}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-50 text-xs text-slate-400">
                      <span>Created: {formatDate(story.createdAt)}</span>
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                        story.published
                          ? "bg-amber-100 text-amber-700"
                          : "bg-rose-100 text-rose-700"
                      }`}>
                        {story.published ? "Live" : "Draft"}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      <button
                        onClick={() => setViewStory(viewStory?.id === story.id ? null : story)}
                        className="flex-1 min-w-[60px] px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                      >
                        {viewStory?.id === story.id ? "Close" : "View"}
                      </button>
                      <button
                        onClick={() => handleEdit(story)}
                        className="flex-1 min-w-[60px] px-3 py-2 rounded-lg bg-amber-100 text-amber-800 text-xs font-semibold hover:bg-amber-200 transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleTogglePublished(story)}
                        className="flex-1 min-w-[60px] px-3 py-2 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition"
                      >
                        {story.published ? "Unpublish" : "Publish"}
                      </button>
                      <button
                        onClick={() => handleDelete(story.id)}
                        className="flex-1 min-w-[60px] px-3 py-2 rounded-lg bg-red-100 text-red-700 text-xs font-semibold hover:bg-red-200 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── Story Preview Panel ─────────────────────────────────────────── */}
        <AnimatePresence>
          {viewStory && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-slate-900">Featured Story Preview</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Read-only view of the selected story.</p>
                </div>
                <button
                  onClick={() => setViewStory(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
                >
                  Close
                </button>
              </div>

              <div className="p-6 grid gap-6 lg:grid-cols-[280px_1fr]">
                {/* Cover image */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 max-h-[360px]">
                  {viewStory.coverimage ? (
                    <img src={viewStory.coverimage} alt={viewStory.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full min-h-[200px] items-center justify-center text-sm text-slate-400">
                      No cover image
                    </div>
                  )}
                </div>

                {/* Story content */}
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                    <p className="text-xs uppercase tracking-widest text-slate-400">{viewStory.name}</p>
                    <h3 className="mt-2 text-2xl font-bold text-slate-900">{viewStory.title}</h3>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">{viewStory.shortdescription}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="px-3 py-1.5 rounded-full bg-white shadow-sm text-xs text-slate-600 border border-slate-200">
                        🕐 {viewStory.readingtime}
                      </span>
                      <span className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                        viewStory.published ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
                      }`}>
                        {viewStory.published ? "Published" : "Draft"}
                      </span>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-100 bg-white p-5">
                    <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
                      Full Story
                    </h4>
                    <p className="text-sm leading-7 text-slate-700 whitespace-pre-line">{viewStory.fullstory}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
