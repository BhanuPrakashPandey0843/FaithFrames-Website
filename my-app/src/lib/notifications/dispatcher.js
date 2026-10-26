import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { randomUUID } from "node:crypto";
import { toMillis } from "../membership";
import {
  campaignsCol,
  deliveryId,
  deliveriesCol,
  inboxRef,
  safeError,
  tokensCol,
} from "./common";
import { loadAudiencePage, AUDIENCE_PAGE_SIZE } from "./audience";
import { buildInboxFields, buildPushMessage } from "./payload";
import { resolveRecipientPrefs } from "./prefs";
import {
  classifyPushError,
  getExpoReceipts,
  isExpoPushToken,
  sendExpoPushMessages,
} from "./expoPush";

const PAGE_SIZE = Math.min(AUDIENCE_PAGE_SIZE, 50);
const LEASE_MS = 2 * 60 * 1000;
const RECEIPT_RETRY_MS = 10 * 60 * 1000;

function clearLease() {
  return {
    dispatchLeaseId: FieldValue.delete(),
    leaseUntil: Timestamp.fromMillis(0),
  };
}

async function acquireCampaign(db, campaignId, now) {
  const ref = campaignsCol(db).doc(campaignId);
  const leaseId = randomUUID();
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) return null;
    const campaign = { id: snapshot.id, ...snapshot.data() };
    if (!["queued", "scheduled", "sending"].includes(campaign.status)) return null;
    if (campaign.status === "scheduled" && (toMillis(campaign.scheduledFor) ?? Infinity) > now) return null;
    if (campaign.status === "sending" && (toMillis(campaign.leaseUntil) ?? 0) > now) return null;

    campaign.processingAttempts = Number(campaign.processingAttempts || 0) + 1;
    transaction.update(ref, {
      status: "sending",
      dispatchLeaseId: leaseId,
      leaseUntil: Timestamp.fromMillis(now + LEASE_MS),
      lastAttemptAt: Timestamp.fromMillis(now),
      processingAttempts: campaign.processingAttempts,
    });
    return { ref, leaseId, campaign, cursor: campaign.cursor ?? null };
  });
}

async function getActiveTokens(db, users) {
  const tokensByUser = new Map(users.map((user) => [user.id, []]));
  for (let start = 0; start < users.length; start += 30) {
    const ids = users.slice(start, start + 30).map((user) => user.id);
    if (!ids.length) continue;
    const snapshot = await tokensCol(db)
      .where("ownerUid", "in", ids)
      .where("active", "==", true)
      .get();
    snapshot.docs.forEach((tokenDoc) => {
      const data = tokenDoc.data();
      if (!tokensByUser.has(data.ownerUid)) return;
      if (!isExpoPushToken(data.token) || tokenDoc.id !== data.token) return;
      tokensByUser.get(data.ownerUid).push({ id: tokenDoc.id, ...data });
    });
  }
  return tokensByUser;
}

async function readRefs(db, refs) {
  const snapshots = [];
  for (let start = 0; start < refs.length; start += 300) {
    snapshots.push(...(await db.getAll(...refs.slice(start, start + 300))));
  }
  return snapshots;
}

async function processCampaignPage(db, lease, now) {
  const { campaign, cursor, ref, leaseId } = lease;
  const page = await loadAudiencePage(db, campaign.audience, cursor, PAGE_SIZE, { now });
  const users = page.users;
  const prefsSnapshots = await readRefs(
    db,
    users.map((user) => db.collection("notification_preferences").doc(user.id))
  );
  const prefsByUser = new Map(prefsSnapshots.map((snapshot) => [snapshot.id, snapshot.data() || {}]));
  const tokensByUser = await getActiveTokens(db, users);
  const inboxRefs = users.map((user) => inboxRef(db, user.id, campaign.id));
  const inboxSnapshots = await readRefs(db, inboxRefs);
  const inboxByUser = new Map(inboxSnapshots.map((snapshot) => [snapshot.ref.parent.parent.id, snapshot]));

  const inboxBatch = db.batch();
  let inboxCreated = 0;
  let skippedByPreference = 0;
  let pushEligibleUsers = 0;
  const pushTargets = [];

  users.forEach((user) => {
    const prefs = resolveRecipientPrefs(prefsByUser.get(user.id), campaign.category);
    const userTokens = tokensByUser.get(user.id) || [];
    if (campaign.audience?.onlyWithPush && (!prefs.push || userTokens.length === 0)) {
      skippedByPreference++;
      return;
    }
    if (!prefs.inApp) {
      skippedByPreference++;
      return;
    }

    const existingInbox = inboxByUser.get(user.id);
    if (!existingInbox?.exists) {
      inboxBatch.create(inboxRef(db, user.id, campaign.id), {
        ...buildInboxFields(campaign, { name: user.name }),
        createdAt: FieldValue.serverTimestamp(),
      });
      inboxCreated++;
    }

    if (prefs.push && userTokens.length > 0) {
      pushEligibleUsers++;
      userTokens.forEach((token) => pushTargets.push({ user, token }));
    }
  });

  if (inboxCreated > 0) await inboxBatch.commit();

  const deliveryRefs = pushTargets.map(({ token }) =>
    deliveriesCol(db).doc(deliveryId(campaign.id, token.id))
  );
  const deliverySnapshots = await readRefs(db, deliveryRefs);
  const existingDeliveries = new Map(deliverySnapshots.map((snapshot) => [snapshot.id, snapshot]));
  const pendingPushTargets = pushTargets.filter(({ token }) => {
    const prior = existingDeliveries.get(deliveryId(campaign.id, token.id));
    if (!prior?.exists) return true;
    const priorData = prior.data();
    return campaign.retryFailuresOnly === true &&
      priorData.status === "failed" &&
      priorData.retryable === true;
  });

  const messages = pendingPushTargets.map(({ user, token }) =>
    buildPushMessage(campaign, { token: token.token, uid: user.id, name: user.name }, now)
  );
  const tickets = messages.length ? await sendExpoPushMessages(messages) : [];
  const deliveryBatch = db.batch();
  let pushAccepted = 0;
  let pushRejected = 0;
  let pushRetryable = 0;
  let pushInvalidTokens = 0;

  pendingPushTargets.forEach(({ user, token }, index) => {
    const ticket = tickets[index] || { status: "error", message: "Missing provider response", retryable: true };
    const deliveryRef = deliveriesCol(db).doc(deliveryId(campaign.id, token.id));
    const prior = existingDeliveries.get(deliveryId(campaign.id, token.id));
    const priorAttempts = prior?.exists ? Number(prior.get("attempts") || 0) : 0;
    const accepted = ticket.status === "ok" && typeof ticket.id === "string";
    const classification = accepted ? null : classifyPushError(ticket);
    const delivery = {
      campaignId: campaign.id,
      userId: user.id,
      tokenId: token.id,
      status: accepted ? "accepted" : "failed",
      ticketId: accepted ? ticket.id : null,
      retryable: accepted ? false : classification.retryable,
      errorCode: accepted ? "" : String(classification.code || ticket.details?.error || "provider_error").slice(0, 80),
      attempts: priorAttempts + 1,
      lastAttemptAt: Timestamp.fromMillis(now),
      receiptCheckAt: accepted ? Timestamp.fromMillis(now + 15 * 60 * 1000) : null,
      createdAt: prior?.exists ? prior.get("createdAt") : FieldValue.serverTimestamp(),
    };
    deliveryBatch.set(deliveryRef, delivery);

    if (accepted) {
      pushAccepted++;
    } else {
      pushRejected++;
      if (classification.retryable) pushRetryable++;
      if (classification.invalidToken) {
        pushInvalidTokens++;
        deliveryBatch.delete(tokensCol(db).doc(token.id));
      }
    }
  });

  if (pendingPushTargets.length > 0) await deliveryBatch.commit();

  const done = page.done;
  await db.runTransaction(async (transaction) => {
    const latest = await transaction.get(ref);
    if (!latest.exists || latest.get("dispatchLeaseId") !== leaseId) return;
    const updates = {
      status: done ? "sent" : "queued",
      cursor: done ? null : page.nextCursor,
      ...clearLease(),
      retryFailuresOnly: done ? false : campaign.retryFailuresOnly === true,
      "stats.targeted": FieldValue.increment(campaign.retryFailuresOnly ? 0 : users.length),
      "stats.inboxCreated": FieldValue.increment(inboxCreated),
      "stats.skippedByPreference": FieldValue.increment(skippedByPreference),
      "stats.pushEligibleUsers": FieldValue.increment(campaign.retryFailuresOnly ? 0 : pushEligibleUsers),
      "stats.pushDevices": FieldValue.increment(campaign.retryFailuresOnly ? 0 : pushTargets.length),
      "stats.pushAttempted": FieldValue.increment(pendingPushTargets.length),
      "stats.pushAccepted": FieldValue.increment(pushAccepted),
      "stats.pushRejected": FieldValue.increment(pushRejected),
      "stats.pushRetryable": FieldValue.increment(pushRetryable),
      "stats.pushInvalidTokens": FieldValue.increment(pushInvalidTokens),
      updatedAt: FieldValue.serverTimestamp(),
    };
    const aggregate = {
      recipients: FieldValue.increment(inboxCreated),
      pushAccepted: FieldValue.increment(pushAccepted),
      pushRejected: FieldValue.increment(pushRejected),
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (done) {
      updates.sentAt = latest.get("sentAt") || FieldValue.serverTimestamp();
      updates.completedAt = latest.get("completedAt") || FieldValue.serverTimestamp();
      if (!latest.get("completedAt")) aggregate.sentCampaigns = FieldValue.increment(1);
    }
    transaction.set(db.collection("notificationSettings").doc("aggregate"), aggregate, { merge: true });
    transaction.update(ref, updates);
  });

  return { processed: true, done, recipients: users.length };
}

export async function processCampaign(db, campaignId, now = Date.now()) {
  const lease = await acquireCampaign(db, campaignId, now);
  if (!lease) return { processed: false };
  try {
    return await processCampaignPage(db, lease, now);
  } catch (error) {
    console.error("[notifications] Campaign page failed", {
      campaignId,
      error: safeError(error),
    });
    await db.runTransaction(async (transaction) => {
      const latest = await transaction.get(lease.ref);
      if (!latest.exists || latest.get("dispatchLeaseId") !== lease.leaseId) return;
      transaction.update(lease.ref, {
        status: lease.campaign.processingAttempts >= 8 ? "failed" : "queued",
        ...clearLease(),
        lastError: safeError(error),
        ...(lease.campaign.processingAttempts >= 8 ? { failedAt: FieldValue.serverTimestamp() } : {}),
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
    throw error;
  }
}

async function processReceipts(db, now) {
  const due = await deliveriesCol(db)
    .where("status", "==", "accepted")
    .where("receiptCheckAt", "<=", Timestamp.fromMillis(now))
    .limit(100)
    .get();
  if (due.empty) return 0;

  const ticketIds = due.docs.map((snapshot) => snapshot.get("ticketId")).filter(Boolean);
  if (!ticketIds.length) return 0;
  const receipts = await getExpoReceipts(ticketIds);
  const batch = db.batch();
  const tokenDeletes = [];
  const campaignStats = new Map();
  let processed = 0;

  due.docs.forEach((snapshot) => {
    const receipt = receipts.get(snapshot.get("ticketId"));
    if (!receipt) {
      const checks = Number(snapshot.get("receiptChecks") || 0) + 1;
      batch.update(snapshot.ref, checks >= 3
        ? { status: "receipt_unknown", receiptChecks: checks, receiptCheckAt: null }
        : {
            receiptChecks: checks,
            receiptCheckAt: Timestamp.fromMillis(now + RECEIPT_RETRY_MS),
          });
      processed++;
      return;
    }

    const classification = classifyPushError(receipt);
    const ok = receipt.status === "ok";
    batch.update(snapshot.ref, {
      status: ok ? "handed_off" : "failed",
      retryable: ok ? false : classification.retryable,
      errorCode: ok ? "" : String(classification.code || "receipt_error").slice(0, 80),
      receiptStatus: receipt.status,
      receiptCheckedAt: Timestamp.fromMillis(now),
      receiptCheckAt: null,
    });
    if (classification.invalidToken) tokenDeletes.push(snapshot.get("tokenId"));
    const stats = campaignStats.get(snapshot.get("campaignId")) || { ok: 0, error: 0 };
    stats[ok ? "ok" : "error"]++;
    campaignStats.set(snapshot.get("campaignId"), stats);
    processed++;
  });

  tokenDeletes.forEach((tokenId) => {
    if (tokenId) batch.delete(tokensCol(db).doc(tokenId));
  });
  campaignStats.forEach((stats, campaignId) => {
    batch.update(campaignsCol(db).doc(campaignId), {
      "stats.pushReceiptOk": FieldValue.increment(stats.ok),
      "stats.pushReceiptError": FieldValue.increment(stats.error),
    });
  });
  await batch.commit();
  return processed;
}

export async function processDueNotificationWork(db, now = Date.now()) {
  const nowTs = Timestamp.fromMillis(now);
  const [queued, scheduled, expiredLeases] = await Promise.all([
    campaignsCol(db).where("status", "==", "queued").orderBy("updatedAt").limit(1).get(),
    campaignsCol(db)
      .where("status", "==", "scheduled")
      .where("scheduledFor", "<=", nowTs)
      .orderBy("scheduledFor")
      .limit(1)
      .get(),
    campaignsCol(db)
      .where("status", "==", "sending")
      .where("leaseUntil", "<=", nowTs)
      .orderBy("leaseUntil")
      .limit(1)
      .get(),
  ]);
  const selected = scheduled.docs[0] || expiredLeases.docs[0] || queued.docs[0] || null;
  let processed = 0;
  let failed = 0;
  if (selected) {
    try {
      const result = await processCampaign(db, selected.id, now);
      if (result.processed) processed++;
    } catch {
      failed++;
    }
  }

  let receipts = 0;
  try {
    receipts = await processReceipts(db, now);
  } catch (error) {
    console.error("[notifications] Receipt processing failed", { error: safeError(error) });
    failed++;
  }
  return { processed, failed, receipts };
}
