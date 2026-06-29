// ─── Firestore collections the admin API is allowed to write to ──────────────
export const ADMIN_CONTENT_COLLECTIONS = new Set([
  "religiousWallpapers",
  "dailyVerses",
  "dailyPrayers",
  "questions",
  "witnessPosts",
  "meetSessions",
  "stories",
  "featuredStories",   // independent collection for Featured Story module
]);

// ─── Dashboard stats collections ─────────────────────────────────────────────
export const ADMIN_STATS_COLLECTIONS = [
  { key: "wallpapers",       collection: "religiousWallpapers" },
  { key: "verses",           collection: "dailyVerses" },
  { key: "prayers",          collection: "dailyPrayers" },
  { key: "questions",        collection: "questions" },
  { key: "stories",          collection: "stories" },
  { key: "featuredStories",  collection: "featuredStories" },
];

// ─── Stories ──────────────────────────────────────────────────────────────────
/**
 * Cloudinary upload folders.
 * Used by both the client upload hook and the API sanitizer — single source of truth.
 */
export const STORY_CLOUDINARY_FOLDER          = "faithframes/stories";
export const FEATURED_STORY_CLOUDINARY_FOLDER = "faithframes/featured-stories";

// ─── Quiz ─────────────────────────────────────────────────────────────────────
/**
 * Canonical quiz category values stored in Firestore.
 * Used by both the frontend select and the API sanitizer — single source of truth.
 */
export const QUIZ_CATEGORIES = [
  "Daily Challenges",
  "Bible Knowledge Quiz",
  "Old Testament Quiz",
  "New Testament Quiz",
  "Jesus Quiz",
  "Apostle Quiz",
  "Random Quiz",
];

export const QUIZ_DIFFICULTIES = ["easy", "medium", "hard"];
