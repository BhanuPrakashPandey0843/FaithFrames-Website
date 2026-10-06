"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Bell, Send, X, Info } from "lucide-react";
import {
  DEFAULT_REMINDER_MESSAGE,
  DEFAULT_REMINDER_TITLE,
  REMINDER_COOLDOWN_HOURS,
  REMINDER_MESSAGE_MAX,
  REMINDER_TITLE_MAX,
} from "../../lib/reminderConfig";

function firstName(name) {
  return String(name || "").trim().split(/\s+/)[0] || "Friend";
}

/**
 * Compose + confirm dialog for subscription reminders.
 * Mount it only while it should be open (state resets on every mount).
 *
 * recipients: users (with lastReminderAt) the reminder is addressed to
 * onSend({ title, message, force }, onProgress): performs the send; throw to show an error
 * onClose(): close without sending
 */
export default function ReminderModal({ recipients, onClose, onSend }) {
  const [title, setTitle] = useState(DEFAULT_REMINDER_TITLE);
  const [message, setMessage] = useState(DEFAULT_REMINDER_MESSAGE);
  const [force, setForce] = useState(false);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");

  const recentlyReminded = useMemo(() => {
    const cooldownMs = REMINDER_COOLDOWN_HOURS * 60 * 60 * 1000;
    const now = Date.now();
    return recipients.filter((u) => u.lastReminderAt && now - Date.parse(u.lastReminderAt) < cooldownMs).length;
  }, [recipients]);

  const willSend = force ? recipients.length : recipients.length - recentlyReminded;
  const canSend = !sending && title.trim() !== "" && message.trim() !== "" && willSend > 0;
  const previewName = firstName(recipients[0]?.name);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !sending) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sending, onClose]);

  const handleSend = async () => {
    setSending(true);
    setError("");
    setProgress(null);
    try {
      await onSend({ title, message, force }, (done, total) => setProgress({ done, total }));
    } catch (err) {
      setError(err.message || "Failed to send reminders.");
      setSending(false);
    }
  };

  const names = recipients.slice(0, 3).map((u) => u.name || u.email || "Unnamed user");
  const extra = recipients.length - names.length;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={() => !sending && onClose()}
        aria-hidden="true"
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reminder-dialog-title"
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl border border-gray-100"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 id="reminder-dialog-title" className="text-lg font-extrabold text-gray-900">
                Send subscription reminder
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                To {names.join(", ")}
                {extra > 0 ? ` and ${extra.toLocaleString()} more` : ""} ({recipients.length.toLocaleString()}{" "}
                {recipients.length === 1 ? "user" : "users"})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            aria-label="Close"
            className="p-2 -mr-2 -mt-1 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-40 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 space-y-4">
          {/* Fields */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="reminder-title" className="text-xs font-bold text-gray-400 uppercase">
                Title
              </label>
              <span className="text-[11px] text-gray-400">
                {title.length}/{REMINDER_TITLE_MAX}
              </span>
            </div>
            <input
              id="reminder-title"
              type="text"
              value={title}
              maxLength={REMINDER_TITLE_MAX}
              onChange={(e) => setTitle(e.target.value)}
              disabled={sending}
              autoFocus
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-800 focus:ring-2 focus:ring-indigo-400 focus:outline-none disabled:opacity-60"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="reminder-message" className="text-xs font-bold text-gray-400 uppercase">
                Message
              </label>
              <span className="text-[11px] text-gray-400">
                {message.length}/{REMINDER_MESSAGE_MAX}
              </span>
            </div>
            <textarea
              id="reminder-message"
              rows={4}
              value={message}
              maxLength={REMINDER_MESSAGE_MAX}
              onChange={(e) => setMessage(e.target.value)}
              disabled={sending}
              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:ring-2 focus:ring-indigo-400 focus:outline-none resize-none disabled:opacity-60"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Use <code className="font-mono bg-gray-100 rounded px-1">{"{name}"}</code> to insert each
              user&apos;s first name.
            </p>
          </div>

          {/* Preview */}
          <div>
            <span className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Preview in the app</span>
            <div className="flex gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="w-10 h-10 flex-shrink-0 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Bell className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 break-words">
                  {title.replaceAll("{name}", previewName) || "—"}
                </p>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed break-words">
                  {message.replaceAll("{name}", previewName) || "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Cooldown notice */}
          {recentlyReminded > 0 && (
            <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <p>
                  {recentlyReminded.toLocaleString()} of these {recentlyReminded === 1 ? "user was" : "users were"}{" "}
                  already reminded in the last {REMINDER_COOLDOWN_HOURS} hours and will be skipped.
                </p>
                <label className="flex items-center gap-2 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={force}
                    onChange={(e) => setForce(e.target.checked)}
                    disabled={sending}
                    className="rounded border-amber-300"
                  />
                  Send to them anyway
                </label>
              </div>
            </div>
          )}

          <p className="text-[11px] text-gray-400">
            Delivered to the Notifications screen in the app. Users who switched off &quot;Premium Content&quot;
            notifications are skipped.
          </p>

          {error && (
            <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 pt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={sending}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <Send className="w-4 h-4" />
            {sending
              ? progress
                ? `Sending ${progress.done.toLocaleString()}/${progress.total.toLocaleString()}…`
                : "Sending…"
              : `Send to ${willSend.toLocaleString()} ${willSend === 1 ? "user" : "users"}`}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
