import { NextResponse } from "next/server";
import { requireAdminSession } from "../../../../lib/requireAdminSession";
import { getAdminDb, isFirebaseAdminConfigured } from "../../../../lib/firebaseAdmin";
import { ADMIN_STATS_COLLECTIONS } from "../../../../lib/adminCollections";

function formatDay(date) {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export async function GET(req) {
  const session = await requireAdminSession(req);
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json(
      {
        message:
          "Firebase Admin is not configured. Add FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_ADMIN_* credentials.",
      },
      { status: 500 }
    );
  }

  try {
    const db = getAdminDb();
    const counts = {};

    await Promise.all(
      ADMIN_STATS_COLLECTIONS.map(async ({ key, collection }) => {
        const snapshot = await db.collection(collection).count().get();
        counts[key] = snapshot.data().count;
      })
    );

    const usersSnapshot = await db.collection("users").get();
    counts.users = usersSnapshot.size;

    const dailyCounts = {};
    usersSnapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      const created =
        data.updatedAt?.toDate?.() ||
        data.createdAt?.toDate?.() ||
        new Date();
      const day = formatDay(created);
      dailyCounts[day] = (dailyCounts[day] || 0) + 1;
    });

    const userGrowth = Object.keys(dailyCounts).map((day) => ({
      day,
      users: dailyCounts[day],
    }));

    return NextResponse.json({
      counts,
      userGrowth,
    });
  } catch (err) {
    console.error("[admin/stats]", err);
    return NextResponse.json({ message: "Failed to load admin stats" }, { status: 500 });
  }
}
