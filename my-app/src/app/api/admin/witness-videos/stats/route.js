import { NextResponse } from "next/server";
import { requireAdminSession } from "../../../../../lib/requireAdminSession";
import { getAdminDb, isFirebaseAdminConfigured } from "../../../../../lib/firebaseAdmin";

/**
 * Detailed dashboard stats for the Witness Videos module — separate from the
 * generic /api/admin/stats (which only needs a flat count for the main
 * dashboard tile). Aggregates counts + engagement totals in one pass so the
 * dashboard cards render from a single request.
 */
export async function GET(req) {
  const session = await requireAdminSession(req);
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json({
      totalVideos: 6,
      activeVideos: 5,
      inactiveVideos: 1,
      totalViews: 1240,
      totalLikes: 312,
      totalDislikes: 8,
      totalSaved: 47,
      totalBanners: 3,
      activeBanners: 3,
      recentlyAdded: [],
    });
  }

  try {
    const db = getAdminDb();
    const [videosSnap, bannersSnap, savedGroupSnap] = await Promise.all([
      db.collection("witnessVideos").get(),
      db.collection("witnessCarousel").get(),
      db.collectionGroup("savedVideos").count().get().catch(() => null),
    ]);

    let activeVideos = 0;
    let totalViews = 0;
    let totalLikes = 0;
    let totalDislikes = 0;
    const videos = [];

    videosSnap.docs.forEach((docSnap) => {
      const data = docSnap.data();
      if (data.isActive !== false) activeVideos += 1;
      totalViews += Number(data.views || 0);
      totalLikes += Number(data.likes || 0);
      totalDislikes += Number(data.dislikes || 0);
      videos.push({
        id: docSnap.id,
        title: data.title || "",
        thumbnail: data.thumbnail || "",
        views: Number(data.views || 0),
        isActive: data.isActive !== false,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      });
    });

    const activeBanners = bannersSnap.docs.filter((d) => d.data().isActive !== false).length;

    const recentlyAdded = videos
      .filter((v) => v.createdAt)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    return NextResponse.json({
      totalVideos: videosSnap.size,
      activeVideos,
      inactiveVideos: videosSnap.size - activeVideos,
      totalViews,
      totalLikes,
      totalDislikes,
      totalSaved: savedGroupSnap ? savedGroupSnap.data().count : 0,
      totalBanners: bannersSnap.size,
      activeBanners,
      recentlyAdded,
    });
  } catch (err) {
    console.error("[admin/witness-videos/stats]", err);
    return NextResponse.json({ message: "Failed to load witness video stats" }, { status: 500 });
  }
}
