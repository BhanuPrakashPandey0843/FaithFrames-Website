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
  "witnessVideos",     // Witness Videos module — video catalogue
  "witnessCarousel",   // Witness Videos module — hero carousel banners
]);

// ─── Dashboard stats collections ─────────────────────────────────────────────
export const ADMIN_STATS_COLLECTIONS = [
  { key: "wallpapers",       collection: "religiousWallpapers" },
  { key: "verses",           collection: "dailyVerses" },
  { key: "prayers",          collection: "dailyPrayers" },
  { key: "questions",        collection: "questions" },
  { key: "stories",          collection: "stories" },
  { key: "featuredStories",  collection: "featuredStories" },
  { key: "witnessVideos",    collection: "witnessVideos" },
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

// ─── Live Worship Room (Meet & Share) ─────────────────────────────────────────
export const MEET_SHARE_CLOUDINARY_FOLDER = "faithframes/live-worship";

export const MEET_PLATFORMS = [
  "Google Meet",
  "Zoom",
  "YouTube Live",
  "Microsoft Teams",
  "Other",
];

/**
 * Manual status override options shown in the admin form.
 * "auto" tells the mobile app to derive live/upcoming/ended from date & time.
 */
export const MEET_STATUS_OVERRIDES = [
  { value: "auto",     label: "Auto (based on date & time)" },
  { value: "live",     label: "Force: Live" },
  { value: "upcoming", label: "Force: Upcoming" },
  { value: "ended",    label: "Force: Ended" },
];

// ─── Witness Videos ───────────────────────────────────────────────────────────
export const WITNESS_THUMBNAIL_CLOUDINARY_FOLDER = "faithframes/witness/thumbnails";
export const WITNESS_VIDEO_CLOUDINARY_FOLDER     = "faithframes/witness/videos";
export const WITNESS_BANNER_CLOUDINARY_FOLDER    = "faithframes/witness/banners";

export const WITNESS_VIDEO_CATEGORIES = [
  "Testimony",
  "Sermon",
  "Bible Study",
  "Worship",
  "Prayer",
  "Youth",
  "Missions",
  "General",
];

/** Max upload size for a single witness video file, in bytes (200MB). */
export const WITNESS_VIDEO_MAX_SIZE_BYTES = 200 * 1024 * 1024;
/** Max upload size for banner/thumbnail images, in bytes (5MB). */
export const WITNESS_IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
export const WITNESS_VIDEO_ALLOWED_FORMATS = ["mp4", "mov", "m4v", "webm"];
