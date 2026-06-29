import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireAdminSession } from "../../../../lib/requireAdminSession";
import { getAdminDb, isFirebaseAdminConfigured } from "../../../../lib/firebaseAdmin";

function unauthorized() {
  return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
}

export async function GET(req) {
  const session = await requireAdminSession(req);
  if (!session) return unauthorized();
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json({ 
      users: [
        { id: "mock-user-1", name: "Sarah Jenkins", email: "sarah.j@example.com", address: "123 Faith St, Medina", photoURL: "https://i.pravatar.cc/150?img=47", lastScore: 85, updatedAt: new Date().toISOString() },
        { id: "mock-user-2", name: "David Chen", email: "dchen@example.com", address: "456 Prayer Rd, Mecca", photoURL: "https://i.pravatar.cc/150?img=33", lastScore: 92, updatedAt: new Date(Date.now() - 86400000).toISOString() },
        { id: "mock-user-3", name: "Grace O'Connor", email: "grace.oc@example.com", address: "789 Quran Ave, Jerusalem", photoURL: "https://i.pravatar.cc/150?img=5", lastScore: 78, updatedAt: new Date(Date.now() - 172800000).toISOString() },
      ]
    });
  }

  try {
    const db = getAdminDb();
    const snapshot = await db.collection("users").orderBy("updatedAt", "desc").get();
    const users = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      name: docSnap.data().name || "",
      email: docSnap.data().email || "",
      address: docSnap.data().address || "",
      photoURL: docSnap.data().photoURL || "",
      lastScore: docSnap.data().lastScore || 0,
      updatedAt: docSnap.data().updatedAt || null,
    }));

    return NextResponse.json({ users });
  } catch (err) {
    console.error("[admin/users GET]", err);
    return NextResponse.json({ message: "Failed to load users" }, { status: 500 });
  }
}

export async function POST(req) {
  const session = await requireAdminSession(req);
  if (!session) return unauthorized();
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json({ message: "Firebase Admin is not configured." }, { status: 500 });
  }

  const data = await req.json();
  if (!data?.name || !data?.email) {
    return NextResponse.json({ message: "Name and email are required." }, { status: 400 });
  }

  try {
    const db = getAdminDb();
    const ref = await db.collection("users").add({
      name: String(data.name).trim(),
      email: String(data.email).trim().toLowerCase(),
      address: String(data.address || "").trim(),
      photoURL: String(data.photoURL || "").trim(),
      lastScore: 0,
      lastPlayed: new Date(),
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ success: true, id: ref.id });
  } catch (err) {
    console.error("[admin/users POST]", err);
    return NextResponse.json({ message: "Failed to create user" }, { status: 500 });
  }
}

export async function PATCH(req) {
  const session = await requireAdminSession(req);
  if (!session) return unauthorized();
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json({ message: "Firebase Admin is not configured." }, { status: 500 });
  }

  const { id, data } = await req.json();
  if (!id || !data) {
    return NextResponse.json({ message: "Missing user id or data." }, { status: 400 });
  }

  try {
    const db = getAdminDb();
    await db.collection("users").doc(id).update({
      name: String(data.name || "").trim(),
      email: String(data.email || "").trim().toLowerCase(),
      address: String(data.address || "").trim(),
      photoURL: String(data.photoURL || "").trim(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error("[admin/users PATCH]", err);
    return NextResponse.json({ message: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(req) {
  const session = await requireAdminSession(req);
  if (!session) return unauthorized();
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json({ message: "Firebase Admin is not configured." }, { status: 500 });
  }

  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ message: "Missing user id." }, { status: 400 });
  }

  try {
    const db = getAdminDb();
    await db.collection("users").doc(id).delete();
    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error("[admin/users DELETE]", err);
    return NextResponse.json({ message: "Failed to delete user" }, { status: 500 });
  }
}
