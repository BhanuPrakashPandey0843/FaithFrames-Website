import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireAdminSession } from "../../../../lib/requireAdminSession";
import { getAdminDb, isFirebaseAdminConfigured } from "../../../../lib/firebaseAdmin";
import { USER_PRAYER_CATEGORIES, USER_PRAYER_STATUSES } from "../../../../lib/adminCollections";

function toDate(value) {
  if (!value) return null;
  if (typeof value === "string") {
    const d = new Date(value);
    return isNaN(d) ? null : d;
  }
  if (typeof value === "object" && typeof value.toDate === "function") {
    return value.toDate();
  }
  const d = new Date(value);
  return isNaN(d) ? null : d;
}

function unauthorized() {
  return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
}

// ─── GET: list / search / filter / sort / pagination ────────────────────────
export async function GET(req) {
  const session = await requireAdminSession(req);
  if (!session) return unauthorized();

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize")) || 20));
  const search = (searchParams.get("search") || "").trim().toLowerCase();
  const category = (searchParams.get("category") || "").trim();
  const status = (searchParams.get("status") || "").trim();
  const sort = (searchParams.get("sort") || "newest").toLowerCase();
  const date = (searchParams.get("date") || "").trim(); // YYYY-MM-DD

  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json({ items: [], total: 0, page, pageSize });
  }

  try {
    const db = getAdminDb();
    const orderField = "createdAt";
    const orderDir = sort === "oldest" ? "asc" : "desc";
    const snapshot = await db.collection("userPrayers").orderBy(orderField, orderDir).get();

    let all = [];
    snapshot.forEach((docSnap) => {
      all.push({
        id: docSnap.id,
        ...docSnap.data(),
      });
    });

    // Filter by category
    if (category && category !== "all") {
      all = all.filter((p) => p.category === category);
    }

    // Filter by status
    if (status && status !== "all") {
      all = all.filter((p) => (p.status || "pending") === status);
    }

    // Filter by date
    if (date) {
      const dayStart = new Date(date + "T00:00:00");
      const dayEnd = new Date(date + "T23:59:59.999");
      all = all.filter((p) => {
        const d = toDate(p.createdAt);
        return d && d >= dayStart && d <= dayEnd;
      });
    }

    // Search
    if (search) {
      all = all.filter((p) => {
        return (
          (p.title || "").toLowerCase().includes(search) ||
          (p.description || "").toLowerCase().includes(search) ||
          (p.content || "").toLowerCase().includes(search) ||
          (p.username || "").toLowerCase().includes(search) ||
          (p.category || "").toLowerCase().includes(search)
        );
      });
    }

    const total = all.length;

    // Pagination
    const start = (page - 1) * pageSize;
    const pageItems = all.slice(start, start + pageSize).map((p) => ({
      ...p,
      createdAt: toDate(p.createdAt)?.toISOString() || null,
      updatedAt: toDate(p.updatedAt)?.toISOString() || null,
    }));

    return NextResponse.json({
      items: pageItems,
      total,
      page,
      pageSize,
      categories: USER_PRAYER_CATEGORIES,
      statuses: USER_PRAYER_STATUSES,
    });
  } catch (err) {
    console.error("[admin/user-prayers GET]", err);
    return NextResponse.json({ message: "Failed to load prayers" }, { status: 500 });
  }
}

// ─── PATCH: approve / reject / set status ───────────────────────────────────
export async function PATCH(req) {
  const session = await requireAdminSession(req);
  if (!session) return unauthorized();
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json(
      { message: "Firebase Admin not configured" },
      { status: 500 }
    );
  }

  const { id, data } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ message: "Missing id" }, { status: 400 });
  if (!data || typeof data !== "object") {
    return NextResponse.json({ message: "Missing data" }, { status: 400 });
  }

  const status = String(data.status || "").trim();
  if (!USER_PRAYER_STATUSES.includes(status)) {
    return NextResponse.json(
      { message: `status must be one of: ${USER_PRAYER_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const db = getAdminDb();
    await db.collection("userPrayers").doc(id).update({
      status,
      moderatedAt: FieldValue.serverTimestamp(),
      moderatedBy: session.email || "admin",
      updatedAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error("[admin/user-prayers PATCH]", err);
    return NextResponse.json({ message: "Failed to update prayer" }, { status: 500 });
  }
}

// ─── DELETE: permanently remove a prayer ─────────────────────────────────────
export async function DELETE(req) {
  const session = await requireAdminSession(req);
  if (!session) return unauthorized();
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json(
      { message: "Firebase Admin not configured" },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ message: "Missing id" }, { status: 400 });

  try {
    const db = getAdminDb();
    await db.collection("userPrayers").doc(id).delete();
    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error("[admin/user-prayers DELETE]", err);
    return NextResponse.json({ message: "Failed to delete prayer" }, { status: 500 });
  }
}
