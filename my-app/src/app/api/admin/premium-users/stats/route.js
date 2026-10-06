import { NextResponse } from "next/server";
import { requireAdminSession } from "../../../../../lib/requireAdminSession";
import { getAdminDb, isFirebaseAdminConfigured } from "../../../../../lib/firebaseAdmin";
import {
  computePremiumStats,
  getMockNonPremiumUsers,
  getMockPremiumUsers,
  loadPremiumMembers,
} from "../../../../../lib/membership";

function unauthorized() {
  return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
}

export async function GET(req) {
  const session = await requireAdminSession(req);
  if (!session) return unauthorized();

  // Local development without Firebase Admin credentials: derive stats from the sample rows.
  if (!isFirebaseAdminConfigured()) {
    const mockPremium = getMockPremiumUsers();
    const mockNonPremium = getMockNonPremiumUsers();
    return NextResponse.json({
      ...computePremiumStats(mockPremium),
      totalUsers: mockPremium.length + mockNonPremium.length,
      nonPremiumUsers: mockNonPremium.length,
    });
  }

  try {
    const db = getAdminDb();
    const [members, usersCount] = await Promise.all([
      loadPremiumMembers(db),
      db.collection("users").count().get(),
    ]);

    const totalUsers = usersCount.data().count;
    // Paying users whose profile document was deleted are not part of `users`.
    const premiumProfiles = members.filter((member) => !member.profileMissing).length;

    return NextResponse.json({
      ...computePremiumStats(members),
      totalUsers,
      nonPremiumUsers: Math.max(0, totalUsers - premiumProfiles),
    });
  } catch (err) {
    console.error("[api/admin/premium-users/stats GET]", err);
    return NextResponse.json({ message: "Failed to load premium stats" }, { status: 500 });
  }
}
