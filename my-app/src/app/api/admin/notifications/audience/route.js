import { NextResponse } from "next/server";
import { getAdminDb, isFirebaseAdminConfigured } from "../../../../../lib/firebaseAdmin";
import { requireAdminSession } from "../../../../../lib/requireAdminSession";
import { countAudience } from "../../../../../lib/notifications/audience";
import { AUDIENCE_TYPES, LIMITS, SEGMENT_IDS } from "../../../../../lib/notifications/constants";
import { isValidId } from "../../../../../lib/notifications/validate";

export const runtime = "nodejs";

export async function GET(req) {
  const session = await requireAdminSession(req);
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json({ message: "Firebase Admin is not configured." }, { status: 503 });
  }

  const search = new URL(req.url).searchParams.get("q")?.trim() || "";
  if (search.length < 2 || search.length > 80) {
    return NextResponse.json({ users: [] });
  }

  try {
    const db = getAdminDb();
    const prefix = search.toLowerCase();
    const [byName, byEmail] = await Promise.all([
      db.collection("users")
        .orderBy("name")
        .startAt(search)
        .endAt(`${search}\uf8ff`)
        .limit(12)
        .get(),
      db.collection("users")
        .orderBy("email")
        .startAt(prefix)
        .endAt(`${prefix}\uf8ff`)
        .limit(12)
        .get(),
    ]);
    const users = new Map();
    [...byName.docs, ...byEmail.docs].forEach((snapshot) => {
      const data = snapshot.data();
      users.set(snapshot.id, {
        id: snapshot.id,
        name: String(data.name || "").slice(0, 120),
        email: String(data.email || "").slice(0, 254),
      });
    });
    return NextResponse.json({ users: [...users.values()].slice(0, 20) });
  } catch (error) {
    console.error("[api/admin/notifications/audience GET]", String(error?.message || error).slice(0, 200));
    return NextResponse.json({ message: "Failed to search users." }, { status: 500 });
  }
}

export async function POST(req) {
  const session = await requireAdminSession(req);
  if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json({ message: "Firebase Admin is not configured." }, { status: 503 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Request body must be valid JSON." }, { status: 400 });
  }
  const audience = body?.audience;
  if (!audience || !AUDIENCE_TYPES.includes(audience.type)) {
    return NextResponse.json({ message: "Choose a valid audience." }, { status: 400 });
  }
  if (audience.type === "segment" && !SEGMENT_IDS.includes(audience.segment)) {
    return NextResponse.json({ message: "Choose a valid segment." }, { status: 400 });
  }
  if (audience.type === "users") {
    const userIds = Array.isArray(audience.userIds) ? [...new Set(audience.userIds)] : [];
    if (!userIds.length || userIds.length > LIMITS.maxExplicitUsers || userIds.some((id) => !isValidId(id))) {
      return NextResponse.json({ message: `Select between 1 and ${LIMITS.maxExplicitUsers} valid users.` }, { status: 400 });
    }
    audience.userIds = userIds;
  }

  try {
    const result = await countAudience(getAdminDb(), audience);
    return NextResponse.json({ audience: result });
  } catch (error) {
    console.error("[api/admin/notifications/audience POST]", String(error?.message || error).slice(0, 200));
    return NextResponse.json({ message: "Failed to count the selected audience." }, { status: 500 });
  }
}
