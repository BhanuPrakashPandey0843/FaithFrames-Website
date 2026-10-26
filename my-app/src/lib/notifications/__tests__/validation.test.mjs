import assert from "node:assert/strict";
import test from "node:test";
import { buildInboxFields, buildPushData, buildPushMessage } from "../payload.js";
import { resolveRecipientPrefs } from "../prefs.js";
import { normalizeHttpsUrl, validateCampaignInput } from "../validate.js";

const validCampaign = (overrides = {}) => ({
  title: "New resource",
  body: "A new resource is available.",
  category: "announcement",
  priority: "normal",
  audience: { type: "all" },
  deepLink: { type: "none" },
  schedule: { mode: "now", timezone: "UTC" },
  ...overrides,
});

test("validates a simple campaign and normalizes text", () => {
  const result = validateCampaignInput(validCampaign({ title: "  New   resource  " }));
  assert.equal(result.ok, true);
  assert.equal(result.value.title, "New resource");
  assert.equal(result.value.schedule.scheduledFor, null);
});

test("requires personal messages to target explicit users", () => {
  const result = validateCampaignInput(validCampaign({
    category: "personal",
    audience: { type: "all" },
  }));
  assert.equal(result.ok, false);
  assert.match(result.errors.audience, /specific users/);
});

test("rejects unsafe external destinations", () => {
  assert.equal(normalizeHttpsUrl("https://meet.example.org/room"), "https://meet.example.org/room");
  assert.equal(normalizeHttpsUrl("http://meet.example.org/room"), null);
  assert.equal(normalizeHttpsUrl("https://user:pass@meet.example.org/room"), null);
  assert.equal(normalizeHttpsUrl("https://localhost/room"), null);
});

test("requires future scheduled notifications and validates the time zone", () => {
  const result = validateCampaignInput(validCampaign({
    schedule: {
      mode: "later",
      timezone: "UTC",
      local: "2027-01-01T12:30",
    },
  }), { now: Date.UTC(2026, 0, 1) });
  assert.equal(result.ok, true);
  assert.equal(result.value.schedule.scheduledFor, Date.UTC(2027, 0, 1, 12, 30));
});

test("push alerts are opt-in and personal categories still respect the master switch", () => {
  assert.deepEqual(resolveRecipientPrefs({}, "announcement"), { inApp: true, push: false });
  assert.deepEqual(resolveRecipientPrefs({ pushEnabled: true }, "announcement"), { inApp: true, push: true });
  assert.deepEqual(resolveRecipientPrefs({ pushEnabled: false }, "personal"), { inApp: true, push: false });
});

test("push payload contains routing identifiers, not meeting links", () => {
  const campaign = {
    id: "campaign_1",
    category: "meeting",
    audience: { type: "users" },
    title: "Meeting: https://meet.example.org/private",
    body: "Join at https://meet.example.org/private",
    deepLink: { type: "url", url: "https://meet.example.org/private" },
    action: { label: "Join Meeting", url: "https://meet.example.org/private" },
    meeting: { link: "https://meet.example.org/private", startsAt: Date.now() + 60000 },
  };
  const data = buildPushData(campaign, { uid: "user_1" });
  assert.deepEqual(data, { v: 1, nid: "campaign_1", uid: "user_1", cat: "meeting", t: "url" });
  const inbox = buildInboxFields(campaign, { name: "Grace" });
  assert.equal(inbox.meeting.link, "https://meet.example.org/private");
  assert.equal(inbox.personal, true);
  const push = buildPushMessage(campaign, {
    token: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
    uid: "user_1",
    name: "Grace",
  });
  assert.doesNotMatch(push.title, /https?:\/\//);
  assert.doesNotMatch(push.body, /https?:\/\//);
  assert.equal(push.title, "Meeting:");
  assert.equal(push.body, "Join at");
  assert.equal(inbox.body, "Join at https://meet.example.org/private");
  assert.equal(
    buildPushMessage({ ...campaign, body: campaign.meeting.link }, {
      token: "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
      uid: "user_1",
      name: "Grace",
    }).body,
    "Open Faith Frames for meeting details."
  );
});
