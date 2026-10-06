import { NextResponse } from "next/server";
import { requireAdminSession } from "../../../../lib/requireAdminSession";
import { getAdminDb, isFirebaseAdminConfigured } from "../../../../lib/firebaseAdmin";
import { getMockPremiumUsers, loadPremiumMembers } from "../../../../lib/membership";

function unauthorized() {
  return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
}

/**
 * Premium users = everyone who has successfully paid for a subscription.
 * Built from the real payment records (see lib/membership.js); nothing is
 * seeded or written to Firestore from here.
 */
export async function GET(req) {
  const session = await requireAdminSession(req);
  if (!session) return unauthorized();

  // Local development without Firebase Admin credentials: show sample rows.
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json({ premiumUsers: getMockPremiumUsers() });
  }

  try {
    const premiumUsers = await loadPremiumMembers(getAdminDb());
    return NextResponse.json({ premiumUsers });
  } catch (err) {
    console.error("[api/admin/premium-users GET]", err);
    return NextResponse.json({ message: "Failed to load premium users" }, { status: 500 });
  }
}
