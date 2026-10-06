"use client";
import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { uploadImageToCloudinary } from "../../lib/cloudinary";
import { validateImageFile, validateRequiredText } from "../../lib/validation";
import { adminCreate } from "../../lib/adminApi";
import { useToast } from "@/components/ui/Toast";

// Same collection + Cloudinary folder + payload shape as the single-upload form.
const COLLECTION = "religiousWallpapers";
const CLOUDINARY_FOLDER = "faithframes/wallpapers";
const TITLE_MAX = 120;
const CONCURRENCY = 3;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ACCEPT_ATTR = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";

const STATUS_STYLES = {
  pending: "bg-gray-100 text-gray-700",
  uploading: "bg-indigo-100 text-indigo-700",
  uploaded: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};
const STATUS_LABELS = {
  pending: "Pending",
  uploading: "Uploading",
  uploaded: "Uploaded",
  failed: "Failed",
};

let idCounter = 0;
const nextId = () => `bulk-${Date.now()}-${idCounter++}`;

const fileKey = (f) => `${f.name}|${f.size}|${f.lastModified}`;

const titleFromFilename = (name) =>
  name
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, TITLE_MAX);

const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export default function BulkUploadWallpapers({ onUploaded }) {
  const { addToast } = useToast();
  const [items, setItems] = useState([]);
  const [rejected, setRejected] = useState([]);
  const [prefix, setPrefix] = useState("");
  const [running, setRunning] = useState(false);
  const [batchIds, setBatchIds] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [validationMsg, setValidationMsg] = useState("");
  const inputRef = useRef(null);
  const itemsRef = useRef([]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Revoke preview URLs on unmount.
  useEffect(() => {
    return () => {
      itemsRef.current.forEach((it) => URL.revokeObjectURL(it.previewUrl));
    };
  }, []);

  // Warn before leaving the page mid-upload.
  useEffect(() => {
    if (!running) return undefined;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [running]);

  const patch = useCallback((id, changes) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...changes } : it)));
  }, []);

  const addFiles = useCallback((fileList) => {
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;

    const existingKeys = new Set(itemsRef.current.map((it) => fileKey(it.file)));
    const accepted = [];
    const rejects = [];

    for (const file of incoming) {
      const key = fileKey(file);
      if (!ACCEPTED_TYPES.includes(file.type)) {
        rejects.push({ name: file.name, reason: "Unsupported type (use JPG, PNG or WEBP)." });
        continue;
      }
      const sizeCheck = validateImageFile(file);
      if (!sizeCheck.ok) {
        rejects.push({ name: file.name, reason: sizeCheck.message });
        continue;
      }
      if (existingKeys.has(key)) {
        rejects.push({ name: file.name, reason: "Duplicate of a file already in the list." });
        continue;
      }
      existingKeys.add(key);

      const previewUrl = URL.createObjectURL(file);
      const baseTitle = titleFromFilename(file.name);
      const id = nextId();
      accepted.push({
        id,
        file,
        previewUrl,
        baseTitle,
        title: baseTitle,
        width: null,
        height: null,
        status: "pending",
        error: "",
        uploadedUrl: "",
      });
    }

    if (accepted.length) {
      setItems((prev) => [...prev, ...accepted]);
      accepted.forEach((it) => {
        const img = new Image();
        img.onload = () => patch(it.id, { width: img.naturalWidth, height: img.naturalHeight });
        img.src = it.previewUrl;
      });
    }
    setRejected(rejects);
    setValidationMsg("");
  }, [patch]);

  const removeItem = (id) => {
    const target = itemsRef.current.find((it) => it.id === id);
    if (target) URL.revokeObjectURL(target.previewUrl);
    setItems((prev) => prev.filter((it) => it.id !== id));
  };

  const clearAll = () => {
    itemsRef.current.forEach((it) => URL.revokeObjectURL(it.previewUrl));
    setItems([]);
    setRejected([]);
    setBatchIds([]);
    setValidationMsg("");
  };

  const clearUploaded = () => {
    itemsRef.current
      .filter((it) => it.status === "uploaded")
      .forEach((it) => URL.revokeObjectURL(it.previewUrl));
    setItems((prev) => prev.filter((it) => it.status !== "uploaded"));
    setBatchIds([]);
  };

  const applyPrefix = () => {
    const p = prefix.trim();
    setItems((prev) =>
      prev.map((it) =>
        it.status === "uploaded" || it.status === "uploading"
          ? it
          : { ...it, title: (p ? `${p} ${it.baseTitle}` : it.baseTitle).slice(0, TITLE_MAX) }
      )
    );
  };

  // Uploads one item using the same two steps as the single-upload form:
  // Cloudinary upload, then adminCreate("religiousWallpapers", { uri, title }).
  const uploadOne = useCallback(
    async (id) => {
      const item = itemsRef.current.find((it) => it.id === id);
      if (!item) return false;
      patch(id, { status: "uploading", error: "" });
      try {
        let url = item.uploadedUrl;
        if (!url) {
          url = await uploadImageToCloudinary(item.file, CLOUDINARY_FOLDER);
          // Remember the URL so a retry after a database failure doesn't re-upload the image.
          patch(id, { uploadedUrl: url });
        }
        await adminCreate(COLLECTION, { uri: url, title: item.title.trim() });
        patch(id, { status: "uploaded", error: "" });
        return true;
      } catch (err) {
        patch(id, { status: "failed", error: err?.message || "Upload failed." });
        return false;
      }
    },
    [patch]
  );

  const runQueue = useCallback(
    async (ids) => {
      if (!ids.length) return;
      setBatchIds(ids);
      setRunning(true);
      const queue = [...ids];
      let ok = 0;
      let failed = 0;
      const worker = async () => {
        while (queue.length) {
          const id = queue.shift();
          const success = await uploadOne(id);
          if (success) ok += 1;
          else failed += 1;
        }
      };
      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, ids.length) }, worker));
      setRunning(false);
      if (ok > 0) onUploaded?.();
      if (failed === 0) {
        addToast({ type: "success", message: `${ok} wallpaper${ok === 1 ? "" : "s"} uploaded successfully!` });
      } else {
        addToast({
          type: ok > 0 ? "warning" : "error",
          message: `${ok} uploaded, ${failed} failed. You can retry the failed ones.`,
        });
      }
    },
    [uploadOne, onUploaded, addToast]
  );

  const handleUploadAll = () => {
    if (running) return;
    const candidates = itemsRef.current.filter((it) => it.status === "pending" || it.status === "failed");
    if (!candidates.length) {
      setValidationMsg("There are no wallpapers waiting to upload.");
      return;
    }

    // Validate every item up front; valid ones still upload.
    const problems = [];
    const validIds = [];
    for (const it of candidates) {
      const titleCheck = validateRequiredText(it.title, "Title", TITLE_MAX);
      if (!titleCheck.ok) {
        problems.push(`${it.file.name}: ${titleCheck.message}`);
        patch(it.id, { status: "failed", error: titleCheck.message });
      } else {
        validIds.push(it.id);
      }
    }

    if (problems.length) {
      setValidationMsg(
        `${problems.length} wallpaper${problems.length === 1 ? " has" : "s have"} a validation problem and will be skipped. Fix the title and retry.`
      );
    } else {
      setValidationMsg("");
    }
    runQueue(validIds);
  };

  const retryOne = (id) => {
    if (running) return;
    const it = itemsRef.current.find((x) => x.id === id);
    if (!it) return;
    const titleCheck = validateRequiredText(it.title, "Title", TITLE_MAX);
    if (!titleCheck.ok) {
      patch(id, { error: titleCheck.message });
      return;
    }
    runQueue([id]);
  };

  const retryFailed = () => {
    if (running) return;
    const ids = itemsRef.current
      .filter((it) => it.status === "failed" && validateRequiredText(it.title, "Title", TITLE_MAX).ok)
      .map((it) => it.id);
    runQueue(ids);
  };

  const counts = useMemo(() => {
    const c = { pending: 0, uploading: 0, uploaded: 0, failed: 0 };
    items.forEach((it) => {
      c[it.status] += 1;
    });
    return c;
  }, [items]);

  const batchSet = useMemo(() => new Set(batchIds), [batchIds]);
  const batchTotal = batchIds.length;
  const batchDone = items.filter(
    (it) => batchSet.has(it.id) && (it.status === "uploaded" || it.status === "failed")
  ).length;
  const batchPct = batchTotal ? Math.round((batchDone / batchTotal) * 100) : 0;
  const waiting = counts.pending + counts.failed;

  return (
    <div className="mb-12">
      <div className="bg-white border border-gray-200 rounded-3xl shadow-lg p-4 sm:p-6 md:p-10">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Bulk Upload Wallpapers
        </h2>

        {/* Drop zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!running) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (!running) addFiles(e.dataTransfer.files);
          }}
          className={`border-2 border-dashed rounded-2xl p-4 sm:p-8 text-center transition ${
            dragging ? "border-indigo-500 bg-indigo-50" : "border-gray-300 hover:border-indigo-400 hover:bg-gray-50"
          } ${running ? "opacity-60" : ""}`}
        >
          <svg className="w-14 h-14 mx-auto text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <div className="text-gray-600 text-base sm:text-lg">Drag and drop wallpapers here</div>
          <div className="text-sm text-gray-400 mt-1">JPG, PNG or WEBP, up to 5MB each. No limit on the number of files.</div>
          <button
            type="button"
            disabled={running}
            onClick={() => inputRef.current?.click()}
            className="mt-4 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold rounded-xl transition"
          >
            Select Files
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPT_ATTR}
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {/* Rejected files */}
        {rejected.length > 0 && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">
                {rejected.length} file{rejected.length === 1 ? " was" : "s were"} not added
              </span>
              <button type="button" onClick={() => setRejected([])} className="text-amber-700 hover:underline font-semibold">
                Dismiss
              </button>
            </div>
            <ul className="max-h-32 overflow-y-auto space-y-1">
              {rejected.map((r, i) => (
                <li key={`${r.name}-${i}`}>
                  <span className="font-medium">{r.name}</span>: {r.reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        {items.length > 0 && (
          <>
            {/* Apply to all */}
            <div className="mt-6 flex flex-col md:flex-row md:items-end gap-3 bg-gray-50 border border-gray-200 rounded-2xl p-4">
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 mb-1">Apply to all: title prefix (optional)</label>
                <input
                  type="text"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  disabled={running}
                  maxLength={40}
                  placeholder="e.g. Easter"
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-indigo-500 outline-none text-gray-800"
                />
              </div>
              <button
                type="button"
                onClick={applyPrefix}
                disabled={running}
                className="px-5 py-3 bg-white border-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50 disabled:opacity-50 font-semibold rounded-xl transition"
              >
                Apply to all titles
              </button>
              <p className="text-xs text-gray-500 md:max-w-xs">
                Titles start from each file name. Edit any title below to override it.
              </p>
            </div>

            {/* Summary + list actions */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-gray-600 font-medium">
                {items.length} selected · {counts.pending} pending · {counts.uploaded} uploaded · {counts.failed} failed
              </div>
              <div className="flex flex-wrap gap-2">
                {counts.failed > 0 && (
                  <button type="button" onClick={retryFailed} disabled={running} className="px-4 py-2 text-sm bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 font-semibold rounded-lg transition">
                    Retry failed ({counts.failed})
                  </button>
                )}
                {counts.uploaded > 0 && (
                  <button type="button" onClick={clearUploaded} disabled={running} className="px-4 py-2 text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 font-semibold rounded-lg transition">
                    Clear uploaded
                  </button>
                )}
                <button type="button" onClick={clearAll} disabled={running} className="px-4 py-2 text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 font-semibold rounded-lg transition">
                  Clear all
                </button>
              </div>
            </div>

            {/* Overall progress */}
            {batchTotal > 0 && (
              <div className="mt-4">
                <div className="flex justify-between text-sm font-semibold text-gray-700 mb-1">
                  <span>
                    {running ? `Uploading ${Math.min(batchDone + 1, batchTotal)} of ${batchTotal}` : `Finished ${batchDone} of ${batchTotal}`}
                  </span>
                  <span>{batchPct}%</span>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-300" style={{ width: `${batchPct}%` }} />
                </div>
              </div>
            )}

            {validationMsg && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm font-medium">{validationMsg}</div>
            )}

            {/* Item list */}
            <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
              {items.map((it) => {
                const locked = running && (it.status === "uploading" || batchSet.has(it.id));
                return (
                  <div key={it.id} className="flex gap-3 sm:gap-4 p-2 sm:p-3 border border-gray-200 rounded-2xl bg-white">
                    <img
                      src={it.previewUrl}
                      alt={it.file.name}
                      loading="lazy"
                      decoding="async"
                      className="w-16 h-16 sm:w-24 sm:h-24 object-cover rounded-xl flex-shrink-0 bg-gray-100"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate" title={it.file.name}>{it.file.name}</p>
                          <p className="text-xs text-gray-500">
                            {formatSize(it.file.size)}
                            {it.width && it.height ? ` · ${it.width}×${it.height}` : ""}
                          </p>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${STATUS_STYLES[it.status]}`}>
                          {STATUS_LABELS[it.status]}
                        </span>
                      </div>

                      <input
                        type="text"
                        value={it.title}
                        onChange={(e) => patch(it.id, { title: e.target.value })}
                        disabled={locked || it.status === "uploaded"}
                        maxLength={TITLE_MAX}
                        placeholder="Wallpaper title"
                        className="mt-2 w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-indigo-500 outline-none text-sm text-gray-800 disabled:bg-gray-50"
                      />

                      {it.status === "uploading" && (
                        <div className="mt-2 w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full w-full bg-indigo-500 animate-pulse" />
                        </div>
                      )}

                      {it.error && it.status === "failed" && (
                        <p className="mt-2 text-xs text-red-600 font-medium">{it.error}</p>
                      )}

                      <div className="mt-2 flex gap-3">
                        {it.status === "failed" && (
                          <button type="button" onClick={() => retryOne(it.id)} disabled={running} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50">
                            Retry
                          </button>
                        )}
                        <button type="button" onClick={() => removeItem(it.id)} disabled={locked} className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50">
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleUploadAll}
              disabled={running || waiting === 0}
              className={`mt-6 w-full py-4 font-bold rounded-2xl text-lg transition flex items-center justify-center gap-2 ${
                running || waiting === 0
                  ? "bg-gray-400 text-white cursor-not-allowed"
                  : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl"
              }`}
            >
              {running ? "Uploading..." : `Upload All Wallpapers${waiting ? ` (${waiting})` : ""}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
