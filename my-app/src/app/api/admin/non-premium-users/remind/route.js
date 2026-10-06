import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireAdminSession } from "../../../../../lib/requireAdminSession";
import { getAdminDb, isFirebaseAdminConfigured } from "../../../../../lib/firebaseAdmin";
import { getPremiumUserIds, toMillis } from "../../../../../lib/membership";
import {
  DEFAULT_REMINDER_MESSAGE,
  DEFAULT_REMINDER_TITLE,
  REMINDER_COOLDOWN_HOURS,
  REMINDER_MAX_USERS_PER_REQUEST,
  REMINDER_MESSAGE_MAX,
  REMINDER_TITLE_MAX,
} from "../../../../../lib/reminderConfig";

function unauthorized() {
  return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
}

function sanitize(value, max) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function firstName(name) {
  return String(name || "").trim().split(/\s+/)[0] || "there";
}

/**
 * Sends an in-app "go premium" reminder to the selected non-premium users.
 *
 * Body: { userIds: string[], title?: string, message?: string, force?: boolean }
 *
 * For every eligible user this writes one `notifications` document (shown in
 * the app's Notifications screen) and records lastReminderAt / reminderCount on
 * the user. Users are skipped when they:
 *   - no longer exist, or have paid in the meantime (re-checked server-side),
 *   - were already reminded within REMINDER_COOLDOWN_HOURS (unless `force`),
 *   - switched off "Premium Content" notifications in the app.
 */
export async function POST(req) {
  const session = await requireAdminSession(req);
  if (!session) return unauthorized();
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json({ message: "Firebase Admin is not configured." }, { status: 500 });
  }

  const body = await req.json().catch(() => null);
  if (!body || !Array.isArray(body.userIds)) {
    return NextResponse.json({ message: "userIds must be an array." }, { status: 400 });
  }

  const userIds = [
    ...new Set(
      body.userIds.filter(
        (id) => typeof id === "string" && id.length > 0 && id.length <= 128 && !id.includes("/")
      )
    ),
  ];
  if (userIds.length === 0) {
    return NextResponse.json({ message: "Select at least one user." }, { status: 400 });
  }
  if (userIds.length > REMINDER_MAX_USERS_PER_REQUEST) {
    return NextResponse.json(
      { message: `You can remind at most ${REMINDER_MAX_USERS_PER_REQUEST} users per request.` },
      { status: 400 }
    );
  }

  const titleTemplate = sanitize(body.title, REMINDER_TITLE_MAX) || DEFAULT_REMINDER_TITLE;
  const messageTemplate = sanitize(body.message, REMINDER_MESSAGE_MAX) || DEFAULT_REMINDER_MESSAGE;
  const force = body.force === true;

  try {
    const db = getAdminDb();

    const [premiumIds, userSnaps, prefSnaps] = await Promise.all([
      getPremiumUserIds(db),
      db.getAll(...userIds.map((id) => db.collection("users").doc(id)), {
        fieldMask: ["name", "lastReminderAt"],
      }),
      db.getAll(...userIds.map((id) => db.collection("notification_preferences").doc(id)), {
        fieldMask: ["premium"],
      }),
    ]);

    const premiumPref = new Map(prefSnaps.map((snap) => [snap.id, snap.exists ? snap.get("premium") : undefined]));
    const cooldownMs = REMINDER_COOLDOWN_HOURS * 60 * 60 * 1000;
    const now = Date.now();

    const skipped = { premium: 0, missing: 0, recentlyReminded: 0, optedOut: 0 };
    const targets = [];

    userSnaps.forEach((snap) => {
      if (!snap.exists) {
        skipped.missing++;
        return;
      }
      if (premiumIds.has(snap.id)) {
        skipped.premium++;
        return;
      }
      const last = toMillis(snap.get("lastReminderAt"));
      if (!force && last !== null && now - last < cooldownMs) {
        skipped.recentlyReminded++;
        return;
      }
      // "Premium Content" is the app's notification category for subscription messages
      // (default on). An explicit `false` means the user opted out.
      if (premiumPref.get(snap.id) === false) {
        skipped.optedOut++;
        return;
      }
      targets.push({ id: snap.id, name: snap.get("name") });
    });

    if (targets.length > 0) {
      const batch = db.batch();
      targets.forEach((target) => {
        const name = firstName(target.name);
        batch.set(db.collection("notifications").doc(), {
          userId: target.id,
          type: "subscription_reminder",
          title: titleTemplate.replaceAll("{name}", name).slice(0, 120),
          body: messageTemplate.replaceAll("{name}", name).slice(0, 500),
          icon: "diamond-outline",
          read: false,
          createdAt: FieldValue.serverTimestamp(),
          sentBy: session.email || "admin",
        });
        // updatedAt is intentionally left alone: it doubles as "last active" in the admin list.
        batch.update(db.collection("users").doc(target.id), {
          lastReminderAt: FieldValue.serverTimestamp(),
          reminderCount: FieldValue.increment(1),
        });
      });
      await batch.commit();
    }

    return NextResponse.json({
      success: true,
      total: userIds.length,
      sent: targets.length,
      skipped,
    });
  } catch (err) {
    console.error("[api/admin/non-premium-users/remind POST]", err);
    return NextResponse.json({ message: "Failed to send reminders" }, { status: 500 });
  }
}
