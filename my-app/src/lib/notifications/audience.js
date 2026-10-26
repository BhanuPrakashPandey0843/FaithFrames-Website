// Audience resolution. Large audiences are never loaded in one go: callers page through them with
// an opaque cursor so a send can be spread across several short serverless invocations.

import { FieldPath } from "firebase-admin/firestore";
import { COLLECTIONS } from "./constants";
import {
  getPremiumIdsForUsers,
  SEGMENT_PREDICATES,
  USER_FIELDS,
  segmentNeedsPremium,
} from "./segments";

export const AUDIENCE_PAGE_SIZE = 200;

/**
 * @param {object} ctx  mutable cache shared by the pages of one run ({ now, premiumIds })
 * @returns {{users: {id, name}[], nextCursor: string|number|null, done: boolean, scanned: number}}
 */
export async function loadAudiencePage(db, audience, cursor, pageSize = AUDIENCE_PAGE_SIZE, ctx = {}) {
  if (ctx.now === undefined) ctx.now = Date.now();

  if (audience.type === "users") {
    const start = Number(cursor) || 0;
    const slice = audience.userIds.slice(start, start + pageSize);
    const snaps = slice.length
      ? await db.getAll(...slice.map((id) => db.collection("users").doc(id)), { fieldMask: ["name"] })
      : [];
    const users = snaps.filter((s) => s.exists).map((s) => ({ id: s.id, name: s.get("name") || "" }));
    const next = start + slice.length;
    return { users, nextCursor: next, done: next >= audience.userIds.length, scanned: slice.length };
  }

  let query = db.collection("users").orderBy(FieldPath.documentId()).select(...USER_FIELDS).limit(pageSize);
  if (cursor) query = query.startAfter(String(cursor));
  const snap = await query.get();

  let users = snap.docs.map((d) => ({
    id: d.id,
    name: d.get("name") || "",
    createdAt: d.get("createdAt") ?? null,
    isPremium: d.get("isPremium") === true,
  }));

  if (audience.type === "segment") {
    const predicate = SEGMENT_PREDICATES[audience.segment];
    if (!predicate) throw new Error(`Unknown segment "${audience.segment}"`);
    if (segmentNeedsPremium(audience.segment) && !ctx.premiumIds) {
      ctx.premiumIds = await getPremiumIdsForUsers(db, users);
    }
    users = users.filter((u) => predicate(u, ctx));
  }

  const last = snap.docs[snap.docs.length - 1];
  return {
    users: users.map((u) => ({ id: u.id, name: u.name })),
    nextCursor: last ? last.id : cursor ?? null,
    done: snap.size < pageSize,
    scanned: snap.size,
  };
}

async function countQuery(query) {
  const snap = await query.count().get();
  return snap.data().count;
}

/**
 * Cheap audience size for the composer's "review audience" step.
 * exact=false means "approximately" (segments derived from payment records).
 */
export async function countAudience(db, audience) {
  const devices = await countQuery(db.collection(COLLECTIONS.tokens));

  if (audience.type === "users") {
    const ids = audience.userIds || [];
    const snaps = ids.length ? await db.getAll(...ids.map((id) => db.collection("users").doc(id)), { fieldMask: ["name"] }) : [];
    return { total: snaps.filter((s) => s.exists).length, requested: ids.length, exact: true, devices };
  }

  const totalUsers = await countQuery(db.collection("users"));
  if (audience.type === "all") return { total: totalUsers, exact: true, devices };

  if (audience.segment === "new7d") {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return { total: await countQuery(db.collection("users").where("createdAt", ">=", since)), exact: true, devices };
  }

  const [completedPayments, flaggedPremium] = await Promise.all([
    countQuery(db.collection("payments").where("status", "==", "completed")),
    countQuery(db.collection("users").where("isPremium", "==", true)),
  ]);
  const premiumUpperBound = Math.min(totalUsers, completedPayments + flaggedPremium);
  if (audience.segment === "premium") return { total: premiumUpperBound, exact: false, devices };
  if (audience.segment === "free") return { total: Math.max(0, totalUsers - premiumUpperBound), exact: false, devices };
  throw new Error(`Unknown segment "${audience.segment}"`);
}
