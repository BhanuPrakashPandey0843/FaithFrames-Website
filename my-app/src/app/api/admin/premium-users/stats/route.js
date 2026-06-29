import { NextResponse } from "next/server";
import { requireAdminSession } from "../../../../../lib/requireAdminSession";
import { getAdminDb, isFirebaseAdminConfigured } from "../../../../../lib/firebaseAdmin";

function unauthorized() {
  return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
}

export async function GET(req) {
  const session = await requireAdminSession(req);
  if (!session) return unauthorized();

  // If Firebase Admin isn't configured, return mock stats
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json({
      totalPremiumUsers: 5,
      totalRevenue: 119.96,
      activeSubscriptions: 3,
      expiryWarnings: 1,
    });
  }

  try {
    const db = getAdminDb();
    const snapshot = await db.collection("users").where("isPremium", "==", true).get();

    let totalPremiumUsers = 0;
    let totalRevenue = 0;
    let activeSubscriptions = 0;
    let expiryWarnings = 0;

    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      totalPremiumUsers++;
      totalRevenue += typeof data.amountPaid === "number" ? data.amountPaid : 0;
      
      if (data.subscriptionStatus === "Active") {
        activeSubscriptions++;
      }

      const expiry = data.expiryDate;
      if (expiry && expiry !== "N/A") {
        try {
          const expiryDate = new Date(expiry);
          if (!isNaN(expiryDate.getTime())) {
            if (expiryDate > now && expiryDate <= sevenDaysFromNow) {
              expiryWarnings++;
            }
          }
        } catch {
          // ignore parsing error
        }
      }
    });

    return NextResponse.json({
      totalPremiumUsers,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      activeSubscriptions,
      expiryWarnings,
    });
  } catch (err) {
    console.error("[api/admin/premium-users/stats GET]", err);
    return NextResponse.json({ message: "Failed to load premium stats" }, { status: 500 });
  }
}
