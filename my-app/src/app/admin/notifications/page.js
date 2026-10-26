"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronRight,
  CircleAlert,
  Clock3,
  LoaderCircle,
  Megaphone,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  Users,
  X,
} from "lucide-react";
import Sidebar from "../../../components/Sidebar/Sidebar";
import {
  CAMPAIGN_STATUSES,
  DEEP_LINK_TYPES,
  NOTIFICATION_CATEGORIES,
  SEGMENTS,
  STATUS_META,
} from "../../../lib/notifications/constants";

const defaultTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
const initialForm = () => ({
  title: "",
  body: "",
  category: "announcement",
  priority: "normal",
  imageUrl: "",
  actionLabel: "",
  actionUrl: "",
  deepLinkType: "none",
  deepLinkId: "",
  deepLinkKind: "bible",
  deepLinkUrl: "",
  audienceType: "all",
  segment: "premium",
  onlyWithPush: false,
  scheduleMode: "now",
  scheduleLocal: "",
  timezone: defaultTimezone,
  meetingEnabled: false,
  meetingStarts: "",
  meetingEnds: "",
  meetingTimezone: defaultTimezone,
  meetingLink: "",
  meetingDescription: "",
});

async function readResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || "The request could not be completed.");
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
}

function statusClasses(status) {
  const tone = STATUS_META[status]?.tone;
  return {
    green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    blue: "bg-blue-50 text-blue-700 ring-blue-600/20",
    amber: "bg-amber-50 text-amber-700 ring-amber-600/20",
    red: "bg-rose-50 text-rose-700 ring-rose-600/20",
    gray: "bg-slate-100 text-slate-600 ring-slate-500/20",
  }[tone] || "bg-slate-100 text-slate-600 ring-slate-500/20";
}

function StatCard({ icon: Icon, label, value, note }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
        </div>
        <span className="rounded-xl bg-orange-50 p-3 text-orange-600"><Icon size={20} /></span>
      </div>
      <p className="mt-3 text-xs text-slate-500">{note}</p>
    </div>
  );
}

function FieldError({ children }) {
  return children ? <p className="mt-1.5 text-xs font-medium text-rose-600">{children}</p> : null;
}

function FieldLabel({ children, optional = false }) {
  return (
    <label className="mb-1.5 block text-sm font-medium text-slate-700">
      {children} {optional && <span className="font-normal text-slate-400">· optional</span>}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100";

export default function NotificationsAdminPage() {
  const [form, setForm] = useState(initialForm);
  const [stats, setStats] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sending, setSending] = useState(false);
  const [pageError, setPageError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [audiencePreview, setAudiencePreview] = useState(null);
  const [audienceLoading, setAudienceLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userResults, setUserResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [filters, setFilters] = useState({ q: "", status: "", category: "" });
  const [details, setDetails] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [confirmLarge, setConfirmLarge] = useState(null);
  const [notice, setNotice] = useState("");
  const idempotencyRef = useRef(null);

  const updateForm = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === "category" && value === "personal" ? { audienceType: "users" } : {}),
    }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
    setAudiencePreview(null);
  };

  const loadCampaigns = useCallback(async ({ append = false, nextCursor = null } = {}) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    setPageError("");
    try {
      const params = new URLSearchParams({ limit: "25" });
      if (filters.q.trim().length >= 2) params.set("q", filters.q.trim());
      if (filters.status) params.set("status", filters.status);
      if (filters.category) params.set("category", filters.category);
      if (nextCursor) params.set("cursor", nextCursor);
      const data = await readResponse(await fetch(`/api/admin/notifications?${params}`, { cache: "no-store" }));
      setCampaigns((current) => append ? [...current, ...data.campaigns] : data.campaigns);
      setCursor(data.nextCursor);
      if (!append) setStats(data.stats);
    } catch (error) {
      setPageError(error.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filters]);

  useEffect(() => {
    const timer = setTimeout(() => loadCampaigns(), filters.q ? 250 : 0);
    return () => clearTimeout(timer);
  }, [filters.q, loadCampaigns]);

  useEffect(() => {
    if (form.audienceType !== "users" || userSearch.trim().length < 2) {
      setUserResults([]);
      return undefined;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: userSearch.trim() });
        const result = await readResponse(await fetch(`/api/admin/notifications/audience?${params}`, {
          cache: "no-store",
          signal: controller.signal,
        }));
        setUserResults(result.users);
      } catch (error) {
        if (error.name !== "AbortError") setPageError(error.message);
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [form.audienceType, userSearch]);

  const selectedAudience = useMemo(() => ({
    type: form.audienceType,
    ...(form.audienceType === "segment" ? { segment: form.segment } : {}),
    ...(form.audienceType === "users" ? { userIds: selectedUsers.map((user) => user.id) } : {}),
    onlyWithPush: form.onlyWithPush,
  }), [form.audienceType, form.segment, form.onlyWithPush, selectedUsers]);

  const reviewAudience = async () => {
    setAudienceLoading(true);
    setPageError("");
    try {
      const result = await readResponse(await fetch("/api/admin/notifications/audience", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audience: selectedAudience }),
      }));
      setAudiencePreview(result.audience);
    } catch (error) {
      setPageError(error.message);
    } finally {
      setAudienceLoading(false);
    }
  };

  const makePayload = () => ({
    title: form.title,
    body: form.body,
    category: form.category,
    priority: form.priority,
    imageUrl: form.imageUrl,
    action: form.actionLabel || form.actionUrl
      ? { label: form.actionLabel, url: form.actionUrl }
      : null,
    deepLink: {
      type: form.deepLinkType,
      ...(form.deepLinkType === "wallpaper" ? { id: form.deepLinkId } : {}),
      ...(form.deepLinkType === "content"
        ? { id: form.deepLinkId, kind: form.deepLinkKind }
        : {}),
      ...(form.deepLinkType === "url" ? { url: form.deepLinkUrl } : {}),
    },
    audience: selectedAudience,
    schedule: {
      mode: form.scheduleMode,
      timezone: form.timezone,
      local: form.scheduleLocal,
    },
    ...(form.category === "meeting" && form.meetingEnabled
      ? {
          meeting: {
            startsLocal: form.meetingStarts,
            endsLocal: form.meetingEnds,
            timezone: form.meetingTimezone,
            link: form.meetingLink,
            description: form.meetingDescription,
            reminders: [],
          },
        }
      : {}),
  });

  const submitCampaign = async (payload, idempotencyKey, confirmedLargeAudience = false) => {
    setSending(true);
    setFieldErrors({});
    setPageError("");
    setNotice("");
    try {
      const result = await readResponse(await fetch("/api/admin/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({ ...payload, confirmedLargeAudience }),
      }));
      setNotice(
        result.campaign.status === "queued"
          ? "Notification queued. Delivery is processed in batches; push acceptance is not proof of display."
          : result.campaign.status === "scheduled"
            ? "Notification scheduled successfully."
            : "Draft saved."
      );
      setConfirmLarge(null);
      setForm(initialForm());
      setSelectedUsers([]);
      setAudiencePreview(null);
      idempotencyRef.current = null;
      await loadCampaigns();
    } catch (error) {
      if (error.status === 409 && error.payload?.requiresConfirmation) {
        setConfirmLarge({
          payload,
          idempotencyKey,
          audience: error.payload.audience,
        });
      } else if (error.status === 400 && error.payload?.errors) {
        setFieldErrors(error.payload.errors);
      } else {
        setPageError(error.message);
      }
    } finally {
      setSending(false);
    }
  };

  const handleSubmit = (event, mode) => {
    event.preventDefault();
    if (sending) return;
    const payload = makePayload();
    payload.schedule.mode = mode;
    const fingerprint = JSON.stringify(payload);
    if (idempotencyRef.current?.fingerprint !== fingerprint) {
      idempotencyRef.current = {
        fingerprint,
        key: window.crypto.randomUUID(),
      };
    }
    void submitCampaign(payload, idempotencyRef.current.key);
  };

  const loadDetails = async (id) => {
    setDetailLoading(true);
    setDetails(null);
    try {
      const result = await readResponse(await fetch(`/api/admin/notifications/${encodeURIComponent(id)}`, { cache: "no-store" }));
      setDetails(result);
    } catch (error) {
      setPageError(error.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const updateCampaign = async (id, action) => {
    setSending(true);
    setPageError("");
    try {
      await readResponse(await fetch(`/api/admin/notifications/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      }));
      setNotice(action === "retry" ? "Eligible failed push attempts were queued for retry." : "Scheduled notification cancelled.");
      await loadCampaigns();
      if (details) await loadDetails(id);
    } catch (error) {
      setPageError(error.message);
    } finally {
      setSending(false);
    }
  };

  const duplicateCampaign = (campaign) => {
    const audience = campaign.audience || { type: "all" };
    setForm({
      ...initialForm(),
      title: campaign.title || "",
      body: campaign.body || "",
      category: campaign.category || "announcement",
      priority: campaign.priority || "normal",
      imageUrl: campaign.imageUrl || "",
      actionLabel: campaign.action?.label || "",
      actionUrl: campaign.action?.url || "",
      deepLinkType: campaign.deepLink?.type || "none",
      deepLinkId: campaign.deepLink?.id || "",
      deepLinkKind: campaign.deepLink?.kind || "bible",
      deepLinkUrl: campaign.deepLink?.url || "",
      audienceType: audience.type || "all",
      segment: audience.segment || "premium",
      scheduleMode: "now",
    });
    setSelectedUsers((audience.userIds || []).map((id) => ({ id, name: id, email: "" })));
    setDetails(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const categoryLabel = (id) => NOTIFICATION_CATEGORIES.find((category) => category.id === id)?.label || id;

  return (
    <div className="min-h-screen bg-slate-50 md:flex">
      <Sidebar />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 md:ml-20 md:px-8 md:py-9 lg:ml-64">
        <div className="mx-auto max-w-7xl space-y-8">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">Faith Frames · Admin</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Notifications</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Create private inbox messages, announcements and event alerts. Push delivery depends on device permissions and network availability.
              </p>
            </div>
            <button
              type="button"
              onClick={() => loadCampaigns()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <RefreshCw size={16} /> Refresh
            </button>
          </header>

          {pageError && (
            <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800" role="alert">
              <CircleAlert size={18} className="mt-0.5 shrink-0" />
              <span className="flex-1">{pageError}</span>
              <button onClick={() => setPageError("")} aria-label="Dismiss error"><X size={16} /></button>
            </div>
          )}
          {notice && (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
              <Check size={18} /><span className="flex-1">{notice}</span>
              <button onClick={() => setNotice("")} aria-label="Dismiss message"><X size={16} /></button>
            </div>
          )}

          {stats && (
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Notification statistics">
              <StatCard icon={Bell} label="Campaigns" value={stats.total.toLocaleString()} note={`${stats.sent.toLocaleString()} completed`} />
              <StatCard icon={CalendarClock} label="Sent today" value={stats.sentToday.toLocaleString()} note={`${stats.scheduled.toLocaleString()} scheduled`} />
              <StatCard icon={Users} label="Inbox recipients" value={stats.recipients.toLocaleString()} note="Unique notification inbox entries created" />
              <StatCard icon={Check} label="Push accepted" value={stats.pushAccepted.toLocaleString()} note={`${stats.pushRejected.toLocaleString()} provider errors · accepted does not mean displayed`} />
            </section>
          )}

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
            <form
              onSubmit={(event) => handleSubmit(event, form.scheduleMode)}
              className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"
            >
              <div className="flex items-center gap-3 border-b border-slate-100 pb-5">
                <span className="rounded-xl bg-orange-50 p-2.5 text-orange-600"><Megaphone size={20} /></span>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Compose notification</h2>
                  <p className="text-xs text-slate-500">Content is validated again on the server before it is saved.</p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>Category</FieldLabel>
                  <select className={inputClass} value={form.category} onChange={(event) => updateForm("category", event.target.value)}>
                    {NOTIFICATION_CATEGORIES.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
                  </select>
                  <FieldError>{fieldErrors.category}</FieldError>
                </div>
                <div>
                  <FieldLabel>Priority</FieldLabel>
                  <select className={inputClass} value={form.priority} onChange={(event) => updateForm("priority", event.target.value)}>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div>
                <FieldLabel>Title</FieldLabel>
                <input className={inputClass} maxLength={80} value={form.title} onChange={(event) => updateForm("title", event.target.value)} placeholder="A clear, helpful title" />
                <div className="mt-1 flex justify-between"><FieldError>{fieldErrors.title}</FieldError><span className="text-xs text-slate-400">{form.title.length}/80</span></div>
              </div>
              <div>
                <FieldLabel>Message</FieldLabel>
                <textarea className={`${inputClass} min-h-28 resize-y`} maxLength={500} value={form.body} onChange={(event) => updateForm("body", event.target.value)} placeholder="Write a concise message for your community" />
                <div className="mt-1 flex justify-between"><FieldError>{fieldErrors.body}</FieldError><span className="text-xs text-slate-400">{form.body.length}/500</span></div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel optional>Image URL</FieldLabel>
                  <input className={inputClass} type="url" value={form.imageUrl} onChange={(event) => updateForm("imageUrl", event.target.value)} placeholder="https://…" />
                  <FieldError>{fieldErrors.imageUrl}</FieldError>
                </div>
                <div className="flex items-end gap-3">
                  <label className="flex w-full items-center gap-3 rounded-xl border border-slate-200 px-3.5 py-3 text-sm text-slate-700">
                    <input type="checkbox" checked={form.onlyWithPush} onChange={(event) => updateForm("onlyWithPush", event.target.checked)} className="accent-orange-600" />
                    Target opted-in push users only
                  </label>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Recipients</h3>
                    <p className="mt-1 text-xs text-slate-500">User preferences and valid device tokens are checked during processing.</p>
                  </div>
                  <button type="button" onClick={reviewAudience} disabled={audienceLoading} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-60">
                    {audienceLoading ? <LoaderCircle size={14} className="animate-spin" /> : <Users size={14} />} Review audience
                  </button>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  {[
                    ["all", "All users"],
                    ["segment", "A segment"],
                    ["users", "Selected users"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => updateForm("audienceType", value)}
                      disabled={form.category === "personal" && value !== "users"}
                      className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                        form.audienceType === value ? "border-orange-300 bg-orange-50 text-orange-700" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      } disabled:cursor-not-allowed disabled:opacity-40`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {form.audienceType === "segment" && (
                  <select className={`${inputClass} mt-3`} value={form.segment} onChange={(event) => updateForm("segment", event.target.value)}>
                    {SEGMENTS.map((segment) => <option key={segment.id} value={segment.id}>{segment.label}</option>)}
                  </select>
                )}
                {form.audienceType === "users" && (
                  <div className="mt-3 space-y-3">
                    <div className="relative">
                      <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                      <input className={`${inputClass} pl-9`} value={userSearch} onChange={(event) => setUserSearch(event.target.value)} placeholder="Search by account name or email" />
                    </div>
                    {userResults.length > 0 && (
                      <div className="max-h-48 overflow-auto rounded-xl border border-slate-200 bg-white">
                        {userResults.map((user) => (
                          <button key={user.id} type="button" onClick={() => {
                            if (!selectedUsers.some((selected) => selected.id === user.id)) {
                              setSelectedUsers((current) => [...current, user]);
                              setAudiencePreview(null);
                            }
                            setUserSearch("");
                          }} className="flex w-full items-center justify-between border-b border-slate-100 px-3 py-2.5 text-left last:border-b-0 hover:bg-slate-50">
                            <span><span className="block text-sm font-medium text-slate-800">{user.name || "Unnamed user"}</span><span className="text-xs text-slate-500">{user.email}</span></span>
                            <ChevronRight size={15} className="text-slate-400" />
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {selectedUsers.map((user) => (
                        <span key={user.id} className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-800">
                          {user.name || user.id}
                          <button type="button" onClick={() => {
                            setSelectedUsers((current) => current.filter((selected) => selected.id !== user.id));
                            setAudiencePreview(null);
                          }} aria-label={`Remove ${user.name || user.id}`}><X size={13} /></button>
                        </span>
                      ))}
                    </div>
                    <FieldError>{fieldErrors.audience}</FieldError>
                  </div>
                )}
                {audiencePreview && (
                  <p className="mt-3 rounded-lg bg-white px-3 py-2 text-xs leading-5 text-slate-600">
                    Audience: <strong>{audiencePreview.total.toLocaleString()} users</strong>
                    {audiencePreview.devices !== undefined && <> · {audiencePreview.devices.toLocaleString()} registered device tokens (not a delivery guarantee)</>}
                    {audiencePreview.exact === false && " · segment size is approximate"}
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-100 p-4 sm:p-5">
                <div className="flex items-center gap-2">
                  <MessageSquare size={17} className="text-orange-600" />
                  <h3 className="text-sm font-semibold text-slate-900">Action & destination</h3>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel optional>Button label</FieldLabel>
                    <input className={inputClass} maxLength={30} value={form.actionLabel} onChange={(event) => updateForm("actionLabel", event.target.value)} placeholder="Read more" />
                  </div>
                  <div>
                    <FieldLabel optional>Button URL (https)</FieldLabel>
                    <input className={inputClass} type="url" value={form.actionUrl} onChange={(event) => updateForm("actionUrl", event.target.value)} placeholder="https://…" />
                    <FieldError>{fieldErrors.action}</FieldError>
                  </div>
                  <div className="sm:col-span-2">
                    <FieldLabel>Open in the app</FieldLabel>
                    <select className={inputClass} value={form.deepLinkType} onChange={(event) => updateForm("deepLinkType", event.target.value)}>
                      {DEEP_LINK_TYPES.map((link) => <option key={link.id} value={link.id}>{link.label}</option>)}
                    </select>
                  </div>
                  {(form.deepLinkType === "wallpaper" || form.deepLinkType === "content") && (
                    <div className="sm:col-span-2">
                      {form.deepLinkType === "content" && (
                        <div className="mb-3">
                          <FieldLabel>Content section</FieldLabel>
                          <select className={inputClass} value={form.deepLinkKind} onChange={(event) => updateForm("deepLinkKind", event.target.value)}>
                            <option value="bible">Bible</option><option value="jesus">Jesus</option><option value="prayers">Prayers</option><option value="worship">Worship</option>
                          </select>
                        </div>
                      )}
                      <FieldLabel>Content ID</FieldLabel>
                      <input className={inputClass} value={form.deepLinkId} onChange={(event) => updateForm("deepLinkId", event.target.value)} placeholder="Paste the content document ID" />
                      <FieldError>{fieldErrors.deepLink}</FieldError>
                    </div>
                  )}
                  {form.deepLinkType === "url" && (
                    <div className="sm:col-span-2">
                      <FieldLabel>Destination URL (https)</FieldLabel>
                      <input className={inputClass} type="url" value={form.deepLinkUrl} onChange={(event) => updateForm("deepLinkUrl", event.target.value)} placeholder="https://…" />
                      <FieldError>{fieldErrors.deepLink}</FieldError>
                    </div>
                  )}
                </div>
              </div>

              {form.category === "meeting" && (
                <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 sm:p-5">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <input type="checkbox" checked={form.meetingEnabled} onChange={(event) => updateForm("meetingEnabled", event.target.checked)} className="accent-orange-600" />
                    Add meeting details
                  </label>
                  {form.meetingEnabled && (
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div><FieldLabel>Starts at (local time)</FieldLabel><input className={inputClass} type="datetime-local" value={form.meetingStarts} onChange={(event) => updateForm("meetingStarts", event.target.value)} /></div>
                      <div><FieldLabel optional>Ends at (local time)</FieldLabel><input className={inputClass} type="datetime-local" value={form.meetingEnds} onChange={(event) => updateForm("meetingEnds", event.target.value)} /></div>
                      <div><FieldLabel>Time zone</FieldLabel><input className={inputClass} value={form.meetingTimezone} onChange={(event) => updateForm("meetingTimezone", event.target.value)} placeholder="Asia/Kolkata" /></div>
                      <div><FieldLabel optional>Meeting link (https)</FieldLabel><input className={inputClass} type="url" value={form.meetingLink} onChange={(event) => {
                        updateForm("meetingLink", event.target.value);
                        if (!form.actionLabel) setForm((current) => ({ ...current, actionLabel: "Join Meeting" }));
                        if (!form.actionUrl) setForm((current) => ({ ...current, actionUrl: event.target.value }));
                      }} placeholder="https://…" /></div>
                      <div className="sm:col-span-2"><FieldLabel optional>Description</FieldLabel><textarea className={`${inputClass} min-h-20`} maxLength={300} value={form.meetingDescription} onChange={(event) => updateForm("meetingDescription", event.target.value)} /></div>
                      <FieldError>{fieldErrors.meeting}</FieldError>
                      <p className="sm:col-span-2 text-xs leading-5 text-slate-500">Meeting links are saved only in each recipient’s private inbox; they are excluded from push payloads.</p>
                    </div>
                  )}
                </div>
              )}

              <div className="rounded-2xl border border-slate-100 p-4 sm:p-5">
                <div className="flex items-center gap-2">
                  <Clock3 size={17} className="text-orange-600" />
                  <h3 className="text-sm font-semibold text-slate-900">Delivery timing</h3>
                </div>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel>When</FieldLabel>
                    <select className={inputClass} value={form.scheduleMode} onChange={(event) => updateForm("scheduleMode", event.target.value)}>
                      <option value="now">Send now</option><option value="later">Schedule</option><option value="draft">Save draft</option>
                    </select>
                  </div>
                  <div><FieldLabel>Time zone</FieldLabel><input className={inputClass} value={form.timezone} onChange={(event) => updateForm("timezone", event.target.value)} /></div>
                  {form.scheduleMode === "later" && (
                    <div className="sm:col-span-2">
                      <FieldLabel>Scheduled local date & time</FieldLabel>
                      <input className={inputClass} type="datetime-local" value={form.scheduleLocal} onChange={(event) => updateForm("scheduleLocal", event.target.value)} />
                      <FieldError>{fieldErrors.schedule}</FieldError>
                      <p className="mt-1.5 text-xs text-slate-500">The server converts this wall-clock time using the selected IANA time zone.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  disabled={sending}
                  onClick={(event) => handleSubmit(event, "draft")}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Save draft
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 disabled:cursor-wait disabled:opacity-70"
                >
                  {sending ? <LoaderCircle size={16} className="animate-spin" /> : form.scheduleMode === "later" ? <CalendarClock size={16} /> : <Send size={16} />}
                  {form.scheduleMode === "later" ? "Schedule notification" : "Send notification"}
                </button>
              </div>
            </form>

            <aside className="space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-slate-900">Phone preview</h2>
                    <p className="mt-1 text-xs text-slate-500">Personalized names may appear in the final message.</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">{categoryLabel(form.category)}</span>
                </div>
                <div className="mx-auto max-w-sm rounded-[2rem] border-[7px] border-slate-900 bg-slate-950 p-3 shadow-xl">
                  <div className="mx-auto mb-4 h-1 w-20 rounded-full bg-slate-700" />
                  <div className="rounded-2xl bg-white p-4 shadow-lg">
                    <div className="flex items-center gap-2.5">
                      <span className="rounded-lg bg-orange-100 p-2 text-orange-700"><Bell size={16} /></span>
                      <div className="min-w-0 flex-1"><p className="text-xs font-semibold text-slate-900">Faith Frames</p><p className="text-[10px] text-slate-400">now</p></div>
                      {form.priority === "high" && <span className="text-[10px] font-semibold uppercase text-orange-600">Important</span>}
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-900">{form.title || "Your notification title"}</p>
                    <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-slate-600">{form.body || "Your message preview will appear here."}</p>
                    {form.actionLabel && <div className="mt-3 border-t border-slate-100 pt-2 text-xs font-semibold text-blue-600">{form.actionLabel}</div>}
                  </div>
                  <div className="pb-2 pt-5 text-center text-[10px] text-slate-500">Faith Frames · notification preview</div>
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <div className="flex gap-3">
                  <CircleAlert size={18} className="mt-0.5 shrink-0 text-amber-700" />
                  <div>
                    <h3 className="text-sm font-semibold text-amber-900">Delivery status is measured carefully</h3>
                    <p className="mt-1 text-xs leading-5 text-amber-800">
                      “Accepted” means the push provider accepted a request. A provider receipt means it handed it to FCM/APNs; neither proves the phone displayed or the user saw it. Inbox reads and opens are tracked separately.
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Campaign history</h2>
                <p className="mt-1 text-sm text-slate-500">Search titles, filter by category or processing status.</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="relative">
                  <Search size={15} className="absolute left-3 top-3 text-slate-400" />
                  <input className={`${inputClass} pl-9`} value={filters.q} onChange={(event) => setFilters((current) => ({ ...current, q: event.target.value }))} placeholder="Search titles" />
                </div>
                <select className={inputClass} value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}>
                  <option value="">All categories</option>
                  {NOTIFICATION_CATEGORIES.map((category) => <option key={category.id} value={category.id}>{category.label}</option>)}
                </select>
                <select className={inputClass} value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}>
                  <option value="">All statuses</option>
                  {CAMPAIGN_STATUSES.map((status) => <option key={status} value={status}>{STATUS_META[status]?.label || status}</option>)}
                </select>
              </div>
            </div>
            {loading ? (
              <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500"><LoaderCircle size={18} className="animate-spin" /> Loading notification history…</div>
            ) : campaigns.length === 0 ? (
              <div className="p-12 text-center">
                <Bell size={28} className="mx-auto text-slate-300" />
                <p className="mt-3 text-sm font-medium text-slate-700">No campaigns found</p>
                <p className="mt-1 text-xs text-slate-500">Create a notification or adjust your filters.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {campaigns.map((campaign) => (
                  <div key={campaign.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="max-w-xl truncate text-sm font-semibold text-slate-900">{campaign.title}</h3>
                        <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset ${statusClasses(campaign.status)}`}>{STATUS_META[campaign.status]?.label || campaign.status}</span>
                      </div>
                      <p className="mt-1 line-clamp-1 text-xs text-slate-500">{campaign.body}</p>
                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-400">
                        <span>{categoryLabel(campaign.category)}</span><span>{campaign.audience?.type === "users" ? `${campaign.audience.userIds?.length || 0} selected users` : campaign.audience?.type === "segment" ? `${campaign.audience.segment} segment` : "All users"}</span><span>{formatDate(campaign.sentAt || campaign.scheduledFor || campaign.createdAt)}</span><span>{campaign.stats?.inboxCreated || 0} inbox entries</span>
                      </div>
                    </div>
                    <button type="button" onClick={() => loadDetails(campaign.id)} className="inline-flex items-center gap-1 self-start rounded-lg px-3 py-2 text-xs font-semibold text-orange-700 hover:bg-orange-50 sm:self-center">
                      View details <ChevronRight size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {cursor && (
              <div className="border-t border-slate-100 p-4 text-center">
                <button type="button" disabled={loadingMore} onClick={() => loadCampaigns({ append: true, nextCursor: cursor })} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                  {loadingMore ? <LoaderCircle size={15} className="animate-spin" /> : <ChevronDown size={15} />} Load more
                </button>
              </div>
            )}
          </section>
        </div>
      </main>

      {confirmLarge && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="large-audience-title">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <span className="rounded-xl bg-amber-100 p-2.5 text-amber-700"><Users size={20} /></span>
              <button onClick={() => setConfirmLarge(null)} aria-label="Close confirmation" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
            </div>
            <h2 id="large-audience-title" className="mt-4 text-lg font-semibold text-slate-900">Confirm large audience</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              This campaign targets <strong>{confirmLarge.audience.total.toLocaleString()} users</strong>. Their preferences and valid tokens are checked before delivery. Continue?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setConfirmLarge(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">Go back</button>
              <button
                disabled={sending}
                onClick={() => submitCampaign(confirmLarge.payload, confirmLarge.idempotencyKey, true)}
                className="rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60"
              >
                {sending ? "Queuing…" : "Confirm and queue"}
              </button>
            </div>
          </div>
        </div>
      )}

      {(details || detailLoading) && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-label="Notification campaign details">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between">
              <div><p className="text-xs font-semibold uppercase tracking-wider text-orange-600">Campaign detail</p><h2 className="mt-1 text-xl font-semibold text-slate-900">{details?.campaign?.title || "Loading…"}</h2></div>
              <button onClick={() => setDetails(null)} aria-label="Close details" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X size={18} /></button>
            </div>
            {detailLoading || !details ? (
              <div className="flex justify-center p-12"><LoaderCircle size={22} className="animate-spin text-orange-600" /></div>
            ) : (
              <>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">{details.campaign.body}</p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {[
                    ["Campaign status", STATUS_META[details.campaign.status]?.label || details.campaign.status],
                    ["Category", categoryLabel(details.campaign.category)],
                    ["Created by", details.campaign.createdBy || "—"],
                    ["Created", formatDate(details.campaign.createdAt)],
                    ["Scheduled", formatDate(details.campaign.scheduledFor)],
                    ["Sent", formatDate(details.campaign.sentAt)],
                  ].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-sm font-medium text-slate-800">{value}</p></div>)}
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    ["Inbox entries", details.delivery.inbox],
                    ["Push accepted", details.delivery.accepted],
                    ["Provider handoff", details.delivery.providerHandedOff],
                    ["Read / opened", `${details.delivery.read} / ${details.delivery.opened}`],
                  ].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 p-3"><p className="text-xl font-semibold text-slate-900">{value}</p><p className="mt-1 text-[11px] text-slate-500">{label}</p></div>)}
                </div>
                <p className="mt-4 text-xs leading-5 text-slate-500">
                  Push accepted means Expo accepted a ticket. Provider handoff is a receipt that Expo passed it to APNs/FCM; neither proves that a device displayed it.
                  {details.delivery.failed > 0 && ` ${details.delivery.failed} push attempts failed.`}
                </p>
                <div className="mt-6 flex flex-wrap justify-end gap-2">
                  <button onClick={() => duplicateCampaign(details.campaign)} className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Use as template</button>
                  {details.campaign.status === "scheduled" && <button disabled={sending} onClick={() => updateCampaign(details.campaign.id, "cancel")} className="rounded-xl border border-rose-200 px-3.5 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60">Cancel schedule</button>}
                  {(details.delivery.retryable > 0 || (details.campaign.status === "failed" && details.campaign.lastError)) && <button disabled={sending} onClick={() => updateCampaign(details.campaign.id, "retry")} className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60"><RefreshCw size={14} /> {details.delivery.retryable > 0 ? `Retry ${details.delivery.retryable} eligible` : "Retry processing"}</button>}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
