// Shared, dependency-free constants for the notification system.
// Safe to import from server routes AND client components.
//
// KEEP IN SYNC with the mobile app: D:\Final\app\src\constants\notifications.js
// (category ids, deep-link types and Android channel ids must match exactly).

export const COLLECTIONS = {
  campaigns: "notificationCampaigns",
  deliveries: "notificationDeliveries",
  tokens: "pushTokens",
  preferences: "notification_preferences",
  settings: "notificationSettings",
  rateLimits: "notificationRateLimits",
};

export const CAMPAIGN_STATUSES = ["draft", "scheduled", "queued", "sending", "sent", "failed", "cancelled"];

/** Android notification channel ids created by the mobile app. */
export const CHANNELS = {
  default: "default",
  announcements: "announcements",
  content: "content",
  meetings: "meetings",
  reminders: "reminders",
  personal: "personal",
};

/**
 * `required` categories (personal / account messages) cannot be switched off per category by the
 * user — they are not marketing. The user's master "push alerts" switch and the OS permission are
 * still respected for push delivery, and the message always lands in the inbox.
 * `minIntervalHours` throttles broadcast sends in the same category (admin can override).
 */
export const NOTIFICATION_CATEGORIES = [
  { id: "announcement", label: "Announcements", description: "Important updates from the Faith Frames team", icon: "megaphone-outline", channel: CHANNELS.announcements, defaultPush: true, defaultInApp: true },
  { id: "content", label: "New content", description: "New wallpapers, scripture, stories and resources", icon: "sparkles-outline", channel: CHANNELS.content, defaultPush: true, defaultInApp: true },
  { id: "scripture", label: "Daily scripture", description: "A verse or devotional to start your day", icon: "book-outline", channel: CHANNELS.reminders, defaultPush: true, defaultInApp: true },
  { id: "quiz", label: "Quizzes & events", description: "New quizzes, competitions and results", icon: "bulb-outline", channel: CHANNELS.default, defaultPush: true, defaultInApp: true, minIntervalHours: 6 },
  { id: "meeting", label: "Meetings & reminders", description: "Prayer meetings, live worship and event reminders", icon: "videocam-outline", channel: CHANNELS.meetings, defaultPush: true, defaultInApp: true },
  { id: "engagement", label: "Encouragement", description: "Gentle reminders for your reading goals", icon: "heart-outline", channel: CHANNELS.reminders, defaultPush: false, defaultInApp: true, minIntervalHours: 20 },
  { id: "premium", label: "Premium & offers", description: "Membership benefits and offers", icon: "diamond-outline", channel: CHANNELS.default, defaultPush: true, defaultInApp: true },
  { id: "personal", label: "Personal messages", description: "Private messages sent to you", icon: "mail-outline", channel: CHANNELS.personal, defaultPush: true, defaultInApp: true, required: true },
  { id: "account", label: "Account & billing", description: "Important information about your account", icon: "shield-checkmark-outline", channel: CHANNELS.personal, defaultPush: true, defaultInApp: true, required: true },
];

export const CATEGORY_BY_ID = Object.fromEntries(NOTIFICATION_CATEGORIES.map((c) => [c.id, c]));

export function getCategory(id) {
  return CATEGORY_BY_ID[id] || null;
}

export const PRIORITIES = ["normal", "high"];

export const LIMITS = {
  titleMax: 80,
  bodyMax: 500,
  pushBodyMax: 240,
  actionLabelMax: 30,
  urlMax: 2048,
  maxExplicitUsers: 500,
  maxReminders: 4,
  minReminderMinutes: 5,
  maxReminderMinutes: 7 * 24 * 60,
  /** A send to this many users (or more) needs explicit confirmation. */
  largeAudienceThreshold: 200,
  maxScheduleDays: 366,
  minScheduleLeadMs: 60 * 1000,
};

export const REMINDER_PRESETS = [
  { minutes: 1440, label: "24 hours before" },
  { minutes: 180, label: "3 hours before" },
  { minutes: 60, label: "1 hour before" },
  { minutes: 15, label: "15 minutes before" },
  { minutes: 5, label: "5 minutes before" },
];

export const AUDIENCE_TYPES = ["all", "segment", "users"];

/**
 * Segments are resolved server-side (see segments.js). Add a new entry here and a predicate in
 * segments.js — nothing else in the pipeline needs to change.
 */
export const SEGMENTS = [
  { id: "premium", label: "Premium members", description: "Users with an active paid membership" },
  { id: "free", label: "Free users", description: "Users who have not purchased premium" },
  { id: "new7d", label: "New users (last 7 days)", description: "Accounts created in the past week" },
];
export const SEGMENT_IDS = SEGMENTS.map((s) => s.id);

export const CONTENT_KINDS = ["bible", "jesus", "prayers", "worship"];

/**
 * What a notification can open inside the app. `fields` describes the extra parameters.
 * Must match D:\Final\app\src\constants\notifications.js and utils/notificationLinks.js.
 */
export const DEEP_LINK_TYPES = [
  { id: "none", label: "Open the notification (default)", fields: [] },
  { id: "home", label: "Home", fields: [] },
  { id: "notifications", label: "Notification inbox", fields: [] },
  { id: "wallpaper", label: "A wallpaper", fields: ["id"] },
  { id: "content", label: "Explore Faith content", fields: ["kind", "id"] },
  { id: "dailyVerse", label: "Daily verse", fields: [] },
  { id: "dailyPrayer", label: "Daily prayer", fields: [] },
  { id: "bible", label: "Bible tab", fields: [] },
  { id: "library", label: "Library tab", fields: [] },
  { id: "quiz", label: "Quiz tab", fields: [] },
  { id: "leaderboard", label: "Quiz leaderboard", fields: [] },
  { id: "meetings", label: "Live Worship Room (meetings)", fields: [] },
  { id: "premium", label: "Premium / subscription", fields: [] },
  { id: "url", label: "External link (https)", fields: ["url"] },
];
export const DEEP_LINK_TYPE_IDS = DEEP_LINK_TYPES.map((t) => t.id);

/** Admin-side status labels used by the UI. */
export const STATUS_META = {
  draft: { label: "Draft", tone: "gray" },
  scheduled: { label: "Scheduled", tone: "blue" },
  queued: { label: "Queued", tone: "amber" },
  sending: { label: "Sending", tone: "amber" },
  sent: { label: "Sent", tone: "green" },
  failed: { label: "Failed", tone: "red" },
  cancelled: { label: "Cancelled", tone: "gray" },
};
