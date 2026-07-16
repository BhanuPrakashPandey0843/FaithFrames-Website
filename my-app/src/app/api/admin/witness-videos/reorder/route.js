import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireAdminSession } from "../../../../../lib/requireAdminSession";
import { getAdminDb, isFirebaseAdminConfigured } from "../../../../../lib/firebaseAdmin";

const REORDERABLE_COLLECTIONS = new Set([
  "witnessCarousel", "witnessVideos", "bibleBanners", "bibleReadingPlans",
  "bibleContent", "bibleCarousel",
  "jesusContent", "jesusCarousel",
  "prayersContent", "prayersCarousel",
  "worshipContent", "worshipCarousel"
]);

/**
 * Batch-updates displayOrder for a set of documents in a single Firestore
 * batch write — used by the Carousel Manager's drag-and-drop reordering
 * so dragging N banners costs one round trip instead of N.
 * Body: { collection: "witnessCarousel", items: [{ id, displayOrder }, ...] }
 */
export async function POST(req) {
  const session = await requireAdminSession(req);
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json({ message: "Firebase Admin is not configured." }, { status: 500 });
  }

  const { collection, items } = await req.json().catch(() => ({}));
  if (!REORDERABLE_COLLECTIONS.has(collection)) {
    return NextResponse.json({ message: "Invalid collection" }, { status: 400 });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ message: "No items to reorder" }, { status: 400 });
  }
  if (items.length > 200) {
    return NextResponse.json({ message: "Too many items in one reorder batch" }, { status: 400 });
  }

  try {
    const db = getAdminDb();
    const batch = db.batch();
    items.forEach(({ id, displayOrder }) => {
      if (!id) return;
      batch.update(db.collection(collection).doc(id), {
        displayOrder: Number(displayOrder) || 0,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
    await batch.commit();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/witness-videos/reorder]", err);
    return NextResponse.json({ message: "Failed to reorder items" }, { status: 500 });
  }
}
