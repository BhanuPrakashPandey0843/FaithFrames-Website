import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb, isFirebaseAdminConfigured } from "../../../../../lib/firebaseAdmin";
import { requireAdminSession } from "../../../../../lib/requireAdminSession";
import { campaignsCol, serializeDoc, serializeValue } from "../../../../../lib/notifications/common";

export const runtime = "nodejs";

export async function GET(req, { params }) {
  const session = await requireAdminSession(req);
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json({ message: "Firebase Admin is not configured." }, { status: 503 });
  }

  const { id } = await params;
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) {
    return NextResponse.json({ message: "Invalid campaign id." }, { status: 400 });
  }

  try {
    const db = getAdminDb();
    const ref = campaignsCol(db).doc(id);
    const snapshot = await ref.get();
    if (!snapshot.exists) return NextResponse.json({ message: "Notification campaign not found." }, { status: 404 });
    const [accepted, failed, handedOff, inbox, read, opened, retryable] = await Promise.all([
      db.collection("notificationDeliveries").where("campaignId", "==", id).where("status", "==", "accepted").count().get(),
      db.collection("notificationDeliveries").where("campaignId", "==", id).where("status", "==", "failed").count().get(),
      db.collection("notificationDeliveries").where("campaignId", "==", id).where("status", "==", "handed_off").count().get(),
      db.collectionGroup("notifications").where("campaignId", "==", id).count().get(),
      db.collectionGroup("notifications").where("campaignId", "==", id).where("read", "==", true).count().get(),
      db.collectionGroup("notifications").where("campaignId", "==", id).where("opened", "==", true).count().get(),
      db.collection("notificationDeliveries").where("campaignId", "==", id).where("status", "==", "failed").where("retryable", "==", true).count().get(),
    ]);
    return NextResponse.json({
      campaign: serializeDoc(snapshot),
      delivery: {
        accepted: accepted.data().count,
        providerHandedOff: handedOff.data().count,
        failed: failed.data().count,
        retryable: retryable.data().count,
        inbox: inbox.data().count,
        read: read.data().count,
        opened: opened.data().count,
      },
    });
  } catch (error) {
    console.error("[api/admin/notifications/[id] GET]", String(error?.message || error).slice(0, 200));
    return NextResponse.json({ message: "Failed to load notification details." }, { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  const session = await requireAdminSession(req);
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json({ message: "Firebase Admin is not configured." }, { status: 503 });
  }

  const { id } = await params;
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(id)) {
    return NextResponse.json({ message: "Invalid campaign id." }, { status: 400 });
  }
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Request body must be valid JSON." }, { status: 400 });
  }
  if (!["cancel", "retry"].includes(body?.action)) {
    return NextResponse.json({ message: "Choose a supported campaign action." }, { status: 400 });
  }

  try {
    const db = getAdminDb();
    const ref = campaignsCol(db).doc(id);
    const retryableCount = body.action === "retry"
      ? await db.collection("notificationDeliveries")
        .where("campaignId", "==", id)
        .where("status", "==", "failed")
        .where("retryable", "==", true)
        .count()
        .get()
      : null;
    await db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists) {
        const error = new Error("NOT_FOUND");
        error.status = 404;
        throw error;
      }
      if (body.action === "cancel") {
        if (snapshot.get("status") !== "scheduled") {
          const error = new Error("Only scheduled notifications can be cancelled.");
          error.status = 409;
          throw error;
        }
        transaction.update(ref, {
          status: "cancelled",
          cancelledAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
        return;
      }
      if (!["sent", "failed"].includes(snapshot.get("status"))) {
        const error = new Error("Only completed campaigns can be retried.");
        error.status = 409;
        throw error;
      }
      const retryPushFailures = retryableCount.data().count > 0;
      const retryProcessingFailure = snapshot.get("status") === "failed" && Boolean(snapshot.get("lastError"));
      if (!retryPushFailures && !retryProcessingFailure) {
        const error = new Error("There are no retryable push failures.");
        error.status = 409;
        throw error;
      }
      transaction.update(ref, {
        status: "queued",
        cursor: retryPushFailures ? null : (snapshot.get("cursor") ?? null),
        retryFailuresOnly: retryPushFailures,
        updatedAt: FieldValue.serverTimestamp(),
        lastRetryRequestedAt: FieldValue.serverTimestamp(),
        lastRetryRequestedBy: String(session.email || "admin").slice(0, 254),
      });
    });
    const updated = await ref.get();
    return NextResponse.json({ success: true, campaign: serializeValue({ id, ...updated.data() }) });
  } catch (error) {
    const status = Number(error?.status) || 500;
    if (status >= 500) console.error("[api/admin/notifications/[id] PATCH]", String(error?.message || error).slice(0, 200));
    return NextResponse.json({
      message: status >= 500 ? "Failed to update the notification campaign." : error.message,
    }, { status });
  }
}
