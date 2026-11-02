import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { randomUUID } from "node:crypto";
import { toMillis } from "../membership";
import {
  campaignsCol,
  commitInChunks,
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
  chunk,
  classifyPushError,
  getExpoReceipts,
  isExpoPushToken,
  sendExpoPushMessages,
} from "./expoPush";

// One page = up to 100 users, i.e. roughly one Expo request (100 messages) in the usual
// one-device-per-user case. Several pages are processed per worker run (see the time budget below).
const PAGE_SIZE = Math.min(AUDIENCE_PAGE_SIZE, 100);
const LEASE_MS = 2 * 60 * 1000;
const RECEIPT_RETRY_MS = 10 * 60 * 1000;
// Expo recommends waiting ~15 minutes before asking for receipts.
const RECEIPT_CHECK_DELAY_MS = 15 * 60 * 1000;
const RECEIPTS_PER_RUN = 300;
const RECEIPT_GROUP_SIZE = 150;
const MAX_CAMPAIGNS_PER_RUN = 5;
const DEFAULT_BUDGET_MS = 7000;
const RECEIPT_RESERVE_MS = 1500;

/**
 * How long one worker run may spend starting new pages. The default fits inside a 10 s serverless
 * function limit; raise NOTIFICATION_TICK_BUDGET_MS if the host allows longer functions.
 */
function tickBudgetMs() {
  const configured = Number(process.env.NOTIFICATION_TICK_BUDGET_MS);
  return Number.isFinite(configured) && configured >= 2000 ? Math.min(configured, 50000) : DEFAULT_BUDGET_MS;
}

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
      // The document id IS the token (that is how the app and the rules key it), and it must
      // look like a real Expo token. Anything else is ignored rather than sent to Expo.
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

  const inboxOps = [];
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
      const fields = {
        ...buildInboxFields(campaign, { name: user.name }),
        createdAt: FieldValue.serverTimestamp(),
      };
      inboxOps.push((batch) => batch.create(inboxRef(db, user.id, campaign.id), fields));
    }

    if (prefs.push && userTokens.length > 0) {
      pushEligibleUsers++;
      userTokens.forEach((token) => pushTargets.push({ user, token }));
    }
  });

  const inboxCreated = inboxOps.length;
  if (inboxCreated > 0) await commitInChunks(db, inboxOps);

  const deliveryRefs = pushTargets.map(({ token }) =>
    deliveriesCol(db).doc(deliveryId(campaign.id, token.id))
  );
  const deliverySnapshots = await readRefs(db, deliveryRefs);
  const existingDeliveries = new Map(deliverySnapshots.map((snapshot) => [snapshot.id, snapshot]));
  // A device that already has a delivery record for this campaign is never messaged again,
  // unless the admin explicitly asked to retry failures that are known to be retryable.
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
  const deliveryOps = [];
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
      platform: token.platform === "ios" || token.platform === "android" ? token.platform : "",
      status: accepted ? "accepted" : "failed",
      ticketId: accepted ? ticket.id : null,
      retryable: accepted ? false : classification.retryable,
      errorCode: accepted ? "" : String(classification.code || ticket.details?.error || "provider_error").slice(0, 80),
      errorMessage: accepted ? "" : safeError(ticket.message || ""),
      attempts: priorAttempts + 1,
      lastAttemptAt: Timestamp.fromMillis(now),
      receiptCheckAt: accepted ? Timestamp.fromMillis(now + RECEIPT_CHECK_DELAY_MS) : null,
      createdAt: prior?.exists ? prior.get("createdAt") : FieldValue.serverTimestamp(),
    };
    deliveryOps.push((batch) => batch.set(deliveryRef, delivery));

    if (accepted) {
      pushAccepted++;
    } else {
      pushRejected++;
      if (classification.retryable) pushRetryable++;
      if (classification.invalidToken) {
        pushInvalidTokens++;
        deliveryOps.push((batch) => batch.delete(tokensCol(db).doc(token.id)));
      }
    }
  });

  if (deliveryOps.length > 0) {
    // The messages are already with Expo at this point. Losing these records would make a retry of
    // the page send the same notification twice, so give the write one more chance before failing.
    try {
      await commitInChunks(db, deliveryOps);
    } catch (error) {
      console.error("[notifications] Delivery records could not be written; retrying once", {
        campaignId: campaign.id,
        error: safeError(error),
      });
      await commitInChunks(db, deliveryOps);
    }
  }

  const done = page.done;
  await db.runTransaction(async (transaction) => {
    const latest = await transaction.get(ref);
    if (!latest.exists || latest.get("dispatchLeaseId") !== leaseId) return;
    const updates = {
      status: done ? "sent" : "queued",
      cursor: done ? null : page.nextCursor,
      ...clearLease(),
      // processingAttempts counts CONSECUTIVE failed pages: a page that completed resets it, so a
      // large campaign is not marked failed by one transient error after many successful pages.
      processingAttempts: 0,
      lastError: FieldValue.delete(),
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

/** Processes exactly one page of a campaign (if it is due and not leased by another worker). */
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

/**
 * Keeps processing pages of one campaign until it is finished or the time budget is used up.
 * The next page is only started when, judging by the slowest page so far, it should still finish
 * inside the budget. Whatever is left stays "queued" with its cursor for the next worker run.
 */
export async function processCampaignWithinBudget(
  db,
  campaignId,
  { budgetMs = DEFAULT_BUDGET_MS, startedAt = Date.now() } = {}
) {
  let pages = 0;
  let recipients = 0;
  let done = false;
  let slowestPageMs = 0;
  for (;;) {
    const pageStartedAt = Date.now();
    const result = await processCampaign(db, campaignId, pageStartedAt);
    if (!result.processed) break;
    pages++;
    recipients += result.recipients || 0;
    done = result.done === true;
    if (done) break;
    slowestPageMs = Math.max(slowestPageMs, Date.now() - pageStartedAt);
    if (Date.now() - startedAt + slowestPageMs * 1.25 > budgetMs) break;
  }
  return { pages, recipients, done };
}

async function processReceipts(db, now) {
  const due = await deliveriesCol(db)
    .where("status", "==", "accepted")
    .where("receiptCheckAt", "<=", Timestamp.fromMillis(now))
    .limit(RECEIPTS_PER_RUN)
    .get();
  if (due.empty) return 0;

  const docs = due.docs.filter((snapshot) => typeof snapshot.get("ticketId") === "string" && snapshot.get("ticketId"));
  if (!docs.length) return 0;
  const receipts = await getExpoReceipts(docs.map((snapshot) => snapshot.get("ticketId")));
  // If part of the receipt request failed, a missing receipt says nothing about the delivery.
  const providerPartiallyUnavailable = (receipts.failedChunks || 0) > 0;
  let processed = 0;

  // Each group is applied in ONE atomic batch together with its token deletions and campaign
  // counters, so counters can never drift from the delivery records they summarise.
  for (const group of chunk(docs, RECEIPT_GROUP_SIZE)) {
    const batch = db.batch();
    const tokenDeletes = new Set();
    const campaignStats = new Map();

    group.forEach((snapshot) => {
      const receipt = receipts.get(snapshot.get("ticketId"));
      if (!receipt) {
        if (providerPartiallyUnavailable) return;
        // Expo keeps receipts for about a day. No receipt after a few tries -> stop waiting.
        const checks = Number(snapshot.get("receiptChecks") || 0) + 1;
        batch.update(
          snapshot.ref,
          checks >= 3
            ? { status: "receipt_unknown", receiptChecks: checks, receiptCheckAt: null }
            : { receiptChecks: checks, receiptCheckAt: Timestamp.fromMillis(now + RECEIPT_RETRY_MS) }
        );
        processed++;
        return;
      }

      const classification = classifyPushError(receipt);
      const ok = receipt.status === "ok";
      batch.update(snapshot.ref, {
        status: ok ? "handed_off" : "failed",
        retryable: ok ? false : classification.retryable,
        errorCode: ok ? "" : String(classification.code || "receipt_error").slice(0, 80),
        errorMessage: ok ? "" : safeError(receipt.message || ""),
        receiptStatus: receipt.status,
        receiptCheckedAt: Timestamp.fromMillis(now),
        receiptCheckAt: null,
      });
      if (classification.invalidToken && snapshot.get("tokenId")) tokenDeletes.add(snapshot.get("tokenId"));
      const stats = campaignStats.get(snapshot.get("campaignId")) || { ok: 0, error: 0 };
      stats[ok ? "ok" : "error"]++;
      campaignStats.set(snapshot.get("campaignId"), stats);
      processed++;
    });

    tokenDeletes.forEach((tokenId) => batch.delete(tokensCol(db).doc(tokenId)));
    campaignStats.forEach((stats, campaignId) => {
      batch.update(campaignsCol(db).doc(campaignId), {
        "stats.pushReceiptOk": FieldValue.increment(stats.ok),
        "stats.pushReceiptError": FieldValue.increment(stats.error),
      });
    });
    await batch.commit();
  }
  return processed;
}

async function findNextDueCampaign(db, nowMs) {
  const nowTs = Timestamp.fromMillis(nowMs);
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
  return scheduled.docs[0] || expiredLeases.docs[0] || queued.docs[0] || null;
}

/**
 * One worker run (called every minute by the cron endpoint):
 *  1. works through due campaigns, several pages per run, within a time budget
 *  2. then collects push receipts that are due.
 */
export async function processDueNotificationWork(db, now = Date.now(), { budgetMs = tickBudgetMs() } = {}) {
  const startedAt = Date.now();
  const campaignBudget = Math.max(1000, budgetMs - RECEIPT_RESERVE_MS);
  let processed = 0;
  let failed = 0;
  let pages = 0;
  let recipients = 0;

  for (let i = 0; i < MAX_CAMPAIGNS_PER_RUN; i++) {
    if (Date.now() - startedAt >= campaignBudget) break;
    const selected = await findNextDueCampaign(db, i === 0 ? now : Date.now());
    if (!selected) break;
    try {
      const result = await processCampaignWithinBudget(db, selected.id, { budgetMs: campaignBudget, startedAt });
      if (result.pages === 0) break; // another worker holds the lease
      processed++;
      pages += result.pages;
      recipients += result.recipients;
      if (!result.done) break; // budget used up: continue on the next run
    } catch {
      failed++;
      break;
    }
  }

  let receipts = 0;
  try {
    receipts = await processReceipts(db, Date.now());
  } catch (error) {
    console.error("[notifications] Receipt processing failed", { error: safeError(error) });
    failed++;
  }
  return { processed, failed, receipts, pages, recipients };
}
