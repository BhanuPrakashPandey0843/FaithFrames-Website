import { NextResponse } from "next/server";
import { AggregateField, FieldValue } from "firebase-admin/firestore";
import { requireAdminSession } from "../../../../lib/requireAdminSession";
import { getAdminDb, isFirebaseAdminConfigured } from "../../../../lib/firebaseAdmin";
import {
  BIBLE_BOOKS,
  BIBLE_BOOK_BY_ID,
  BIBLE_LANGUAGES,
  chapterDocumentId,
  expectedChapterCount,
} from "../../../../lib/bibleCatalog";
import { validateVerses } from "../../../../lib/bibleContent";

const LANGUAGES = {
  hindi: { label: "Hindi", field: "hindiName" },
  telugu: { label: "Telugu", field: "teluguName" },
};
const MAX_CHAPTER_BYTES = 900_000;
const BOOK_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function jsonError(message, status = 400) {
  return NextResponse.json({ message }, { status });
}

function validateLanguageBook(language, bookId) {
  if (!BIBLE_LANGUAGES.includes(language)) return "Select Hindi or Telugu.";
  if (typeof bookId !== "string" || bookId.length > 48 || !BOOK_ID_PATTERN.test(bookId)) {
    return "Select a valid Bible book.";
  }
  return null;
}

function serialize(value) {
  if (value == null) return value;
  if (typeof value.toDate === "function") return value.toDate().toISOString();
  if (Array.isArray(value)) return value.map(serialize);
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, serialize(child)]));
  }
  return value;
}

function mergeBookMetadata(book, firestoreBook) {
  return {
    ...book,
    ...firestoreBook,
    id: book.id,
    englishName: book.englishName,
    testament: book.testament,
    order: book.order,
    chapterCount: book.chapterCount,
    hindiChapterCount: expectedChapterCount({ ...book, ...firestoreBook }, "hindi"),
    teluguChapterCount: expectedChapterCount({ ...book, ...firestoreBook }, "telugu"),
  };
}

async function getCatalogBook(db, bookId) {
  const snapshot = await db.collection("bibleBooks").doc(bookId).get();
  const stored = snapshot.exists ? snapshot.data() : {};
  const canonical = BIBLE_BOOK_BY_ID.get(bookId);
  const englishName = stored.englishName || canonical?.englishName;
  const testament = stored.testament || canonical?.testament;
  const chapterCount = Number(stored.chapterCount || canonical?.chapterCount);
  if (
    typeof englishName !== "string"
    || !englishName.trim()
    || !["OT", "NT"].includes(testament)
    || !Number.isInteger(chapterCount)
    || chapterCount < 1
  ) {
    return null;
  }
  return {
    ...canonical,
    ...stored,
    id: bookId,
    englishName: englishName.trim(),
    testament,
    chapterCount,
    order: Number.isInteger(Number(stored.order)) ? Number(stored.order) : canonical?.order,
  };
}

async function initializeCatalog(db) {
  const refs = BIBLE_BOOKS.map((book) => db.collection("bibleBooks").doc(book.id));
  const snapshots = await db.getAll(...refs);
  const batch = db.batch();
  let writes = 0;

  snapshots.forEach((snapshot, index) => {
    const book = BIBLE_BOOKS[index];
    const defaults = {
      ...book,
      hindiStatus: "not-started",
      teluguStatus: "not-started",
      hindiPublishedChapterCount: 0,
      teluguPublishedChapterCount: 0,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    if (!snapshot.exists) {
      batch.create(refs[index], defaults);
      writes += 1;
      return;
    }
    const existing = snapshot.data();
    const missingFields = {};
    for (const field of [
      "hindiStatus",
      "teluguStatus",
      "hindiPublishedChapterCount",
      "teluguPublishedChapterCount",
    ]) {
      if (!(field in existing)) missingFields[field] = defaults[field];
    }
    if (Object.keys(missingFields).length) {
      batch.set(refs[index], {
        ...missingFields,
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
      writes += 1;
    }
  });

  if (writes) await batch.commit();
  return writes;
}

async function getBooks(db) {
  const snapshot = await db.collection("bibleBooks").get();
  const savedBooks = new Map(snapshot.docs.map((doc) => [doc.id, doc.data()]));
  const canonical = BIBLE_BOOKS.map((book) => mergeBookMetadata(book, savedBooks.get(book.id) || {}));
  const knownIds = new Set(BIBLE_BOOKS.map((book) => book.id));
  const additional = snapshot.docs
    .filter((doc) => !knownIds.has(doc.id))
    .map((doc) => getCatalogBookFromData(doc.id, doc.data()))
    .filter(Boolean);
  return [...canonical, ...additional].sort((a, b) => a.order - b.order);
}

function getCatalogBookFromData(id, data) {
  const chapterCount = Number(data.chapterCount);
  const order = Number(data.order);
  if (
    typeof data.englishName !== "string"
    || !data.englishName.trim()
    || !["OT", "NT"].includes(data.testament)
    || !Number.isInteger(chapterCount)
    || chapterCount < 1
    || !Number.isInteger(order)
  ) {
    return null;
  }
  return {
    ...data,
    id,
    englishName: data.englishName.trim(),
    order,
    chapterCount,
    hindiChapterCount: expectedChapterCount(data, "hindi"),
    teluguChapterCount: expectedChapterCount(data, "telugu"),
  };
}

async function getSummary(db) {
  const books = await getBooks(db);
  const summary = await Promise.all(BIBLE_LANGUAGES.map(async (language) => {
    const drafts = db.collection("bibleChapterDrafts");
    const published = db.collection("bibleChapters");
    const [
      publishedCount,
      draftCount,
      unpublishedCount,
      warningCount,
      verseTotal,
      recentUpdates,
      recentPublications,
    ] =
      await Promise.all([
        published.where("language", "==", language).where("status", "==", "published").count().get(),
        drafts.where("language", "==", language).where("status", "==", "draft").count().get(),
        drafts.where("language", "==", language).where("status", "==", "unpublished").count().get(),
        drafts.where("language", "==", language).where("validation.hasGaps", "==", true).count().get(),
        published
          .where("language", "==", language)
          .where("status", "==", "published")
          .aggregate({ totalVerseCount: AggregateField.sum("verseCount") })
          .get(),
        drafts.where("language", "==", language).orderBy("updatedAt", "desc").limit(5).get(),
        published
          .where("language", "==", language)
          .where("status", "==", "published")
          .orderBy("publishedAt", "desc")
          .limit(5)
          .get(),
      ]);

    const expectedChapters = books.reduce(
      (total, book) => total + expectedChapterCount(book, language),
      0
    );
    const publishedChapters = publishedCount.data().count;
    const totalVerses = verseTotal.data().totalVerseCount || 0;
    const draftChapters = draftCount.data().count;
    const missingChapters = Math.max(0, expectedChapters - publishedChapters);

    return {
      language,
      languageLabel: LANGUAGES[language].label,
      totalBooks: books.length,
      expectedChapters,
      publishedChapters,
      draftChapters,
      unpublishedChapters: unpublishedCount.data().count,
      validationWarnings: warningCount.data().count,
      missingChapters,
      incompleteChapters: missingChapters + draftChapters,
      totalVerses,
      completionPercent: expectedChapters
        ? Math.min(100, Math.round((publishedChapters / expectedChapters) * 100))
        : 0,
      recentlyUpdated: recentUpdates.docs.map((doc) => ({ id: doc.id, ...serialize(doc.data()) })),
      recentlyPublished: recentPublications.docs.map((doc) => ({ id: doc.id, ...serialize(doc.data()) })),
    };
  }));

  return { languages: summary };
}

export async function GET(req) {
  const session = await requireAdminSession(req);
  if (!session) return jsonError("Unauthorized.", 401);
  if (!isFirebaseAdminConfigured()) {
    return jsonError("Firebase Admin is not configured on the server.", 500);
  }

  try {
    const db = getAdminDb();
    const params = new URL(req.url).searchParams;
    const action = params.get("action") || "summary";

    if (action === "books") {
      return NextResponse.json({ books: await getBooks(db) });
    }

    if (action === "summary") {
      return NextResponse.json(await getSummary(db));
    }

    const language = params.get("language");
    const bookId = params.get("bookId");
    const invalidSelection = validateLanguageBook(language, bookId);
    if (invalidSelection) return jsonError(invalidSelection);
    const book = await getCatalogBook(db, bookId);
    if (!book) return jsonError("The selected book is not in the Bible catalog.", 404);

    if (action === "chapters") {
      const [drafts, published] = await Promise.all([
        db.collection("bibleChapterDrafts")
          .where("language", "==", language)
          .where("bookId", "==", bookId)
          .orderBy("chapter", "asc")
          .get(),
        db.collection("bibleChapters")
          .where("language", "==", language)
          .where("bookId", "==", bookId)
          .where("status", "==", "published")
          .orderBy("chapter", "asc")
          .get(),
      ]);
      const publishedNumbers = new Set(published.docs.map((doc) => doc.get("chapter")));
      const records = new Map(drafts.docs.map((doc) => [doc.get("chapter"), {
        id: doc.id,
        ...serialize(doc.data()),
      }]));
      published.docs.forEach((doc) => {
        const chapter = doc.get("chapter");
        const existing = records.get(chapter) || { id: doc.id, ...serialize(doc.data()) };
        records.set(chapter, { ...existing, isPublished: true });
      });
      records.forEach((record, chapter) => {
        if (!publishedNumbers.has(chapter)) record.isPublished = false;
      });
      return NextResponse.json({
        chapters: [...records.values()].sort((a, b) => a.chapter - b.chapter),
      });
    }

    if (action === "chapter") {
      const chapter = Number(params.get("chapter"));
      const expected = expectedChapterCount(book, language);
      if (!Number.isInteger(chapter) || chapter < 1 || chapter > expected) {
        return jsonError(`Chapter must be between 1 and ${expected}.`);
      }
      const id = chapterDocumentId(language, bookId, chapter);
      const [draft, published] = await Promise.all([
        db.collection("bibleChapterDrafts").doc(id).get(),
        db.collection("bibleChapters").doc(id).get(),
      ]);
      const draftData = draft.exists ? serialize(draft.data()) : null;
      const publishedData = published.exists && published.get("status") === "published"
        ? serialize(published.data())
        : null;
      return NextResponse.json({
        chapter: draftData || publishedData,
        isPublished: Boolean(publishedData),
        hasDraftChanges: Boolean(draftData && publishedData && draftData.status === "draft"),
      });
    }

    return jsonError("Unknown Bible management action.");
  } catch (error) {
    console.error("[admin/bible-translations GET]", error);
    return jsonError("Failed to load Bible translation data.", 500);
  }
}

export async function POST(req) {
  const session = await requireAdminSession(req);
  if (!session) return jsonError("Unauthorized.", 401);
  if (!isFirebaseAdminConfigured()) {
    return jsonError("Firebase Admin is not configured on the server.", 500);
  }

  let payload;
  try {
    payload = await req.json();
  } catch {
    return jsonError("Request body must be valid JSON.");
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return jsonError("A request payload is required.");
  }

  try {
    const db = getAdminDb();
    if (payload.action === "initialize-catalog") {
      const created = await initializeCatalog(db);
      return NextResponse.json({ success: true, created });
    }

    if (payload.action === "add-book") {
      const invalidSelection = validateLanguageBook(payload.language, payload.bookId);
      if (invalidSelection) return jsonError(invalidSelection);
      if (BIBLE_BOOK_BY_ID.has(payload.bookId)) {
        return jsonError("That book ID is already part of the standard Bible catalog.", 409);
      }
      const englishName = String(payload.englishName ?? "").trim();
      const displayName = String(payload.displayName ?? "").trim();
      const testament = payload.testament;
      const chapterCount = Number(payload.chapterCount);
      if (!englishName || englishName.length > 100) {
        return jsonError("Enter an English reference name of 1 to 100 characters.");
      }
      if (!["OT", "NT"].includes(testament)) return jsonError("Choose Old Testament or New Testament.");
      if (!Number.isInteger(chapterCount) || chapterCount < 1 || chapterCount > 200) {
        return jsonError("Expected chapter count must be between 1 and 200.");
      }
      if (displayName.length > 100) return jsonError("Book display names must be 100 characters or fewer.");

      const books = await getBooks(db);
      const order = books.reduce((maximum, item) => Math.max(maximum, item.order), 0) + 1;
      const reference = db.collection("bibleBooks").doc(payload.bookId);
      const created = await db.runTransaction(async (transaction) => {
        const existing = await transaction.get(reference);
        if (existing.exists) return false;
        transaction.create(reference, {
          id: payload.bookId,
          englishName,
          testament,
          order,
          chapterCount,
          custom: true,
          hindiName: "",
          teluguName: "",
          hindiChapterCount: chapterCount,
          teluguChapterCount: chapterCount,
          hindiPublishedChapterCount: 0,
          teluguPublishedChapterCount: 0,
          [`${payload.language}Name`]: displayName,
          [`${payload.language}ChapterCount`]: chapterCount,
          [`${payload.language}Status`]: "not-started",
          [`${payload.language === "hindi" ? "telugu" : "hindi"}Status`]: "not-started",
          createdAt: FieldValue.serverTimestamp(),
          createdBy: session.email,
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: session.email,
        });
        return true;
      });
      if (!created) return jsonError("A book with that ID already exists.", 409);
      return NextResponse.json({ success: true, bookId: payload.bookId });
    }

    if (payload.action === "update-book") {
      const invalidSelection = validateLanguageBook(payload.language, payload.bookId);
      if (invalidSelection) return jsonError(invalidSelection);
      const book = await getCatalogBook(db, payload.bookId);
      if (!book) return jsonError("The selected book is not in the Bible catalog.", 404);
      const displayName = String(payload.displayName ?? "").trim();
      const chapterCount = Number(payload.chapterCount);
      if (displayName.length > 100) return jsonError("Book display names must be 100 characters or fewer.");
      if (!Number.isInteger(chapterCount) || chapterCount < 1 || chapterCount > 200) {
        return jsonError("Expected chapter count must be between 1 and 200.");
      }
      const language = payload.language;
      await db.collection("bibleBooks").doc(book.id).set({
        englishName: book.englishName,
        testament: book.testament,
        order: book.order,
        chapterCount: book.chapterCount,
        [`${language}Name`]: displayName,
        [`${language}ChapterCount`]: chapterCount,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: session.email,
      }, { merge: true });
      return NextResponse.json({ success: true });
    }

    const { language, bookId, chapter: rawChapter } = payload;
    const invalidSelection = validateLanguageBook(language, bookId);
    if (invalidSelection) return jsonError(invalidSelection);
    const chapter = Number(rawChapter);
    const book = await getCatalogBook(db, bookId);
    if (!book) return jsonError("The selected book is not in the Bible catalog.", 404);
    const configuredBook = book;
    const expected = expectedChapterCount(configuredBook, language);
    if (!Number.isInteger(chapter) || chapter < 1 || chapter > expected) {
      return jsonError(`Chapter must be between 1 and ${expected}.`);
    }

    const id = chapterDocumentId(language, bookId, chapter);
    const draftRef = db.collection("bibleChapterDrafts").doc(id);
    const publishedRef = db.collection("bibleChapters").doc(id);
    const bookRef = db.collection("bibleBooks").doc(bookId);

    if (payload.action === "unpublish") {
      const result = await db.runTransaction(async (transaction) => {
        const [draft, published, bookSnapshot] = await Promise.all([
          transaction.get(draftRef),
          transaction.get(publishedRef),
          transaction.get(bookRef),
        ]);
        if (!published.exists || published.get("status") !== "published") return false;
        transaction.delete(publishedRef);
        const publishedCountField = `${language}PublishedChapterCount`;
        const statusField = `${language}Status`;
        const publishedCount = Math.max(
          0,
          Number(bookSnapshot.get(publishedCountField) || 0) - 1
        );
        transaction.set(draftRef, {
          ...(draft.exists ? {} : {
            language,
            bookId,
            bookName: configuredBook?.[`${language}Name`] || book.englishName,
            testament: book.testament,
            chapter,
            verses: published.get("verses") || [],
            verseCount: published.get("verseCount") || 0,
            contentVersion: published.get("contentVersion") || 1,
            validation: published.get("validation") || {
              hasGaps: false,
              missingNumbers: [],
              gapsAcknowledged: false,
            },
            createdAt: published.get("createdAt") || FieldValue.serverTimestamp(),
            createdBy: session.email,
          }),
          status: "unpublished",
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: session.email,
        }, { merge: true });
        transaction.set(bookRef, {
          [publishedCountField]: publishedCount,
          [statusField]: publishedCount
            ? "in-progress"
            : draft.exists ? "draft" : "not-started",
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: session.email,
        }, { merge: true });
        return true;
      });
      if (!result) return jsonError("This chapter is not currently published.", 404);
      return NextResponse.json({ success: true, status: "unpublished" });
    }

    if (payload.action !== "save-draft" && payload.action !== "publish") {
      return jsonError("Unknown Bible content action.");
    }

    const checked = validateVerses(payload.verses);
    if (checked.errors.length) return jsonError(checked.errors.join(" "));
    if (Buffer.byteLength(JSON.stringify(checked.verses), "utf8") > MAX_CHAPTER_BYTES) {
      return jsonError("This chapter is too large to store safely. Reduce the chapter text and try again.");
    }
    const acknowledgeGaps = payload.acknowledgeGaps === true;
    if (payload.action === "publish" && checked.warnings.length && !acknowledgeGaps) {
      return NextResponse.json({
        message: checked.warnings.join(" ") + " Acknowledge the numbering gaps before publishing.",
        warnings: checked.warnings,
      }, { status: 422 });
    }

    const content = {
      language,
      bookId,
      bookName: configuredBook?.[`${language}Name`] || book.englishName,
      testament: book.testament,
      chapter,
      verses: checked.verses,
      verseCount: checked.verses.length,
      validation: {
        hasGaps: checked.warnings.length > 0,
        missingNumbers: checked.missingNumbers,
        gapsAcknowledged: acknowledgeGaps,
      },
    };

    const result = await db.runTransaction(async (transaction) => {
      const [draft, bookSnapshot] = await Promise.all([
        transaction.get(draftRef),
        transaction.get(bookRef),
      ]);
      const previousVersion = draft.exists ? Number(draft.get("contentVersion") || 0) : 0;
      const contentVersion = previousVersion + 1;
      const createdAt = draft.exists ? draft.get("createdAt") : FieldValue.serverTimestamp();
      const createdBy = draft.exists ? draft.get("createdBy") : session.email;
      const publishedCountField = `${language}PublishedChapterCount`;
      const statusField = `${language}Status`;
      const publishedCount = Number(bookSnapshot.get(publishedCountField) || 0);

      if (payload.action === "save-draft") {
        transaction.set(draftRef, {
          ...content,
          status: "draft",
          contentVersion,
          createdAt,
          createdBy,
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: session.email,
        });
        transaction.set(bookRef, {
          [statusField]: publishedCount >= expected
            ? "published"
            : publishedCount ? "in-progress" : "draft",
          updatedAt: FieldValue.serverTimestamp(),
          updatedBy: session.email,
        }, { merge: true });
        return { status: "draft", contentVersion };
      }

      const published = await transaction.get(publishedRef);
      const nextPublishedCount = publishedCount + (published.exists ? 0 : 1);
      transaction.set(publishedRef, {
        ...content,
        status: "published",
        contentVersion,
        createdAt: published.exists ? published.get("createdAt") : createdAt,
        publishedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        publishedBy: session.email,
        updatedBy: session.email,
      });
      transaction.set(bookRef, {
        [publishedCountField]: nextPublishedCount,
        [statusField]: nextPublishedCount >= expected ? "published" : "in-progress",
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: session.email,
      }, { merge: true });
      transaction.set(draftRef, {
        ...content,
        status: "published",
        contentVersion,
        createdAt,
        createdBy,
        publishedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: session.email,
        publishedBy: session.email,
      });
      return { status: "published", contentVersion };
    });

    return NextResponse.json({ success: true, ...result, warnings: checked.warnings });
  } catch (error) {
    console.error("[admin/bible-translations POST]", error);
    return jsonError("Failed to save Bible translation data.", 500);
  }
}
