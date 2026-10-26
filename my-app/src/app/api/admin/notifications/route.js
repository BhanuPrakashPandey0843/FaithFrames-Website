import { NextResponse } from "next/server";
import { createHash, randomUUID } from "node:crypto";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminDb, isFirebaseAdminConfigured } from "../../../../lib/firebaseAdmin";
import { requireAdminSession } from "../../../../lib/requireAdminSession";
import {
  ApiError,
  campaignsCol,
  errorToResponse,
  safeError,
  serializeDoc,
  serializeValue,
  zeroStats,
} from "../../../../lib/notifications/common";
import { countAudience } from "../../../../lib/notifications/audience";
import {
  CAMPAIGN_STATUSES,
  COLLECTIONS,
  LIMITS,
  NOTIFICATION_CATEGORIES,
} from "../../../../lib/notifications/constants";
import { validateCampaignInput } from "../../../../lib/notifications/validate";

export const runtime = "nodejs";

const hash = (value) => createHash("sha256").update(value).digest("hex");

function unauthorized() {
  return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
}

async function campaignCount(query) {
  const result = await query.count().get();
  return result.data().count;
}

export async function GET(req) {
  const session = await requireAdminSession(req);
  if (!session) return unauthorized();
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json({ message: "Firebase Admin is not configured." }, { status: 503 });
  }

  try {
    const db = getAdminDb();
    const { searchParams } = new URL(req.url);
    const requestedLimit = Number(searchParams.get("limit") || 25);
    const limit = Number.isInteger(requestedLimit) ? Math.max(1, Math.min(requestedLimit, 50)) : 25;
    const cursor = searchParams.get("cursor");
    const status = searchParams.get("status") || "";
    const category = searchParams.get("category") || "";
    const search = searchParams.get("q")?.trim().toLowerCase() || "";
    if (status && !CAMPAIGN_STATUSES.includes(status)) {
      return NextResponse.json({ message: "Invalid status filter." }, { status: 400 });
    }
    if (category && !NOTIFICATION_CATEGORIES.some((item) => item.id === category)) {
      return NextResponse.json({ message: "Invalid category filter." }, { status: 400 });
    }
    let query = campaignsCol(db);
    if (status) query = query.where("status", "==", status);
    if (category) query = query.where("category", "==", category);
    if (search.length >= 2) {
      query = query
        .where("searchTitle", ">=", search)
        .where("searchTitle", "<=", `${search}\uf8ff`)
        .orderBy("searchTitle")
        .orderBy("createdAt", "desc");
    } else {
      query = query.orderBy("createdAt", "desc");
    }
    if (cursor && /^[A-Za-z0-9_-]{1,128}$/.test(cursor)) {
      const cursorDoc = await campaignsCol(db).doc(cursor).get();
      if (cursorDoc.exists) query = query.startAfter(cursorDoc);
    }
    const [snapshot, aggregateDoc, total, sent, failed, scheduled, sentToday] = await Promise.all([
      query.limit(limit + 1).get(),
      db.collection(COLLECTIONS.settings).doc("aggregate").get(),
      campaignCount(campaignsCol(db)),
      campaignCount(campaignsCol(db).where("status", "==", "sent")),
      campaignCount(campaignsCol(db).where("status", "==", "failed")),
      campaignCount(campaignsCol(db).where("status", "==", "scheduled")),
      campaignCount(campaignsCol(db).where("sentAt", ">=", Timestamp.fromMillis(new Date().setHours(0, 0, 0, 0)))),
    ]);
    const hasMore = snapshot.docs.length > limit;
    const docs = snapshot.docs.slice(0, limit);
    return NextResponse.json({
      campaigns: docs.map(serializeDoc),
      nextCursor: hasMore ? docs[docs.length - 1].id : null,
      stats: {
        total,
        sent,
        sentToday,
        failed,
        scheduled,
        recipients: Number(aggregateDoc.get("recipients") || 0),
        pushAccepted: Number(aggregateDoc.get("pushAccepted") || 0),
        pushRejected: Number(aggregateDoc.get("pushRejected") || 0),
      },
    });
  } catch (error) {
    console.error("[api/admin/notifications GET]", safeError(error));
    return NextResponse.json({ message: "Failed to load notification history." }, { status: 500 });
  }
}

export async function POST(req) {
  const session = await requireAdminSession(req);
  if (!session) return unauthorized();
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json({ message: "Firebase Admin is not configured." }, { status: 503 });
  }

  let raw;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ message: "Request body must be valid JSON." }, { status: 400 });
  }
  const validated = validateCampaignInput(raw);
  if (!validated.ok) {
    return NextResponse.json({ message: "Please correct the highlighted fields.", errors: validated.errors }, { status: 400 });
  }

  try {
    const db = getAdminDb();
    const audience = await countAudience(db, validated.value.audience);
    if (
      validated.value.schedule.mode !== "draft" &&
      audience.total >= LIMITS.largeAudienceThreshold &&
      raw.confirmedLargeAudience !== true
    ) {
      return NextResponse.json({
        message: "Please confirm this large audience before sending.",
        requiresConfirmation: true,
        audience,
      }, { status: 409 });
    }

    const idempotencyKey = req.headers.get("idempotency-key") || randomUUID();
    if (idempotencyKey.length > 120 || /[\u0000-\u001f]/.test(idempotencyKey)) {
      return NextResponse.json({ message: "The idempotency key is invalid." }, { status: 400 });
    }
    const campaignRef = campaignsCol(db).doc();
    const idempotencyRef = db.collection("notificationIdempotency").doc(
      hash(`${String(session.email || "admin").toLowerCase()}:${idempotencyKey}`)
    );
    const rateLimitRef = db.collection(COLLECTIONS.rateLimits).doc(
      hash(String(session.email || "admin").toLowerCase())
    );
    const payloadFingerprint = hash(JSON.stringify(validated.value));
    const now = Date.now();

    const result = await db.runTransaction(async (transaction) => {
      const [existingIdempotency, rateLimit] = await Promise.all([
        transaction.get(idempotencyRef),
        transaction.get(rateLimitRef),
      ]);
      if (existingIdempotency.exists) {
        const existing = existingIdempotency.data();
        if (existing.fingerprint !== payloadFingerprint) {
          throw new ApiError(409, "IDEMPOTENCY_CONFLICT", "This request key was already used for different content.");
        }
        return { id: existing.campaignId, duplicate: true };
      }

      const windowStart = Number(rateLimit.get("windowStart") || 0);
      const count = windowStart > now - 60 * 60 * 1000 ? Number(rateLimit.get("count") || 0) : 0;
      if (count >= 10) {
        throw new ApiError(429, "RATE_LIMITED", "Too many notification campaigns. Try again later.");
      }

      const value = validated.value;
      const status = value.schedule.mode === "draft"
        ? "draft"
        : value.schedule.mode === "later"
          ? "scheduled"
          : "queued";
      const campaign = {
        ...value,
        id: campaignRef.id,
        searchTitle: value.title.toLowerCase(),
        status,
        cursor: null,
        retryFailuresOnly: false,
        scheduledFor: value.schedule.scheduledFor === null
          ? null
          : Timestamp.fromMillis(value.schedule.scheduledFor),
        createdBy: String(session.email || "admin").slice(0, 254),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        audienceEstimate: audience,
        stats: zeroStats(),
      };
      transaction.create(campaignRef, campaign);
      transaction.create(idempotencyRef, {
        campaignId: campaignRef.id,
        fingerprint: payloadFingerprint,
        createdAt: FieldValue.serverTimestamp(),
      });
      transaction.set(rateLimitRef, {
        windowStart: count === 0 ? now : windowStart,
        count: count + 1,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { id: campaignRef.id, duplicate: false };
    });

    const createdCampaign = await campaignsCol(db).doc(result.id).get();
    return NextResponse.json({
      success: true,
      duplicate: result.duplicate,
      campaign: serializeValue({ id: createdCampaign.id, ...createdCampaign.data() }),
      audience,
    }, { status: result.duplicate ? 200 : 201 });
  } catch (error) {
    const response = errorToResponse(error);
    if (response.status >= 500) {
      console.error("[api/admin/notifications POST]", safeError(error));
    }
    return NextResponse.json(response.body, { status: response.status });
  }
}
