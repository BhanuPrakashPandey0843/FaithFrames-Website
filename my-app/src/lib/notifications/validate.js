// Server-side validation + normalisation of notification composer input.
// Never trust the browser: every admin endpoint runs input through validateCampaignInput().

import {
  AUDIENCE_TYPES,
  CONTENT_KINDS,
  DEEP_LINK_TYPE_IDS,
  LIMITS,
  PRIORITIES,
  SEGMENT_IDS,
  getCategory,
} from "./constants.js";
import {
  isValidLocalDateTime,
  isValidTimeZone,
  zonedLocalToUtcMs,
} from "./time.js";

const ID_RE = /^[A-Za-z0-9_-]{1,128}$/;
// Control characters (except \n and \t in the body) are stripped; they can break notification rendering.
const CONTROL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g;

export function cleanLine(value, max) {
  return String(value ?? "")
    .replace(CONTROL_RE, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function cleanMultiline(value, max) {
  return String(value ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(CONTROL_RE, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
}

/** https only, no credentials, sane length. Returns the normalised href or null. */
export function normalizeHttpsUrl(value) {
  const raw = String(value ?? "").trim();
  if (!raw || raw.length > LIMITS.urlMax) return null;
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  if (parsed.username || parsed.password) return null;
  if (!parsed.hostname || !parsed.hostname.includes(".")) return null;
  return parsed.href;
}

export function isValidId(value) {
  return typeof value === "string" && ID_RE.test(value);
}

function validateDeepLink(input, errors) {
  const raw = input && typeof input === "object" ? input : {};
  const type = String(raw.type || "none");
  if (!DEEP_LINK_TYPE_IDS.includes(type)) {
    errors.deepLink = "Unknown destination.";
    return { type: "none" };
  }
  const link = { type };
  if (type === "wallpaper") {
    if (!isValidId(raw.id)) errors.deepLink = "Choose the wallpaper to open.";
    else link.id = raw.id;
  } else if (type === "content") {
    if (!CONTENT_KINDS.includes(raw.kind)) errors.deepLink = "Choose a content section.";
    else if (!isValidId(raw.id)) errors.deepLink = "Choose the content item to open.";
    else {
      link.kind = raw.kind;
      link.id = raw.id;
    }
  } else if (type === "url") {
    const url = normalizeHttpsUrl(raw.url);
    if (!url) errors.deepLink = "Enter a valid https:// link.";
    else link.url = url;
  }
  return link;
}

function validateAudience(input, category, errors) {
  const raw = input && typeof input === "object" ? input : {};
  const type = String(raw.type || "");
  if (!AUDIENCE_TYPES.includes(type)) {
    errors.audience = "Choose who should receive this notification.";
    return { type: "all", onlyWithPush: false };
  }
  const audience = { type, onlyWithPush: raw.onlyWithPush === true };

  if (type === "users") {
    const list = Array.isArray(raw.userIds) ? raw.userIds : [];
    const ids = [...new Set(list.map((v) => String(v ?? "").trim()).filter(Boolean))];
    if (ids.length === 0) errors.audience = "Select at least one user.";
    else if (ids.length > LIMITS.maxExplicitUsers) errors.audience = `Select at most ${LIMITS.maxExplicitUsers} users (use a segment for bigger groups).`;
    else if (ids.some((id) => !isValidId(id))) errors.audience = "One or more user IDs are invalid.";
    audience.userIds = ids;
  } else if (type === "segment") {
    if (!SEGMENT_IDS.includes(raw.segment)) errors.audience = "Choose a user segment.";
    else audience.segment = raw.segment;
  }

  // Personal messages are one-to-one / small-group by definition.
  if (category?.id === "personal" && type !== "users") {
    errors.audience = "Personal messages must be addressed to specific users.";
  }
  return audience;
}

function validateMeeting(input, errors, now) {
  if (!input || typeof input !== "object") return null;
  const timeZone = input.timezone;
  if (!isValidTimeZone(timeZone)) {
    errors.meeting = "Choose a valid time zone for the meeting.";
    return null;
  }
  if (!isValidLocalDateTime(input.startsLocal)) {
    errors.meeting = "Enter the meeting start date and time.";
    return null;
  }
  const startsAt = zonedLocalToUtcMs(input.startsLocal, timeZone);
  let endsAt = null;
  if (input.endsLocal) {
    if (!isValidLocalDateTime(input.endsLocal)) {
      errors.meeting = "The meeting end time is invalid.";
      return null;
    }
    endsAt = zonedLocalToUtcMs(input.endsLocal, timeZone);
    if (endsAt <= startsAt) {
      errors.meeting = "The meeting must end after it starts.";
      return null;
    }
  }
  if ((endsAt ?? startsAt) < now) {
    errors.meeting = "This meeting is already over.";
    return null;
  }

  let link = "";
  if (input.link) {
    link = normalizeHttpsUrl(input.link);
    if (!link) {
      errors.meeting = "The meeting link must be a valid https:// URL.";
      return null;
    }
  }

  const reminders = [
    ...new Set(
      (Array.isArray(input.reminders) ? input.reminders : [])
        .map(Number)
        .filter((m) => Number.isInteger(m) && m >= LIMITS.minReminderMinutes && m <= LIMITS.maxReminderMinutes)
    ),
  ]
    .sort((a, b) => b - a)
    .slice(0, LIMITS.maxReminders);
  if (reminders.length) {
    errors.meeting = "Create separate scheduled notifications for each event reminder.";
  }

  return {
    startsAt,
    endsAt,
    timezone: timeZone,
    startsLocal: input.startsLocal,
    endsLocal: input.endsLocal || "",
    link,
    description: cleanMultiline(input.description, 300),
    reminders,
    calendar: input.calendar === true,
  };
}

/**
 * @param input raw JSON from the browser
 * @param {{now?: number}} [opts]
 * @returns {{ok: true, value: object} | {ok: false, errors: Record<string,string>}}
 */
export function validateCampaignInput(input, { now = Date.now() } = {}) {
  const errors = {};
  const raw = input && typeof input === "object" ? input : {};

  const title = cleanLine(raw.title, LIMITS.titleMax + 1);
  if (!title) errors.title = "Title is required.";
  else if (title.length > LIMITS.titleMax) errors.title = `Title must be ${LIMITS.titleMax} characters or fewer.`;

  const body = cleanMultiline(raw.body, LIMITS.bodyMax + 1);
  if (!body) errors.body = "Message is required.";
  else if (body.length > LIMITS.bodyMax) errors.body = `Message must be ${LIMITS.bodyMax} characters or fewer.`;

  const category = getCategory(raw.category);
  if (!category) errors.category = "Choose a category.";

  const priority = PRIORITIES.includes(raw.priority) ? raw.priority : "normal";

  let imageUrl = "";
  if (raw.imageUrl) {
    imageUrl = normalizeHttpsUrl(raw.imageUrl) || "";
    if (!imageUrl) errors.imageUrl = "The image must be a valid https:// URL.";
  }

  let action = null;
  const rawAction = raw.action && typeof raw.action === "object" ? raw.action : null;
  if (rawAction && (rawAction.label || rawAction.url)) {
    const label = cleanLine(rawAction.label, LIMITS.actionLabelMax + 1);
    const url = normalizeHttpsUrl(rawAction.url);
    if (!label) errors.action = "Give the action button a label.";
    else if (label.length > LIMITS.actionLabelMax) errors.action = `Button label must be ${LIMITS.actionLabelMax} characters or fewer.`;
    else if (!url) errors.action = "The action button needs a valid https:// link.";
    else action = { label, url };
  }

  const deepLink = validateDeepLink(raw.deepLink, errors);
  const audience = validateAudience(raw.audience, category, errors);

  // Meeting block (only meaningful for the meeting category)
  let meeting = null;
  if (category?.id === "meeting" && raw.meeting) meeting = validateMeeting(raw.meeting, errors, now);
  if (meeting && !action && meeting.link) action = { label: "Join Meeting", url: meeting.link };

  // Scheduling
  const rawSchedule = raw.schedule && typeof raw.schedule === "object" ? raw.schedule : {};
  const mode = ["now", "later", "draft"].includes(rawSchedule.mode) ? rawSchedule.mode : "now";
  const timezone = rawSchedule.timezone || "UTC";
  const schedule = { mode, timezone, local: "", scheduledFor: null };
  if (!isValidTimeZone(timezone)) errors.schedule = "Choose a valid time zone.";

  // Optional recurrence (daily)
  const rawRec = raw.recurrence && typeof raw.recurrence === "object" ? raw.recurrence : null;
  if (rawRec) {
    errors.recurrence = "Recurring notifications are not supported yet. Schedule a separate notification.";
  }

  if (mode === "later" && !errors.schedule) {
    if (!isValidLocalDateTime(rawSchedule.local)) {
      errors.schedule = "Choose the date and time to send.";
    } else {
      const at = zonedLocalToUtcMs(rawSchedule.local, timezone);
      if (at < now + LIMITS.minScheduleLeadMs) errors.schedule = "Pick a time at least a minute in the future.";
      else if (at > now + LIMITS.maxScheduleDays * 86400000) errors.schedule = "Scheduling is limited to one year ahead.";
      else {
        schedule.scheduledFor = at;
        schedule.local = rawSchedule.local;
      }
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };

  return {
    ok: true,
    value: {
      title,
      body,
      category: category.id,
      priority,
      imageUrl,
      action,
      deepLink,
      audience,
      schedule,
      meeting,
    },
  };
}
