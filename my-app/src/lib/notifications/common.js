// Small helpers shared by the notification server modules.

import { Timestamp } from "firebase-admin/firestore";
import { createHash } from "node:crypto";
import { COLLECTIONS } from "./constants";

export class ApiError extends Error {
  constructor(status, code, message, extra = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
}

export const campaignsCol = (db) => db.collection(COLLECTIONS.campaigns);
export const deliveriesCol = (db) => db.collection(COLLECTIONS.deliveries);
export const tokensCol = (db) => db.collection(COLLECTIONS.tokens);
export const inboxRef = (db, uid, notificationId) => db.collection("users").doc(uid).collection("notifications").doc(notificationId);
export const deliveryId = (campaignId, tokenId) =>
  `${campaignId}__${createHash("sha256").update(tokenId).digest("hex")}`;

export function isAlreadyExists(err) {
  return err?.code === 6 || err?.code === "already-exists" || /ALREADY_EXISTS/.test(String(err?.message || ""));
}

/** A log/DB-safe error message: no stack, no payloads, bounded length. */
export function safeError(err) {
  return String(err?.message || err || "Unknown error")
    .replace(/\s+/g, " ")
    .slice(0, 300);
}

export const zeroStats = () => ({
  targeted: 0,
  inboxCreated: 0,
  inboxExisting: 0,
  skippedByPreference: 0,
  pushEligibleUsers: 0,
  pushDevices: 0,
  pushAttempted: 0,
  pushAccepted: 0,
  pushRejected: 0,
  pushRetryable: 0,
  pushReceiptOk: 0,
  pushReceiptError: 0,
  pushInvalidTokens: 0,
});

export function toTimestamp(ms) {
  return typeof ms === "number" && Number.isFinite(ms) ? Timestamp.fromMillis(ms) : null;
}

/** Firestore value -> JSON-safe value (Timestamps become ISO strings). */
export function serializeValue(value) {
  if (value == null) return value;
  if (typeof value.toDate === "function") {
    try {
      return value.toDate().toISOString();
    } catch {
      return null;
    }
  }
  if (Array.isArray(value)) return value.map(serializeValue);
  if (typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = serializeValue(v);
    return out;
  }
  return value;
}

export function serializeDoc(snap) {
  return { id: snap.id, ...serializeValue(snap.data() || {}) };
}

/** Turn arbitrary thrown values into an HTTP response body. */
export function errorToResponse(err) {
  if (err instanceof ApiError) {
    return { status: err.status, body: { message: err.message, code: err.code, ...err.extra } };
  }
  return { status: 500, body: { message: "Something went wrong while processing the notification." } };
}
