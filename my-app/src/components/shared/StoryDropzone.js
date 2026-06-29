"use client";
/**
 * StoryDropzone.js
 * ─────────────────
 * Shared image drop-zone used by both the Regular Story and
 * Featured Story upload modules.
 *
 * Props:
 *  onFileSelect(file)  — called when a file is chosen via the <input>
 *  onDrop(event)       — drag-and-drop event handler from useStoryUpload
 *  previewUrl          — blob: URL (or null) from useStoryUpload
 *  onClear()           — clears the preview (from useStoryUpload.clearImage)
 *  disabled            — disables the zone while uploading
 *  label               — field label text (default "Cover Image")
 */
import React from "react";

export function StoryDropzone({
  onFileSelect,
  onDrop,
  previewUrl,
  onClear,
  disabled = false,
  label = "Cover Image",
}) {
  return (
    <div>
      {label && (
        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
          {label}
        </label>
      )}

      <div
        className={`relative rounded-2xl border-2 border-dashed transition-colors ${
          disabled
            ? "border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed"
            : previewUrl
            ? "border-slate-200 bg-white"
            : "border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/20 cursor-pointer"
        }`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={disabled ? undefined : onDrop}
      >
        {previewUrl ? (
          /* ── Preview state ─────────────────────────────────────────── */
          <div className="relative overflow-hidden rounded-2xl">
            <img
              src={previewUrl}
              alt="Cover preview"
              className="w-full object-cover max-h-72 rounded-2xl"
            />
            <button
              type="button"
              onClick={onClear}
              disabled={disabled}
              className="absolute right-3 top-3 rounded-full bg-gray-900/75 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm hover:bg-gray-900 transition disabled:cursor-not-allowed"
            >
              Remove
            </button>
          </div>
        ) : (
          /* ── Empty state ───────────────────────────────────────────── */
          <div className="flex flex-col items-center justify-center gap-2 py-10 px-6 text-center">
            <span className="text-4xl select-none">🖼️</span>
            <p className="text-sm font-semibold text-slate-700 mt-1">
              Drag & drop or click to upload
            </p>
            <p className="text-xs text-slate-400">
              JPEG · PNG · WebP · max 5 MB
            </p>
            <label className="mt-3 cursor-pointer">
              <span className="inline-block px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition">
                Browse file
              </span>
              <input
                type="file"
                accept="image/*"
                disabled={disabled}
                onChange={(e) => onFileSelect(e.target.files?.[0] ?? null)}
                className="sr-only"
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
