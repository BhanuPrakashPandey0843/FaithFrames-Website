// Pure builders for the two artefacts created for every recipient:
//  1. the inbox document   users/{uid}/notifications/{campaignId}   (full content, owner-readable)
//  2. the push message     sent through the Expo push service       (minimal payload)
//
// Structured destinations stay in the owner-readable inbox; push data contains routing identifiers
// only. Meeting-category text is also stripped of URLs before it is sent through the push provider.

import { LIMITS, getCategory } from "./constants.js";

export function firstName(name) {
  return String(name || "").trim().split(/\s+/)[0] || "friend";
}

export function personalize(text, name) {
  return String(text ?? "").replaceAll("{name}", firstName(name));
}

export function truncate(text, max) {
  const s = String(text ?? "");
  return s.length <= max ? s : `${s.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

/** Fields of the inbox document, excluding createdAt (added with a server timestamp by the caller). */
export function buildInboxFields(campaign, { name } = {}) {
  const meeting = campaign.meeting
    ? {
        startsAtMs: campaign.meeting.startsAt ?? null,
        endsAtMs: campaign.meeting.endsAt ?? null,
        timezone: campaign.meeting.timezone || "",
        link: campaign.meeting.link || "",
        description: campaign.meeting.description || "",
        calendar: campaign.meeting.calendar === true,
      }
    : null;

  return {
    campaignId: campaign.id,
    title: truncate(personalize(campaign.title, name), LIMITS.titleMax),
    body: truncate(personalize(campaign.body, name), LIMITS.bodyMax),
    category: campaign.category,
    priority: campaign.priority || "normal",
    imageUrl: campaign.imageUrl || "",
    action: campaign.action || null,
    deepLink: campaign.deepLink || { type: "none" },
    meeting,
    personal: campaign.audience?.type === "users",
    kind: campaign.kind || "broadcast",
    read: false,
    readAt: null,
    opened: false,
    openedAt: null,
  };
}

function ttlSeconds(campaign, now) {
  const startsAt = campaign.meeting?.startsAt;
  if (startsAt && startsAt > now) {
    // A meeting alert is useless after the meeting begins.
    return Math.max(60, Math.min(Math.floor((startsAt - now) / 1000), 28 * 86400));
  }
  return 24 * 3600;
}

/** Minimal `data` carried by the push itself (see privacy note above). */
export function buildPushData(campaign, { uid }) {
  const link = campaign.deepLink || { type: "none" };
  const data = { v: 1, nid: campaign.id, uid, cat: campaign.category, t: link.type };
  if (link.type === "wallpaper" || link.type === "content") data.id = link.id;
  if (link.type === "content") data.kind = link.kind;
  return data;
}

export function buildPushMessage(campaign, { token, uid, name }, now = Date.now()) {
  const category = getCategory(campaign.category);
  const privateMeeting = campaign.category === "meeting";
  const safePushText = (text, fallback, max) => {
    const personalized = personalize(text, name);
    const withoutUrls = privateMeeting
      ? personalized.replace(/(?:https?:\/\/|www\.)\S+/gi, " ").replace(/\s+/g, " ").trim()
      : personalized;
    return truncate(withoutUrls || fallback, max);
  };
  return {
    to: token,
    title: safePushText(campaign.title, "Meeting reminder", LIMITS.titleMax),
    body: safePushText(campaign.body, "Open Faith Frames for meeting details.", LIMITS.pushBodyMax),
    sound: "default",
    priority: campaign.priority === "high" ? "high" : "default",
    channelId: category?.channel || "default",
    ttl: ttlSeconds(campaign, now),
    data: buildPushData(campaign, { uid }),
  };
}
