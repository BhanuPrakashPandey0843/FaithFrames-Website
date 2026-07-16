import { NextResponse } from "next/server";
import crypto from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { requireAdminSession } from "../../../../lib/requireAdminSession";
import { getAdminDb, isFirebaseAdminConfigured } from "../../../../lib/firebaseAdmin";
import { ADMIN_CONTENT_COLLECTIONS, QUIZ_CATEGORIES, QUIZ_DIFFICULTIES, WITNESS_VIDEO_CATEGORIES } from "../../../../lib/adminCollections";

/** Best-effort Cloudinary cleanup — never blocks or fails the Firestore delete. */
async function destroyCloudinaryAsset(publicId, resourceType) {
  if (!publicId) return;
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim() || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
  if (!apiKey || !apiSecret || !cloudName) return;
  try {
    const timestamp = Math.round(Date.now() / 1000);
    const signature = crypto
      .createHash("sha1")
      .update(`public_id=${publicId}&timestamp=${timestamp}${apiSecret}`)
      .digest("hex");
    await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ public_id: publicId, timestamp: String(timestamp), api_key: apiKey, signature }),
    });
  } catch (err) {
    console.error("[destroyCloudinaryAsset]", err);
  }
}

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
  witnessVideos: [
    { id: "mock-witness-video-1", title: "How I Found Grace", description: "A short testimony about walking through hardship and finding faith.", thumbnail: "", videoUrl: "", duration: 184, category: "Testimony", tags: ["faith", "healing"], featured: true, displayOrder: 0, isActive: true, views: 128, likes: 24, dislikes: 1, publishedAt: new Date().toISOString(), createdAt: new Date().toISOString() },
  ],
  witnessCarousel: [
    { id: "mock-banner-1", image: "", title: "New Testimonies Every Week", subtitle: "Stories of faith from our community", displayOrder: 0, isActive: true, createdAt: new Date().toISOString() },
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

function validateWitnessVideoPayload(data) {
  const title = String(data?.title || "").trim();
  if (!title) return "Title is required.";
  if (title.length > 150) return "Title must be 150 characters or fewer.";

  const description = String(data?.description || "").trim();
  if (!description) return "Description is required.";

  if (!String(data?.videoUrl || "").trim()) return "A video upload is required.";
  if (!String(data?.thumbnail || "").trim()) return "A thumbnail image is required.";

  const category = String(data?.category || "").trim();
  if (!WITNESS_VIDEO_CATEGORIES.includes(category)) {
    return `Invalid category. Must be one of: ${WITNESS_VIDEO_CATEGORIES.join(", ")}.`;
  }

  if (data.duration !== undefined && (typeof data.duration !== "number" || data.duration < 0)) {
    return "Duration must be a non-negative number of seconds.";
  }

  return null;
}

function sanitizeWitnessVideoPayload(data, { isCreate }) {
  const payload = {
    title: String(data.title).trim(),
    description: String(data.description).trim(),
    thumbnail: String(data.thumbnail).trim(),
    thumbnailPublicId: String(data.thumbnailPublicId || "").trim(),
    videoUrl: String(data.videoUrl).trim(),
    videoPublicId: String(data.videoPublicId || "").trim(),
    duration: Number(data.duration) || 0,
    category: String(data.category).trim(),
    tags: Array.isArray(data.tags) ? data.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 20) : [],
    featured: data.featured === true,
    displayOrder: Number.isFinite(Number(data.displayOrder)) ? Number(data.displayOrder) : 0,
    isActive: data.isActive !== false,
    seoTitle: String(data.seoTitle || "").trim(),
    seoDescription: String(data.seoDescription || "").trim(),
    transcript: String(data.transcript || "").trim(),
    publishedAt: data.publishedAt ? new Date(data.publishedAt) : new Date(),
  };
  if (isCreate) {
    payload.views = 0;
    payload.likes = 0;
    payload.dislikes = 0;
  }
  return payload;
}

function validateWitnessCarouselPayload(data) {
  if (!String(data?.image || "").trim()) return "Banner image is required.";
  const title = String(data?.title || "").trim();
  if (!title) return "Title is required.";
  if (title.length > 100) return "Title must be 100 characters or fewer.";
  return null;
}

function sanitizeWitnessCarouselPayload(data) {
  return {
    image: String(data.image).trim(),
    imagePublicId: String(data.imagePublicId || "").trim(),
    title: String(data.title).trim(),
    subtitle: String(data.subtitle || "").trim(),
    displayOrder: Number.isFinite(Number(data.displayOrder)) ? Number(data.displayOrder) : 0,
    isActive: data.isActive !== false,
  };
}

function validateContentPayload(data) {
  const title = String(data?.title || "").trim();
  if (!title) return "Title is required.";
  if (title.length > 150) return "Title must be 150 characters or fewer.";
  return null;
}

function sanitizeContentPayload(data, { isCreate }) {
  const payload = {
    title: String(data.title).trim(),
    description: String(data.description || "").trim(),
    category: String(data.category || "").trim(),
    contentTypeId: String(data.contentTypeId || "").trim(),
    thumbnail: String(data.thumbnail || "").trim(),
    thumbnailPublicId: String(data.thumbnailPublicId || "").trim(),
    video: String(data.video || "").trim(),
    videoPublicId: String(data.videoPublicId || "").trim(),
    isActive: data.isActive !== false,
    isPremium: data.isPremium === true,
    scriptPassage: String(data.scriptPassage || "").trim(),
    displayOrder: Number.isFinite(Number(data.displayOrder)) ? Number(data.displayOrder) : 0,
  };
  if (isCreate) {
    payload.views = 0;
    payload.likes = 0;
    payload.dislikes = 0;
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
    let orderField = collection === "religiousWallpapers" ? "uploadedAt" : "createdAt";
    let orderDirection = "desc";
    const displayOrderCollections = new Set([
      "witnessCarousel", "witnessVideos",
      "bibleContent", "bibleCarousel",
      "jesusContent", "jesusCarousel",
      "prayersContent", "prayersCarousel",
      "worshipContent", "worshipCarousel"
    ]);
    if (displayOrderCollections.has(collection)) {
      orderField = "displayOrder";
      orderDirection = "asc";
    }
    const snapshot = await db.collection(collection).orderBy(orderField, orderDirection).get();
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
  const contentCollections = new Set(["bibleContent", "jesusContent", "prayersContent", "worshipContent"]);
  const carouselCollections = new Set(["bibleCarousel", "jesusCarousel", "prayersCarousel", "worshipCarousel"]);
  if (collection === "questions") {
    const validationError = validateQuestionPayload(data);
    if (validationError) {
      return NextResponse.json({ message: validationError }, { status: 400 });
    }
    payload = sanitizeQuestionPayload(data);
  } else if (collection === "witnessVideos") {
    const validationError = validateWitnessVideoPayload(data);
    if (validationError) {
      return NextResponse.json({ message: validationError }, { status: 400 });
    }
    payload = sanitizeWitnessVideoPayload(data, { isCreate: true });
  } else if (collection === "witnessCarousel") {
    const validationError = validateWitnessCarouselPayload(data);
    if (validationError) {
      return NextResponse.json({ message: validationError }, { status: 400 });
    }
    payload = sanitizeWitnessCarouselPayload(data);
  } else if (contentCollections.has(collection)) {
    const validationError = validateContentPayload(data);
    if (validationError) {
      return NextResponse.json({ message: validationError }, { status: 400 });
    }
    payload = sanitizeContentPayload(data, { isCreate: true });
  } else if (carouselCollections.has(collection)) {
    const validationError = validateWitnessCarouselPayload(data);
    if (validationError) {
      return NextResponse.json({ message: validationError }, { status: 400 });
    }
    payload = sanitizeWitnessCarouselPayload(data);
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
  const contentCollections = new Set(["bibleContent", "jesusContent", "prayersContent", "worshipContent"]);
  const carouselCollections = new Set(["bibleCarousel", "jesusCarousel", "prayersCarousel", "worshipCarousel"]);
  if (collection === "questions") {
    const validationError = validateQuestionPayload(data);
    if (validationError) {
      return NextResponse.json({ message: validationError }, { status: 400 });
    }
    payload = sanitizeQuestionPayload(data);
  } else if (collection === "witnessVideos") {
    const validationError = validateWitnessVideoPayload(data);
    if (validationError) {
      return NextResponse.json({ message: validationError }, { status: 400 });
    }
    payload = sanitizeWitnessVideoPayload(data, { isCreate: false });
  } else if (collection === "witnessCarousel") {
    const validationError = validateWitnessCarouselPayload(data);
    if (validationError) {
      return NextResponse.json({ message: validationError }, { status: 400 });
    }
    payload = sanitizeWitnessCarouselPayload(data);
  } else if (contentCollections.has(collection)) {
    const validationError = validateContentPayload(data);
    if (validationError) {
      return NextResponse.json({ message: validationError }, { status: 400 });
    }
    payload = sanitizeContentPayload(data, { isCreate: false });
  } else if (carouselCollections.has(collection)) {
    const validationError = validateWitnessCarouselPayload(data);
    if (validationError) {
      return NextResponse.json({ message: validationError }, { status: 400 });
    }
    payload = sanitizeWitnessCarouselPayload(data);
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
    const docRef = db.collection(collection).doc(id);

    const videoContentCollections = new Set(["witnessVideos", "bibleContent", "jesusContent", "prayersContent", "worshipContent"]);
    const carouselCollections = new Set(["witnessCarousel", "bibleCarousel", "jesusCarousel", "prayersCarousel", "worshipCarousel"]);
    if (videoContentCollections.has(collection) || carouselCollections.has(collection)) {
      const snap = await docRef.get();
      const existing = snap.data();
      if (existing) {
        if (videoContentCollections.has(collection)) {
          await Promise.all([
            destroyCloudinaryAsset(existing.videoPublicId, "video"),
            destroyCloudinaryAsset(existing.thumbnailPublicId, "image"),
          ]);
        } else {
          await destroyCloudinaryAsset(existing.imagePublicId, "image");
        }
      }
    }

    await docRef.delete();
    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error("[admin/content DELETE]", err);
    return NextResponse.json({ message: "Failed to delete document" }, { status: 500 });
  }
}
