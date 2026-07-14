"use client";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Video,
  UploadCloud,
  Trash2,
  Pencil,
  Eye,
  EyeOff,
  Star,
  Search,
  Loader2,
  X,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  Undo2,
  PlayCircle,
} from "lucide-react";
import { adminCreate, adminUpdate, adminDelete, fetchAdminContent } from "../../lib/adminApi";
import {
  uploadImageToCloudinary,
  uploadVideoToCloudinary,
  deleteCloudinaryAsset,
} from "../../lib/cloudinary";
import { validateImageFile, validateVideoFile, validateRequiredText } from "../../lib/validation";
import {
  WITNESS_THUMBNAIL_CLOUDINARY_FOLDER,
  WITNESS_VIDEO_CLOUDINARY_FOLDER,
  WITNESS_VIDEO_CATEGORIES,
} from "../../lib/adminCollections";
import { useToast } from "@/components/ui/Toast";

const DRAFT_KEY = "faithframes_admin_witness_video_draft";
const PAGE_SIZE = 8;

const EMPTY_FORM = {
  title: "",
  description: "",
  category: WITNESS_VIDEO_CATEGORIES[0],
  tags: "",
  duration: 0,
  displayOrder: 0,
  isActive: true,
  featured: false,
  seoTitle: "",
  seoDescription: "",
  transcript: "",
  publishedAt: new Date().toISOString().slice(0, 10),
};

function formatDuration(seconds) {
  const s = Math.max(0, Math.round(seconds || 0));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${String(rem).padStart(2, "0")}`;
}

export default function VideosManager() {
  const [videos, setVideos] = useState([]);
  const [fetching, setFetching] = useState(true);

  const [form, setForm] = useState(EMPTY_FORM);
  const [thumbnail, setThumbnail] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [videoLocalPreview, setVideoLocalPreview] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);
  const uploadHandleRef = useRef(null);

  const [editingId, setEditingId] = useState(null);
  const [editingMedia, setEditingMedia] = useState({ videoUrl: "", videoPublicId: "", thumbnail: "", thumbnailPublicId: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [draftRestored, setDraftRestored] = useState(false);
  const [previewVideo, setPreviewVideo] = useState(null);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(new Set());
  const [pendingDelete, setPendingDelete] = useState(null); // { video, timeoutId }

  const { addToast } = useToast();

  // ── Load ──────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setFetching(true);
    try {
      const res = await fetchAdminContent("witnessVideos");
      setVideos(res.items || []);
    } catch {
      addToast({ type: "error", message: "Failed to load videos." });
    } finally {
      setFetching(false);
    }
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Autosave draft (debounced) ───────────────────────────────────────
  useEffect(() => {
    if (editingId) return; // don't autosave while editing an existing doc
    const handle = setTimeout(() => {
      const hasContent = form.title || form.description;
      if (hasContent) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
      }
    }, 600);
    return () => clearTimeout(handle);
  }, [form, editingId]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft?.title || draft?.description) {
          setForm((f) => ({ ...f, ...draft }));
          setDraftRestored(true);
        }
      }
    } catch {
      // ignore corrupt draft
    }
  }, []);

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setDraftRestored(false);
  };

  // ── Form helpers ─────────────────────────────────────────────────────
  const resetForm = () => {
    setForm(EMPTY_FORM);
    setThumbnail(null);
    setThumbnailPreview(null);
    setVideoFile(null);
    setVideoLocalPreview(null);
    setUploadProgress(0);
    setEditingId(null);
    setEditingMedia({ videoUrl: "", videoPublicId: "", thumbnail: "", thumbnailPublicId: "" });
    setError("");
    clearDraft();
  };

  const handleThumbnailChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setThumbnail(file);
    const reader = new FileReader();
    reader.onload = (ev) => setThumbnailPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleVideoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const check = validateVideoFile(file);
    if (!check.ok) {
      setError(check.message);
      return;
    }
    setVideoFile(file);
    setVideoLocalPreview(URL.createObjectURL(file));
    setError("");
  };

  const cancelUpload = () => {
    uploadHandleRef.current?.cancel();
    setUploading(false);
    setUploadProgress(0);
  };

  const startEdit = (video) => {
    setEditingId(video.id);
    setEditingMedia({
      videoUrl: video.videoUrl || "",
      videoPublicId: video.videoPublicId || "",
      thumbnail: video.thumbnail || "",
      thumbnailPublicId: video.thumbnailPublicId || "",
    });
    setForm({
      title: video.title || "",
      description: video.description || "",
      category: video.category || WITNESS_VIDEO_CATEGORIES[0],
      tags: Array.isArray(video.tags) ? video.tags.join(", ") : "",
      duration: video.duration || 0,
      displayOrder: video.displayOrder ?? 0,
      isActive: video.isActive !== false,
      featured: video.featured === true,
      seoTitle: video.seoTitle || "",
      seoDescription: video.seoDescription || "",
      transcript: video.transcript || "",
      publishedAt: video.publishedAt
        ? new Date(video.publishedAt.seconds ? video.publishedAt.seconds * 1000 : video.publishedAt)
            .toISOString()
            .slice(0, 10)
        : new Date().toISOString().slice(0, 10),
    });
    setThumbnailPreview(video.thumbnail || null);
    setVideoLocalPreview(video.videoUrl || null);
    setThumbnail(null);
    setVideoFile(null);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const titleCheck = validateRequiredText(form.title, "Title", 150);
    if (!titleCheck.ok) return setError(titleCheck.message);
    const descCheck = validateRequiredText(form.description, "Description", 2000);
    if (!descCheck.ok) return setError(descCheck.message);

    if (!editingId && !videoFile) return setError("Please select a video to upload.");
    if (!editingId && !thumbnail) return setError("Please select a thumbnail image.");
    if (thumbnail) {
      const thumbCheck = validateImageFile(thumbnail);
      if (!thumbCheck.ok) return setError(thumbCheck.message);
    }

    setSaving(true);
    try {
      let videoUrl = editingMedia.videoUrl;
      let videoPublicId = editingMedia.videoPublicId;
      let duration = form.duration;

      if (videoFile) {
        setUploading(true);
        setUploadProgress(0);
        const handle = uploadVideoToCloudinary(videoFile, WITNESS_VIDEO_CLOUDINARY_FOLDER, setUploadProgress);
        uploadHandleRef.current = handle;
        const result = await handle.promise;
        uploadHandleRef.current = null;
        setUploading(false);
        videoUrl = result.secure_url;
        videoPublicId = result.public_id;
        duration = result.duration || duration;
      }

      let thumbnailUrl = editingMedia.thumbnail;
      let thumbnailPublicId = editingMedia.thumbnailPublicId;
      if (thumbnail) {
        thumbnailUrl = await uploadImageToCloudinary(thumbnail, WITNESS_THUMBNAIL_CLOUDINARY_FOLDER);
      }

      const payload = {
        title: titleCheck.value,
        description: descCheck.value,
        thumbnail: thumbnailUrl,
        thumbnailPublicId,
        videoUrl,
        videoPublicId,
        duration,
        category: form.category,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        displayOrder: Number(form.displayOrder) || 0,
        isActive: form.isActive,
        featured: form.featured,
        seoTitle: form.seoTitle,
        seoDescription: form.seoDescription,
        transcript: form.transcript,
        publishedAt: form.publishedAt,
      };

      if (editingId) {
        const prevVideoPublicId = editingMedia.videoPublicId;
        const prevThumbPublicId = editingMedia.thumbnailPublicId;
        await adminUpdate("witnessVideos", editingId, payload);
        if (videoFile && prevVideoPublicId) deleteCloudinaryAsset(prevVideoPublicId, "video");
        if (thumbnail && prevThumbPublicId) deleteCloudinaryAsset(prevThumbPublicId, "image");
        addToast({ type: "success", message: "Video updated!" });
      } else {
        await adminCreate("witnessVideos", payload);
        addToast({ type: "success", message: "Video published!" });
      }

      resetForm();
      await load();
    } catch (err) {
      setError(err.message || "Failed to save video.");
      addToast({ type: "error", message: "Failed to save video." });
      setUploading(false);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete with undo ─────────────────────────────────────────────────
  const requestDelete = (video) => {
    setVideos((prev) => prev.filter((v) => v.id !== video.id));
    const timeoutId = setTimeout(async () => {
      try {
        await adminDelete("witnessVideos", video.id);
      } catch {
        addToast({ type: "error", message: "Failed to delete video." });
        load();
      }
      setPendingDelete((cur) => (cur?.video.id === video.id ? null : cur));
    }, 5000);
    setPendingDelete({ video, timeoutId });
  };

  const undoDelete = () => {
    if (!pendingDelete) return;
    clearTimeout(pendingDelete.timeoutId);
    setVideos((prev) => [pendingDelete.video, ...prev]);
    setPendingDelete(null);
  };

  const handleToggle = async (video, field) => {
    const nextValue = !video[field];
    setVideos((prev) => prev.map((v) => (v.id === video.id ? { ...v, [field]: nextValue } : v)));
    try {
      await adminUpdate("witnessVideos", video.id, { [field]: nextValue });
    } catch {
      addToast({ type: "error", message: "Failed to update video." });
      load();
    }
  };

  // ── Bulk actions ─────────────────────────────────────────────────────
  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bulkSetActive = async (isActive) => {
    const ids = [...selected];
    if (!ids.length) return;
    setVideos((prev) => prev.map((v) => (ids.includes(v.id) ? { ...v, isActive } : v)));
    await Promise.all(ids.map((id) => adminUpdate("witnessVideos", id, { isActive }).catch(() => null)));
    setSelected(new Set());
    addToast({ type: "success", message: `${ids.length} video(s) ${isActive ? "activated" : "deactivated"}.` });
  };

  const bulkDelete = async () => {
    const ids = [...selected];
    if (!ids.length) return;
    if (!confirm(`Delete ${ids.length} selected video(s)? This cannot be undone.`)) return;
    setVideos((prev) => prev.filter((v) => !ids.includes(v.id)));
    await Promise.all(ids.map((id) => adminDelete("witnessVideos", id).catch(() => null)));
    setSelected(new Set());
    addToast({ type: "success", message: `${ids.length} video(s) deleted.` });
  };

  // ── Search / filter / sort / paginate ───────────────────────────────
  const filtered = useMemo(() => {
    let list = [...videos];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (v) => v.title?.toLowerCase().includes(q) || v.description?.toLowerCase().includes(q) || v.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    if (categoryFilter !== "all") list = list.filter((v) => v.category === categoryFilter);
    if (statusFilter !== "all") list = list.filter((v) => (statusFilter === "active" ? v.isActive !== false : v.isActive === false));

    const ts = (v) => v.createdAt?.seconds ? v.createdAt.seconds * 1000 : (v.createdAt ? new Date(v.createdAt).getTime() : 0);
    if (sortBy === "newest") list.sort((a, b) => ts(b) - ts(a));
    else if (sortBy === "oldest") list.sort((a, b) => ts(a) - ts(b));
    else if (sortBy === "mostViewed") list.sort((a, b) => (b.views || 0) - (a.views || 0));
    else if (sortBy === "titleAZ") list.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    else if (sortBy === "displayOrder") list.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

    return list;
  }, [videos, search, categoryFilter, statusFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => setPage(1), [search, categoryFilter, statusFilter, sortBy]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        <h1 className="text-4xl font-extrabold text-gray-900 flex items-center gap-3">
          <Video className="text-indigo-600" /> Videos Manager
        </h1>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-3xl shadow-md p-6 md:p-8 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">{editingId ? "Edit Video" : "Upload New Video"}</h2>
            {draftRestored && !editingId && (
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-amber-100 text-amber-700">Draft restored</span>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full p-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-indigo-500 outline-none"
                maxLength={150}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full p-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none bg-white"
              >
                {WITNESS_VIDEO_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full p-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
              maxLength={2000}
              required
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Video File</label>
              <div className={`border-2 border-dashed rounded-2xl p-6 text-center transition ${videoLocalPreview ? "border-indigo-400 bg-indigo-50" : "border-gray-300 hover:border-indigo-400"}`}>
                {videoLocalPreview ? (
                  <div className="space-y-3">
                    <video src={videoLocalPreview} controls className="max-h-48 mx-auto rounded-xl shadow-md" />
                    {!uploading && (
                      <button type="button" onClick={() => { setVideoFile(null); setVideoLocalPreview(editingId ? editingMedia.videoUrl : null); }} className="text-sm text-red-600 font-semibold">
                        Change Video
                      </button>
                    )}
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <UploadCloud className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                    <div className="text-gray-600">Click to select a video</div>
                    <div className="text-xs text-gray-400 mt-1">MP4, MOV, WEBM up to 200MB</div>
                    <input type="file" accept="video/*" onChange={handleVideoChange} className="hidden" />
                  </label>
                )}
              </div>
              {uploading && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-gray-600 mb-1">
                    <span>Uploading… {uploadProgress}%</span>
                    <button type="button" onClick={cancelUpload} className="text-red-600 hover:underline">Cancel</button>
                  </div>
                  <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                    <div className="h-full bg-indigo-600 transition-all" style={{ width: `${uploadProgress}%` }} />
                  </div>
                </div>
              )}
              {(form.duration > 0 || videoFile) && !uploading && (
                <p className="text-xs text-gray-400 mt-2">Duration: {formatDuration(form.duration)}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Thumbnail</label>
              <div className={`border-2 border-dashed rounded-2xl p-6 text-center transition ${thumbnailPreview ? "border-indigo-400 bg-indigo-50" : "border-gray-300 hover:border-indigo-400"}`}>
                {thumbnailPreview ? (
                  <div className="space-y-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={thumbnailPreview} alt="Preview" className="max-h-48 mx-auto rounded-xl shadow-md object-cover" />
                    <button type="button" onClick={() => { setThumbnail(null); setThumbnailPreview(editingId ? editingMedia.thumbnail : null); }} className="text-sm text-red-600 font-semibold">
                      Change Thumbnail
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <UploadCloud className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                    <div className="text-gray-600">Click to select an image</div>
                    <div className="text-xs text-gray-400 mt-1">JPG, PNG up to 5MB</div>
                    <input type="file" accept="image/*" onChange={handleThumbnailChange} className="hidden" />
                  </label>
                )}
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Tags (comma separated)</label>
              <input
                type="text"
                value={form.tags}
                onChange={(e) => setForm({ ...form, tags: e.target.value })}
                placeholder="healing, hope, family"
                className="w-full p-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Publish Date</label>
              <input
                type="date"
                value={form.publishedAt}
                onChange={(e) => setForm({ ...form, publishedAt: e.target.value })}
                className="w-full p-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Display Order</label>
              <input
                type="number"
                value={form.displayOrder}
                onChange={(e) => setForm({ ...form, displayOrder: e.target.value })}
                className="w-full p-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
              />
            </div>
          </div>

          <details className="rounded-xl border border-gray-200 p-4">
            <summary className="cursor-pointer font-semibold text-gray-700 text-sm">Advanced (SEO & Transcript — future-ready)</summary>
            <div className="grid md:grid-cols-2 gap-5 mt-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">SEO Title</label>
                <input type="text" value={form.seoTitle} onChange={(e) => setForm({ ...form, seoTitle: e.target.value })} className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">SEO Description</label>
                <input type="text" value={form.seoDescription} onChange={(e) => setForm({ ...form, seoDescription: e.target.value })} className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Transcript</label>
                <textarea value={form.transcript} onChange={(e) => setForm({ ...form, transcript: e.target.value })} rows={3} className="w-full p-3 border-2 border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
            </div>
          </details>

          <div className="flex flex-wrap items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="w-5 h-5 rounded accent-indigo-600" />
              <span className="text-sm font-semibold text-gray-700">Active</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} className="w-5 h-5 rounded accent-amber-500" />
              <span className="text-sm font-semibold text-gray-700">Featured</span>
            </label>
          </div>

          {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">{error}</div>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving || uploading}
              className="flex-1 py-3.5 rounded-2xl font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {(saving || uploading) && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingId ? "Update Video" : "Publish Video"}
            </button>
            {(editingId || form.title || form.description) && (
              <button type="button" onClick={resetForm} className="px-6 py-3.5 rounded-2xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition">
                {editingId ? "Cancel" : "Clear"}
              </button>
            )}
          </div>
        </form>

        {/* Toolbar */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search videos…"
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-xl bg-white outline-none">
            <option value="all">All Categories</option>
            {WITNESS_VIDEO_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-xl bg-white outline-none">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="px-3 py-2.5 border border-gray-200 rounded-xl bg-white outline-none">
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="mostViewed">Most Viewed</option>
            <option value="titleAZ">Title A–Z</option>
            <option value="displayOrder">Display Order</option>
          </select>
        </div>

        {/* Bulk actions bar */}
        <AnimatePresence>
          {selected.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-indigo-600 text-white rounded-2xl p-4 flex items-center gap-4 shadow-lg"
            >
              <span className="font-semibold">{selected.size} selected</span>
              <button onClick={() => bulkSetActive(true)} className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition text-sm font-semibold">Activate</button>
              <button onClick={() => bulkSetActive(false)} className="px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition text-sm font-semibold">Deactivate</button>
              <button onClick={bulkDelete} className="px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 transition text-sm font-semibold">Delete</button>
              <button onClick={() => setSelected(new Set())} className="ml-auto text-white/80 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Undo delete bar */}
        <AnimatePresence>
          {pendingDelete && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-gray-900 text-white rounded-2xl p-4 flex items-center gap-4 shadow-lg"
            >
              <span>Deleted &quot;{pendingDelete.video.title}&quot;.</span>
              <button onClick={undoDelete} className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 transition text-sm font-semibold">
                <Undo2 className="w-4 h-4" /> Undo
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden">
          {fetching ? (
            <div className="p-8 space-y-3">
              {[0, 1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />)}
            </div>
          ) : paged.length === 0 ? (
            <div className="text-center py-16 text-gray-400">No videos match your filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                  <tr>
                    <th className="p-4 text-left w-10"></th>
                    <th className="p-4 text-left">Video</th>
                    <th className="p-4 text-left">Category</th>
                    <th className="p-4 text-left">Duration</th>
                    <th className="p-4 text-left">Views</th>
                    <th className="p-4 text-left">Status</th>
                    <th className="p-4 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((video) => (
                    <tr key={video.id} className="border-t border-gray-100 hover:bg-gray-50 transition">
                      <td className="p-4">
                        <button onClick={() => toggleSelect(video.id)}>
                          {selected.has(video.id) ? <CheckSquare className="w-5 h-5 text-indigo-600" /> : <Square className="w-5 h-5 text-gray-300" />}
                        </button>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3 min-w-[220px]">
                          <button onClick={() => setPreviewVideo(video)} className="relative w-24 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 group">
                            {video.thumbnail ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={video.thumbnail} alt={video.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-300"><Video className="w-5 h-5" /></div>
                            )}
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                              <PlayCircle className="w-6 h-6 text-white" />
                            </div>
                            {video.featured && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 absolute top-1 right-1" />}
                          </button>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 truncate max-w-[200px]">{video.title}</p>
                            <p className="text-xs text-gray-400 truncate max-w-[200px]">{video.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-gray-600">{video.category}</td>
                      <td className="p-4 text-gray-600">{formatDuration(video.duration)}</td>
                      <td className="p-4 text-gray-600">{(video.views || 0).toLocaleString()}</td>
                      <td className="p-4">
                        <button
                          onClick={() => handleToggle(video, "isActive")}
                          className={`text-xs font-bold px-3 py-1 rounded-full transition ${video.isActive !== false ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}
                        >
                          {video.isActive !== false ? "Active" : "Inactive"}
                        </button>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => startEdit(video)} className="p-2 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition" title="Edit">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => requestDelete(video)} className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm text-gray-600 font-semibold">Page {page} of {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Preview modal */}
      <AnimatePresence>
        {previewVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-6"
            onClick={() => setPreviewVideo(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl overflow-hidden max-w-2xl w-full"
            >
              <video src={previewVideo.videoUrl} controls autoPlay className="w-full max-h-[60vh] bg-black" />
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900">{previewVideo.title}</h3>
                <p className="text-gray-500 mt-1">{previewVideo.description}</p>
                <button onClick={() => setPreviewVideo(null)} className="mt-4 px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 font-semibold text-gray-700">
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
