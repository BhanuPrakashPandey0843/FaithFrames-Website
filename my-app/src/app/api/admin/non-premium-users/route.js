import { NextResponse } from "next/server";
import { requireAdminSession } from "../../../../lib/requireAdminSession";
import { getAdminDb, isFirebaseAdminConfigured } from "../../../../lib/firebaseAdmin";
import { getMockNonPremiumUsers, getMockPremiumUsers, loadNonPremiumUsers } from "../../../../lib/membership";

function unauthorized() {
  return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
}

/**
 * Non-premium users = accounts that exist but have never completed a payment.
 * Each row also carries its reminder history (lastReminderAt / reminderCount).
 */
export async function GET(req) {
  const session = await requireAdminSession(req);
  if (!session) return unauthorized();

  // Local development without Firebase Admin credentials: show sample rows.
  if (!isFirebaseAdminConfigured()) {
    const users = getMockNonPremiumUsers();
    return NextResponse.json({
      users,
      counts: {
        total: users.length + getMockPremiumUsers().length,
        premium: getMockPremiumUsers().length,
        nonPremium: users.length,
      },
    });
  }

  try {
    const result = await loadNonPremiumUsers(getAdminDb());
    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/admin/non-premium-users GET]", err);
    return NextResponse.json({ message: "Failed to load non-premium users" }, { status: 500 });
  }
}
