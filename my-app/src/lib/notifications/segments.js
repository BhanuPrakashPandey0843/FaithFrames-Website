// Segment predicates. A segment is a pure function of a user snapshot + shared context, so new
// segments can be added here (and in constants.SEGMENTS) without touching the delivery pipeline.

import { toMillis } from "../membership";

const DAY_MS = 24 * 60 * 60 * 1000;
const USER_ID_BATCH_SIZE = 30;

export const SEGMENT_PREDICATES = {
  premium: (user, ctx) => ctx.premiumIds.has(user.id),
  free: (user, ctx) => !ctx.premiumIds.has(user.id),
  new7d: (user, ctx) => {
    const created = toMillis(user.createdAt);
    return created !== null && ctx.now - created <= 7 * DAY_MS;
  },
};

/** Segments that need the set of premium user ids loaded first. */
export function segmentNeedsPremium(segmentId) {
  return segmentId === "premium" || segmentId === "free";
}

export async function getPremiumIdsForUsers(db, users) {
  const premiumIds = new Set(users.filter((user) => user.isPremium === true).map((user) => user.id));
  for (let start = 0; start < users.length; start += USER_ID_BATCH_SIZE) {
    const ids = users.slice(start, start + USER_ID_BATCH_SIZE).map((user) => user.id);
    if (!ids.length) continue;
    const payments = await db.collection("payments")
      .where("status", "==", "completed")
      .where("userId", "in", ids)
      .select("userId")
      .get();
    payments.docs.forEach((payment) => {
      const userId = payment.get("userId");
      if (userId) premiumIds.add(userId);
    });
  }
  return premiumIds;
}

/** Fields that must be read from each user document to evaluate every segment + personalisation. */
export const USER_FIELDS = ["name", "createdAt", "isPremium"];
