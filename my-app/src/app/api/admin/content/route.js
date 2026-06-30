import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireAdminSession } from "../../../../lib/requireAdminSession";
import { getAdminDb, isFirebaseAdminConfigured } from "../../../../lib/firebaseAdmin";
import { ADMIN_CONTENT_COLLECTIONS, QUIZ_CATEGORIES, QUIZ_DIFFICULTIES } from "../../../../lib/adminCollections";

// Mock data for when Firebase Admin isn't configured
const MOCK_DATA = {
  featuredStories: [
    { id: "mock-story-1", title: "The Story of Prophet Musa (AS)", name: "Musa (AS)", shortdescription: "A tale of faith, courage, and deliverance.", fullstory: "Once upon a time...", readingtime: "5 min read", published: true, author: "admin", createdAt: new Date().toISOString(), coverimage: "" },
    { id: "mock-story-2", title: "The Wisdom of Prophet Sulaiman (AS)", name: "Sulaiman (AS)", shortdescription: "Lessons in justice and divine wisdom.", fullstory: "Prophet Sulaiman was known for...", readingtime: "4 min read", published: true, author: "admin", createdAt: new Date(Date.now() - 86400000).toISOString(), coverimage: "" },
  ],
  stories: [
    { id: "mock-story-3", title: "The Journey of Hijra", name: "Prophet Muhammad (SAW)", shortdescription: "The migration that changed history.", fullstory: "In the year 622 CE...", readingtime: "6 min read", published: true, author: "admin", createdAt: new Date(Date.now() - 172800000).toISOString(), coverimage: "" },
  ],
  questions: [
    { id: "mock-question-1", question: "What is the first pillar of Islam?", options: ["Shahada", "Salah", "Zakat", "Sawm"], correctIndex: 0, category: "Daily Challenges", difficulty: "easy", active: true },
    { id: "mock-question-2", question: "How many times a day do Muslims pray?", options: ["3", "4", "5", "6"], correctIndex: 2, category: "Daily Challenges", difficulty: "easy", active: true },
  ],
  religiousWallpapers: [
    { id: "mock-wallpaper-1", title: "Quran Verse", uri: "https://picsum.photos/400/300?random=1", uploadedAt: new Date().toISOString() },
    { id: "mock-wallpaper-2", title: "Kaaba", uri: "https://picsum.photos/400/300?random=2", uploadedAt: new Date(Date.now() - 86400000).toISOString() },
  ],
  dailyPrayers: [
    { id: "mock-prayer-1", verse: "O Allah, bless this day...", reference: "Morning Du'a", bgurl: "", createdAt: new Date().toISOString() },
    { id: "mock-prayer-2", verse: "In the name of Allah, the Most Gracious, the Most Merciful.", reference: "Opening", bgurl: "", createdAt: new Date(Date.now() - 86400000).toISOString() },
  ],
  witnessPosts: [
    { id: "mock-witness-1", name: "Fatima", testimony: "This app has truly changed my life...", createdAt: new Date().toISOString() },
    { id: "mock-witness-2", name: "Ali", testimony: "Faith Frames keeps me grounded daily.", createdAt: new Date(Date.now() - 172800000).toISOString() },
  ],
  meetSessions: [
    { id: "mock-meet-1", message: "Weekly Study Circle", meetLink: "https://meet.google.com/abc-defg-hij", likes: 5, dislikes: 0, createdAt: new Date().toISOString() },
    { id: "mock-meet-2", message: "Quran Recitation", meetLink: "https://meet.google.com/xyz-1234-567", likes: 12, dislikes: 1, createdAt: new Date(Date.now() - 86400000).toISOString() },
  ],
  dailyVerses: [
    { id: "mock-verse-1", verse: "And He is with you wherever you are.", reference: "Quran 57:4", bgurl: "", createdAt: new Date().toISOString() },
    { id: "mock-verse-2", verse: "Verily, with hardship comes ease.", reference: "Quran 94:6", bgurl: "", createdAt: new Date(Date.now() - 86400000).toISOString() },
  ],
};


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

  const category = String(data?.category || "").trim();
  if (!QUIZ_CATEGORIES.includes(category)) {
    return `Invalid category. Must be one of: ${QUIZ_CATEGORIES.join(", ")}.`;
  }

  const difficulty = String(data?.difficulty || "").trim().toLowerCase();
  if (!QUIZ_DIFFICULTIES.includes(difficulty)) {
    return `Invalid difficulty. Must be one of: ${QUIZ_DIFFICULTIES.join(", ")}.`;
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
    category: String(data.category).trim(),
    difficulty: String(data.difficulty).trim().toLowerCase(),
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

export async function GET(req) {
  const session = await requireAdminSession(req);
  if (!session) return unauthorized();

  const { searchParams } = new URL(req.url);
  const collection = searchParams.get("collection");
  const collectionError = validateCollection(collection);
  if (collectionError) return collectionError;

  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json({ items: MOCK_DATA[collection] || [] });
  }

  try {
    const db = getAdminDb();
    const snapshot = await db.collection(collection).orderBy(collection === "religiousWallpapers" ? "uploadedAt" : "createdAt", "desc").get();
    const items = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));
    return NextResponse.json({ items });
  } catch (err) {
    console.error("[admin/content GET]", err);
    return NextResponse.json({ message: "Failed to load items" }, { status: 500 });
  }
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
