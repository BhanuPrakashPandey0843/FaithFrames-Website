"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Image,
  UploadCloud,
  Trash2,
  Pencil,
  GripVertical,
  Eye,
  EyeOff,
  X,
  Loader2,
} from "lucide-react";
import { adminCreate, adminUpdate, adminDelete, fetchAdminContent, reorderAdminItems } from "../../lib/adminApi";
import { uploadImageToCloudinary, deleteCloudinaryAsset } from "../../lib/cloudinary";
import { validateImageFile, validateRequiredText } from "../../lib/validation";
import { BIBLE_BANNER_CLOUDINARY_FOLDER } from "../../lib/adminCollections";
import { useToast } from "@/components/ui/Toast";

const EMPTY_FORM = { title: "", subtitle: "", isActive: true };

export default function BibleBannersManager() {
  const [banners, setBanners] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editingImagePublicId, setEditingImagePublicId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [reordering, setReordering] = useState(false);
  const dragIndexRef = useRef(null);
  const { addToast } = useToast();

  const load = useCallback(async () => {
    setFetching(true);
    try {
      const res = await fetchAdminContent("bibleBanners");
      const items = (res.items || []).sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
      setBanners(items);
    } catch (err) {
      addToast({ type: "error", message: "Failed to load Bible banners." });
    } finally {
      setFetching(false);
    }
  }, [addToast]);

  useEffect(() => {
    load();
  }, [load]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setImage(null);
    setImagePreview(null);
    setEditingId(null);
    setEditingImagePublicId("");
    setError("");
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const startEdit = (banner) => {
    setEditingId(banner.id);
    setEditingImagePublicId(banner.imagePublicId || "");
    setForm({ title: banner.title || "", subtitle: banner.subtitle || "", isActive: banner.isActive !== false });
    setImagePreview(banner.image || null);
    setImage(null);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const titleCheck = validateRequiredText(form.title, "Title", 100);
    if (!titleCheck.ok) return setError(titleCheck.message);

    if (!editingId || image) {
      const imageCheck = validateImageFile(image);
      if (!imageCheck.ok) return setError(imageCheck.message);
    }

    setSaving(true);
    try {
      let imageUrl = editingId ? imagePreview : null;
      let imagePublicId = editingImagePublicId;

      if (image) {
        imageUrl = await uploadImageToCloudinary(image, BIBLE_BANNER_CLOUDINARY_FOLDER);
      }

      const payload = {
        title: titleCheck.value,
        subtitle: form.subtitle.trim(),
        image: imageUrl,
        imagePublicId,
        isActive: form.isActive,
        displayOrder: editingId
          ? banners.find((b) => b.id === editingId)?.displayOrder ?? 0
          : banners.length,
      };

      if (editingId) {
        const previousPublicId = editingImagePublicId;
        await adminUpdate("bibleBanners", editingId, payload);
        if (image && previousPublicId) {
          deleteCloudinaryAsset(previousPublicId, "image");
        }
        addToast({ type: "success", message: "Banner updated!" });
      } else {
        await adminCreate("bibleBanners", payload);
        addToast({ type: "success", message: "Banner added!" });
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err.message || "Failed to save banner.");
      addToast({ type: "error", message: "Failed to save banner." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (banner) => {
    if (!confirm(`Delete banner "${banner.title}"? This cannot be undone.`)) return;
    try {
      await adminDelete("bibleBanners", banner.id);
      addToast({ type: "success", message: "Banner deleted." });
      if (editingId === banner.id) resetForm();
      await load();
    } catch (err) {
      addToast({ type: "error", message: "Failed to delete banner." });
    }
  };

  const handleToggleActive = async (banner) => {
    try {
      await adminUpdate("bibleBanners", banner.id, { isActive: !banner.isActive });
      setBanners((prev) => prev.map((b) => (b.id === banner.id ? { ...b, isActive: !b.isActive } : b)));
    } catch {
      addToast({ type: "error", message: "Failed to update banner status." });
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

    const next = [...banners];
    const [moved] = next.splice(from, 1);
    next.splice(index, 0, moved);
    const reOrdered = next.map((b, i) => ({ ...b, displayOrder: i }));
    setBanners(reOrdered);

    setReordering(true);
    try {
      await reorderAdminItems(
        "bibleBanners",
        reOrdered.map((b) => ({ id: b.id, displayOrder: b.displayOrder }))
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
          <Image className="text-purple-600" /> Bible Banners
        </h1>
        <p className="text-gray-500 -mt-4">
          Control the hero banners shown in the Bible section of the app. Drag cards below to reorder.
        </p>

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-3xl shadow-md p-6 md:p-8 space-y-5">
          <h2 className="text-xl font-bold text-gray-900">{editingId ? "Edit Banner" : "Add New Banner"}</h2>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="New Reading Plan Available"
              className="w-full p-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-purple-500 outline-none text-gray-800"
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Subtitle (optional)</label>
            <input
              type="text"
              value={form.subtitle}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              placeholder="Start your journey today"
              className="w-full p-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:border-purple-500 outline-none text-gray-800"
              maxLength={140}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Banner Image (16:9 recommended)</label>
            <div className={`border-2 border-dashed rounded-2xl p-6 text-center transition ${imagePreview ? "border-purple-400 bg-purple-50" : "border-gray-300 hover:border-purple-400"}`}>
              {imagePreview ? (
                <div className="space-y-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="Preview" className="max-h-48 mx-auto rounded-xl shadow-md object-cover" />
                  <button type="button" onClick={() => { setImage(null); setImagePreview(null); }} className="text-sm text-red-600 font-semibold hover:text-red-700">
                    Change Image
                  </button>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <UploadCloud className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                  <div className="text-gray-600">Click to select an image</div>
                  <div className="text-xs text-gray-400 mt-1">JPG, PNG up to 5MB</div>
                  <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                </label>
              )}
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="w-5 h-5 rounded accent-purple-600"
            />
            <span className="text-sm font-semibold text-gray-700">Active (visible in the app)</span>
          </label>

          {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-red-700 text-sm">{error}</div>}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3.5 rounded-2xl font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingId ? "Update Banner" : "Add Banner"}
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
            Banners ({banners.length}) {reordering && <Loader2 className="w-4 h-4 animate-spin text-purple-500" />}
          </h2>
          {fetching ? (
            <div className="space-y-3">
              {[0, 1].map((i) => <div key={i} className="h-28 rounded-2xl bg-gray-100 animate-pulse" />)}
            </div>
          ) : banners.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-3xl border border-gray-200 text-gray-400">
              No banners yet. Add one above.
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {banners.map((banner, index) => (
                  <motion.div
                    key={banner.id}
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
                    <div className="w-28 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                      {banner.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={banner.image} alt={banner.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <Image className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{banner.title}</p>
                      {banner.subtitle && <p className="text-sm text-gray-500 truncate">{banner.subtitle}</p>}
                    </div>
                    <button
                      onClick={() => handleToggleActive(banner)}
                      title={banner.isActive ? "Disable" : "Enable"}
                      className={`p-2 rounded-xl transition ${banner.isActive ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"}`}
                    >
                      {banner.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button onClick={() => startEdit(banner)} className="p-2 rounded-xl bg-amber-100 text-amber-700 hover:bg-amber-200 transition">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(banner)} className="p-2 rounded-xl bg-red-100 text-red-600 hover:bg-red-200 transition">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
