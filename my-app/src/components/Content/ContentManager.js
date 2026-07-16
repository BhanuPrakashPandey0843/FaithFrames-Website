"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileQuestion,
  Eye,
  EyeOff,
  Trash2,
  Pencil,
  GripVertical,
  UploadCloud,
  X,
  Loader2,
  Play,
  Image as ImageIcon,
  MessageSquare,
  BookOpen,
  LayoutDashboard,
} from "lucide-react";
import { adminCreate, adminUpdate, adminDelete, fetchAdminContent, reorderAdminItems } from "../../lib/adminApi";
import { uploadImageToCloudinary, uploadVideoToCloudinary, deleteCloudinaryAsset } from "../../lib/cloudinary";
import { validateRequiredText, validateImageFile, validateVideoFile } from "../../lib/validation";
import { useToast } from "@/components/ui/Toast";
import { CONTENT_TYPE_OPTIONS } from "../../lib/adminCollections";

const EMPTY_FORM = {
  title: "",
  description: "",
  category: "",
  contentTypeId: "",
  isActive: true,
  isPremium: false,
  scriptPassage: "",
};

const CONTENT_TYPE_ICONS = {
  story: BookOpen,
  message: MessageSquare,
  image: ImageIcon,
  video: Play,
};

export default function ContentManager({
  title,
  contentCollection,
  thumbnailCloudinaryFolder,
  videoCloudinaryFolder,
  categories,
}) {
  const [items, setItems] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [thumb, setThumb] = useState(null);
  const [thumbPreview, setThumbPreview] = useState(null);
  const [video, setVideo] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingThumbPublicId, setEditingThumbPublicId] = useState("");
  const [editingVideoPublicId, setEditingVideoPublicId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [reordering, setReordering] = useState(false);
  const dragIndexRef = useRef(null);
  const { addToast } = useToast();

  const load = useCallback(async () => {
    setFetching(true);
    try {
      const res = await fetchAdminContent(contentCollection);
      const sorted = (res.items || []).sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
      setItems(sorted);
    } catch (err) {
      addToast({ type: "error", message: "Failed to load content." });
    } finally {
      setFetching(false);
    }
  }, [contentCollection, addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setThumb(null);
    setThumbPreview(null);
    setVideo(null);
    setEditingId(null);
    setEditingThumbPublicId("");
    setEditingVideoPublicId("");
    setError("");
  };

  const handleThumbChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setThumb(file);
    const reader = new FileReader();
    reader.onload = (ev) => setThumbPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleVideoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideo(file);
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditingThumbPublicId(item.thumbnailPublicId || "");
    setEditingVideoPublicId(item.videoPublicId || "");
    setForm({
      title: item.title || "",
      description: item.description || "",
      category: item.category || "",
      contentTypeId: item.contentTypeId || "",
      isActive: item.isActive !== false,
      isPremium: item.isPremium || false,
      scriptPassage: item.scriptPassage || "",
    });
    setThumbPreview(item.thumbnail || null);
    setThumb(null);
    setVideo(null);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const titleCheck = validateRequiredText(form.title, "Title", 120);
    if (!titleCheck.ok) return setError(titleCheck.message);

    if (!editingId || thumb) {
      const tCheck = validateImageFile(thumb);
      if (!tCheck.ok) return setError(tCheck.message);
    }

    const contentType = CONTENT_TYPE_OPTIONS.find((o) => o.value === form.contentTypeId);
    if (contentType?.value === "video" && !editingId && !video) {
      return setError("Please select a video file.");
    }
    if (contentType?.value !== "video" && video) {
      setVideo(null);
    }

    setSaving(true);
    try {
      let thumbnailUrl = editingId ? thumbPreview : null;
      let thumbnailPublicId = editingThumbPublicId;
      let videoUrl = editingId ? items.find((v) => v.id === editingId)?.video || null : null;
      let videoPublicId = editingVideoPublicId;

      if (thumb) {
        thumbnailUrl = await uploadImageToCloudinary(thumb, thumbnailCloudinaryFolder);
      }

      if (video) {
        const upload = await uploadVideoToCloudinary(video, videoCloudinaryFolder);
        videoUrl = upload.url;
        videoPublicId = upload.publicId;
      }

      const payload = {
        title: titleCheck.value,
        description: form.description.trim(),
        category: form.category || null,
        contentTypeId: form.contentTypeId || null,
        thumbnail: thumbnailUrl,
        thumbnailPublicId,
        video: videoUrl,
        videoPublicId,
        isActive: form.isActive,
        isPremium: form.isPremium,
        scriptPassage: form.scriptPassage.trim(),
        displayOrder: editingId
          ? items.find((v) => v.id === editingId)?.displayOrder ?? 0
          : items.length,
      };

      if (editingId) {
        const prevThumbPublicId = editingThumbPublicId;
        const prevVideoPublicId = editingVideoPublicId;
        await adminUpdate(contentCollection, editingId, payload);

        if (thumb && prevThumbPublicId) deleteCloudinaryAsset(prevThumbPublicId, "image");
        if (video && prevVideoPublicId) deleteCloudinaryAsset(prevVideoPublicId, "video");
        addToast({ type: "success", message: "Content updated!" });
      } else {
        await adminCreate(contentCollection, payload);
        addToast({ type: "success", message: "Content added!" });
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err.message || "Failed to save content.");
      addToast({ type: "error", message: "Failed to save content." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    try {
      await adminDelete(contentCollection, item.id);
      if (item.thumbnailPublicId) deleteCloudinaryAsset(item.thumbnailPublicId, "image");
      if (item.videoPublicId) deleteCloudinaryAsset(item.videoPublicId, "video");
      addToast({ type: "success", message: "Content deleted." });
      if (editingId === item.id) resetForm();
      await load();
    } catch (err) {
      addToast({ type: "error", message: "Failed to delete content." });
    }
  };

  const handleToggleActive = async (item) => {
    try {
      await adminUpdate(contentCollection, item.id, { isActive: !item.isActive });
      setItems((prev) => prev.map((v) => (v.id === item.id ? { ...v, isActive: !v.isActive } : v)));
    } catch {
      addToast({ type: "error", message: "Failed to update content status." });
    }
  };

  const handleDragStart = (index) => {
    dragIndexRef.current = index;
  };
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = async (index) => {
    const from = dragIndexRef.current;
    dragIndexRef.current = null;
    if (from === null || from === index) return;

    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(index, 0, moved);
    const reOrdered = next.map((v, i) => ({ ...v, displayOrder: i }));
    setItems(reOrdered);

    setReordering(true);
    try {
      await reorderAdminItems(
        contentCollection,
        reOrdered.map((v) => ({ id: v.id, displayOrder: v.displayOrder }))
      );
    } catch {
      addToast({ type: "error", message: "Failed to save new order." });
      load();
    } finally {
      setReordering(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <h1 className="text-4xl font-extrabold text-gray-900 flex items-center gap-3">
          <FileQuestion className="text-indigo-600" /> {title}
        </h1>
        <p className="text-gray-500 -mt-4">Manage content for this section. Drag items to reorder.</p>

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-3xl shadow-md p-6 md:p-8 space-y-5">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            {editingId ? "Edit Content" : "Add New Content"}
          </h2>

          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Title</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="A powerful message title"
                className="w-full p-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-indigo-500 outline-none text-gray-800"
                maxLength={120}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full p-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-indigo-500 outline-none text-gray-800"
              >
                <option value="">Select a category</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Content Type</label>
              <select
                value={form.contentTypeId}
                onChange={(e) => setForm({ ...form, contentTypeId: e.target.value })}
                className="w-full p-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-indigo-500 outline-none text-gray-800"
              >
                <option value="">Select content type</option>
                {CONTENT_TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Scripture Passage (optional)</label>
              <input
                type="text"
                value={form.scriptPassage}
                onChange={(e) => setForm({ ...form, scriptPassage: e.target.value })}
                placeholder="John 3:16"
                className="w-full p-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-indigo-500 outline-none text-gray-800"
                maxLength={80}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Write a short description about this content..."
              rows={4}
              className="w-full p-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-indigo-500 outline-none text-gray-800 resize-none"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Thumbnail Image (16:9)</label>
              <div className={`border-2 border-dashed rounded-2xl p-6 text-center transition ${thumbPreview ? "border-indigo-400 bg-indigo-50" : "border-gray-300 hover:border-indigo-400"}`}>
                {thumbPreview ? (
                  <div className="space-y-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={thumbPreview} alt="Preview" className="max-h-40 mx-auto rounded-xl shadow-md object-cover" />
                    <button type="button" onClick={() => { setThumb(null); setThumbPreview(null); }} className="text-sm text-red-600 font-semibold hover:text-red-700">
                      Change Image
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <UploadCloud className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                    <div className="text-gray-600">Click to select a thumbnail</div>
                    <div className="text-xs text-gray-400 mt-1">JPG, PNG up to 5MB</div>
                    <input type="file" accept="image/*" onChange={handleThumbChange} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            {(form.contentTypeId === "video" || editingId) && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Video File</label>
                <div className={`border-2 border-dashed rounded-2xl p-6 text-center transition ${video ? "border-indigo-400 bg-indigo-50" : "border-gray-300 hover:border-indigo-400"}`}>
                  {video ? (
                    <div className="space-y-3">
                      <div className="text-sm text-gray-700 font-medium">{video.name}</div>
                      <button type="button" onClick={() => setVideo(null)} className="text-sm text-red-600 font-semibold hover:text-red-700">
                        Change Video
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <Play className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                      <div className="text-gray-600">Click to select a video</div>
                      <div className="text-xs text-gray-400 mt-1">MP4, MOV up to 200MB</div>
                      <input type="file" accept="video/mp4,video/quicktime" onChange={handleVideoChange} className="hidden" />
                    </label>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="w-5 h-5 rounded accent-indigo-600"
              />
              <span className="text-sm font-semibold text-gray-700">Active (visible in app)</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.isPremium}
                onChange={(e) => setForm({ ...form, isPremium: e.target.checked })}
                className="w-5 h-5 rounded accent-amber-600"
              />
              <span className="text-sm font-semibold text-gray-700">Premium (paid content)</span>
            </label>
          </div>

          {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">{error}</div>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3.5 rounded-2xl font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingId ? "Update Content" : "Add Content"}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className="px-6 py-3.5 rounded-2xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition">
                Cancel
              </button>
            )}
          </div>
        </form>

        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            Content ({items.length}) {reordering && <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />}
          </h2>
          {fetching ? (
            <div className="space-y-3">
              {[0,1,2].map((i) => <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />)}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-3xl border border-gray-200 text-gray-400">
              No content yet. Add one above.
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {items.map((item, index) => {
                  const Icon = CONTENT_TYPE_ICONS[item.contentTypeId] || FileQuestion;
                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={handleDragOver}
                      onDrop={() => handleDrop(index)}
                      className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 flex items-center gap-4 cursor-grab active:cursor-grabbing hover:shadow-md transition"
                    >
                      <GripVertical className="w-5 h-5 text-gray-300 flex-shrink-0" />
                      <div className="w-28 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 relative">
                        {item.thumbnail ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <Icon className="w-8 h-8" />
                          </div>
                        )}
                        {item.isPremium && (
                          <div className="absolute top-2 left-2 px-2 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full">
                            PREMIUM
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 truncate">{item.title}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                          {item.category && <span className="px-2 py-0.5 bg-gray-100 rounded-full">{item.category}</span>}
                          <span>{(item.views || 0).toLocaleString()} views</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleActive(item)}
                        title={item.isActive !== false ? "Disable" : "Enable"}
                        className={`p-2 rounded-xl transition ${item.isActive !== false ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"}`}
                      >
                        {item.isActive !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <button onClick={() => startEdit(item)} className="p-2 rounded-xl bg-amber-100 text-amber-700 hover:bg-amber-200 transition">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(item)} className="p-2 rounded-xl bg-red-100 text-red-600 hover:bg-red-200 transition">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
