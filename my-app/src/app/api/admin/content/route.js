import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireAdminSession } from "../../../../lib/requireAdminSession";
import { getAdminDb, isFirebaseAdminConfigured } from "../../../../lib/firebaseAdmin";
import { ADMIN_CONTENT_COLLECTIONS } from "../../../../lib/adminCollections";

function unauthorized() {
  return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
}

function adminNotConfigured() {
  return NextResponse.json(
    {
      message:
        "Firebase Admin is not configured. Add FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_ADMIN_* credentials to the server environment.",
    },
    { status: 500 }
  );
}

function validateCollection(collection) {
  if (!collection || !ADMIN_CONTENT_COLLECTIONS.has(collection)) {
    return NextResponse.json({ message: "Invalid collection" }, { status: 400 });
  }
  return null;
}

function validateQuestionPayload(data) {
  const question = String(data?.question || "").trim();
  const options = Array.isArray(data?.options)
    ? data.options.map((option) => String(option).trim()).filter(Boolean)
    : [];

  if (!question) {
    return "Question text is required.";
  }
  if (options.length < 2) {
    return "At least two answer options are required.";
  }
  if (typeof data.correctIndex !== "number" || data.correctIndex < 0 || data.correctIndex >= options.length) {
    return "correctIndex must point to a valid answer option.";
  }

  return null;
}

function sanitizeQuestionPayload(data) {
  const options = Array.isArray(data.options)
    ? data.options.map((option) => String(option).trim()).filter(Boolean)
    : [];

  return {
    question: String(data.question).trim(),
    options,
    correctIndex: Number(data.correctIndex),
    category: String(data.category || "bible").trim().toLowerCase(),
    difficulty: String(data.difficulty || "easy").trim().toLowerCase(),
    reference: String(data.reference || "").trim(),
    explanation: String(data.explanation || "").trim(),
    active: data.active !== false,
  };
}

function withCreateTimestamps(collection, data) {
  const payload = { ...data };

  if (collection === "religiousWallpapers") {
    payload.uploadedAt = FieldValue.serverTimestamp();
  } else {
    payload.createdAt = FieldValue.serverTimestamp();
  }

  return payload;
}

export async function POST(req) {
  const session = await requireAdminSession(req);
  if (!session) return unauthorized();
  if (!isFirebaseAdminConfigured()) return adminNotConfigured();

  const { collection, data } = await req.json();
  const collectionError = validateCollection(collection);
  if (collectionError) return collectionError;
  if (!data || typeof data !== "object") {
    return NextResponse.json({ message: "Missing data payload" }, { status: 400 });
  }

  let payload = data;
  if (collection === "questions") {
    const validationError = validateQuestionPayload(data);
    if (validationError) {
      return NextResponse.json({ message: validationError }, { status: 400 });
    }
    payload = sanitizeQuestionPayload(data);
  }

  try {
    const db = getAdminDb();
    const ref = await db.collection(collection).add(withCreateTimestamps(collection, payload));
    return NextResponse.json({ success: true, id: ref.id });
  } catch (err) {
    console.error("[admin/content POST]", err);
    return NextResponse.json({ message: "Failed to create document" }, { status: 500 });
  }
}

export async function PATCH(req) {
  const session = await requireAdminSession(req);
  if (!session) return unauthorized();
  if (!isFirebaseAdminConfigured()) return adminNotConfigured();

  const { collection, id, data } = await req.json();
  const collectionError = validateCollection(collection);
  if (collectionError) return collectionError;
  if (!id) {
    return NextResponse.json({ message: "Missing document id" }, { status: 400 });
  }
  if (!data || typeof data !== "object") {
    return NextResponse.json({ message: "Missing data payload" }, { status: 400 });
  }

  let payload = data;
  if (collection === "questions") {
    const validationError = validateQuestionPayload(data);
    if (validationError) {
      return NextResponse.json({ message: validationError }, { status: 400 });
    }
    payload = sanitizeQuestionPayload(data);
  }

  try {
    const db = getAdminDb();
    await db
      .collection(collection)
      .doc(id)
      .update({
        ...payload,
        updatedAt: FieldValue.serverTimestamp(),
      });
    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error("[admin/content PATCH]", err);
    return NextResponse.json({ message: "Failed to update document" }, { status: 500 });
  }
}

export async function DELETE(req) {
  const session = await requireAdminSession(req);
  if (!session) return unauthorized();
  if (!isFirebaseAdminConfigured()) return adminNotConfigured();

  const { collection, id } = await req.json();
  const collectionError = validateCollection(collection);
  if (collectionError) return collectionError;
  if (!id) {
    return NextResponse.json({ message: "Missing document id" }, { status: 400 });
  }

  try {
    const db = getAdminDb();
    await db.collection(collection).doc(id).delete();
    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error("[admin/content DELETE]", err);
    return NextResponse.json({ message: "Failed to delete document" }, { status: 500 });
  }
}
