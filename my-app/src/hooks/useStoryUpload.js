"use client";
/**
 * useStoryUpload.js
 * ─────────────────
 * Shared hook for story image upload state across both
 * UploadStories (regular) and UploadFeaturedStory (featured) modules.
 *
 * Manages:
 *  • imageFile / previewUrl state
 *  • upload progress animation
 *  • loading guard
 *  • drag-and-drop handlers
 *  • blob URL cleanup on unmount
 */
import { useState, useEffect, useCallback, useRef } from "react";

export function useStoryUpload() {
  const [imageFile,      setImageFile]     = useState(null);
  const [previewUrl,     setPreviewUrl]    = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [loading,        setLoading]        = useState(false);

  // Stable ref so clearImage can revoke without a stale closure.
  const previewUrlRef = useRef(previewUrl);
  useEffect(() => { previewUrlRef.current = previewUrl; }, [previewUrl]);

  // Animate the progress bar while a Cloudinary upload is in flight.
  useEffect(() => {
    if (!loading) return undefined;
    setUploadProgress(10);
    let progress = 10;
    const interval = setInterval(() => {
      progress = Math.min(progress + 12, 90);
      setUploadProgress(progress);
    }, 180);
    return () => clearInterval(interval);
  }, [loading]);

  // Revoke any existing object URL to prevent memory leaks.
  const clearImage = useCallback(() => {
    if (previewUrlRef.current?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    setImageFile(null);
    setPreviewUrl(null);
  }, []);

  // Select a new file — revoke old blob first.
  const handleFileSelect = useCallback(
    (file) => {
      if (!file) return;
      clearImage();
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    },
    [clearImage]
  );

  // Native drag-drop event handler.
  const handleDrop = useCallback(
    (event) => {
      event.preventDefault();
      handleFileSelect(event.dataTransfer?.files?.[0] ?? null);
    },
    [handleFileSelect]
  );

  // Call immediately before the async upload begins.
  const beginUpload = useCallback(() => {
    setLoading(true);
  }, []);

  // Call after the async upload resolves (success or error).
  const finishUpload = useCallback(() => {
    setUploadProgress(100);
    window.setTimeout(() => setUploadProgress(0), 600);
    setLoading(false);
  }, []);

  // Revoke on unmount.
  useEffect(() => {
    return () => {
      if (previewUrlRef.current?.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  return {
    imageFile,
    previewUrl,
    uploadProgress,
    loading,
    clearImage,
    handleFileSelect,
    handleDrop,
    beginUpload,
    finishUpload,
  };
}
