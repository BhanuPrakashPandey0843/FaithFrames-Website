import { NextResponse } from "next/server";
import { requireAdminSession } from "../../../../../lib/requireAdminSession";
import { getAdminDb, isFirebaseAdminConfigured } from "../../../../../lib/firebaseAdmin";
import { USER_PRAYER_CATEGORIES } from "../../../../../lib/adminCollections";

function startOfDay(d = new Date()) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
}

export async function GET(req) {
  const session = await requireAdminSession(req);
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json({
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      today: 0,
      thisWeek: 0,
      byCategory: USER_PRAYER_CATEGORIES.reduce((acc, c) => ({ ...acc, [c]: 0 }), {}),
      byDate: [],
    });
  }

  try {
    const db = getAdminDb();
    const snap = await db.collection("userPrayers").orderBy("createdAt", "desc").get();

    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 6);

    let total = 0;
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let today = 0;
    let thisWeek = 0;
    const byCategory = USER_PRAYER_CATEGORIES.reduce((acc, c) => ({ ...acc, [c]: 0 }), {});
    const byDateMap = new Map();

    snap.forEach((doc) => {
      total++;
      const data = doc.data();
      const status = String(data.status || "pending");
      if (status === "pending") pending++;
      else if (status === "approved") approved++;
      else if (status === "rejected") rejected++;

      if (data.category && byCategory[data.category] !== undefined) {
        byCategory[data.category]++;
      }

      const created = data.createdAt ? new Date(data.createdAt.toDate ? data.createdAt.toDate() : data.createdAt) : null;
      if (created && !isNaN(created)) {
        if (created >= todayStart) today++;
        if (created >= weekStart) {
          const key = created.toISOString().slice(0, 10);
          byDateMap.set(key, (byDateMap.get(key) || 0) + 1);
        }
      }
    });

    const byDate = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayStart);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      byDate.push({ date: key, count: byDateMap.get(key) || 0, label: d.toLocaleDateString(undefined, { weekday: "short" }) });
    }

    return NextResponse.json({
      total,
      pending,
      approved,
      rejected,
      today,
      thisWeek,
      byCategory,
      byDate,
    });
  } catch (err) {
    console.error("[admin/user-prayers/stats GET]", err);
    return NextResponse.json({ message: "Failed to load stats" }, { status: 500 });
  }
}
