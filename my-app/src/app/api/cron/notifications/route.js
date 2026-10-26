import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getAdminDb, isFirebaseAdminConfigured } from "../../../../lib/firebaseAdmin";
import { processDueNotificationWork } from "../../../../lib/notifications/dispatcher";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isAuthorized(req, secret) {
  const supplied = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || "";
  const expected = Buffer.from(secret);
  const actual = Buffer.from(supplied);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function POST(req) {
  const secret = process.env.NOTIFICATION_CRON_SECRET;
  if (!secret || !isAuthorized(req, secret)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json({ message: "Firebase Admin is not configured." }, { status: 503 });
  }

  try {
    const result = await processDueNotificationWork(getAdminDb());
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("[api/cron/notifications POST]", String(error?.message || error).slice(0, 200));
    return NextResponse.json({ message: "Notification processing failed." }, { status: 500 });
  }
}
