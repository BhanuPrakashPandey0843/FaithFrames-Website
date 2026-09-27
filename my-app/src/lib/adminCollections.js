// ─── Firestore collection names ───────────────────────────────────────────────
export const COLLECTIONS = {
  witnessVideos: "witnessVideos",
  witnessCarousel: "witnessCarousel",
  bibleContent: "bibleContent",
  bibleCarousel: "bibleCarousel",
  jesusContent: "jesusContent",
  jesusCarousel: "jesusCarousel",
  prayersContent: "prayersContent",
  prayersCarousel: "prayersCarousel",
  worshipContent: "worshipContent",
  worshipCarousel: "worshipCarousel",
};

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
  "bibleReadingPlans", // Bible Management — reading plans
  "bibleDailyVerses",  // Bible Management — daily verses
  "bibleBanners",      // Bible Management — bible banners
  "bibleAnnouncements",// Bible Management — announcements
  "bibleContent",      // Bible Content module — content catalogue
  "bibleCarousel",     // Bible Content module — hero carousel banners
  "jesusContent",      // Jesus Content module — content catalogue
  "jesusCarousel",     // Jesus Content module — hero carousel banners
  "prayersContent",    // Prayers Content module — content catalogue
  "prayersCarousel",   // Prayers Content module — hero carousel banners
  "worshipContent",    // Worship Content module — content catalogue
  "worshipCarousel",   // Worship Content module — hero carousel banners
  "userPrayers",       // User-submitted prayers module
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
  "Old Testament Quiz",
  "New Testament Quiz",
  "Jesus Quiz",
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

// ─── Bible Content ─────────────────────────────────────────────────────────────
export const BIBLE_CONTENT_THUMBNAIL_CLOUDINARY_FOLDER = "faithframes/bible/thumbnails";
export const BIBLE_CONTENT_VIDEO_CLOUDINARY_FOLDER     = "faithframes/bible/videos";
export const BIBLE_CONTENT_BANNER_CLOUDINARY_FOLDER    = "faithframes/bible/banners";

export const BIBLE_CONTENT_CATEGORIES = [
  "Story",
  "Message",
  "Image",
  "Video",
  "Study",
  "General",
];

// ─── Jesus Content ─────────────────────────────────────────────────────────────
export const JESUS_CONTENT_THUMBNAIL_CLOUDINARY_FOLDER = "faithframes/jesus/thumbnails";
export const JESUS_CONTENT_VIDEO_CLOUDINARY_FOLDER     = "faithframes/jesus/videos";
export const JESUS_CONTENT_BANNER_CLOUDINARY_FOLDER    = "faithframes/jesus/banners";

export const JESUS_CONTENT_CATEGORIES = [
  "Story",
  "Message",
  "Image",
  "Video",
  "Study",
  "General",
];

// ─── Prayers Content ───────────────────────────────────────────────────────────
export const PRAYERS_CONTENT_THUMBNAIL_CLOUDINARY_FOLDER = "faithframes/prayers/thumbnails";
export const PRAYERS_CONTENT_VIDEO_CLOUDINARY_FOLDER     = "faithframes/prayers/videos";
export const PRAYERS_CONTENT_BANNER_CLOUDINARY_FOLDER    = "faithframes/prayers/banners";

export const PRAYERS_CONTENT_CATEGORIES = [
  "Story",
  "Message",
  "Image",
  "Video",
  "Study",
  "General",
];

// ─── Worship Content ───────────────────────────────────────────────────────────
export const WORSHIP_CONTENT_THUMBNAIL_CLOUDINARY_FOLDER = "faithframes/worship/thumbnails";
export const WORSHIP_CONTENT_VIDEO_CLOUDINARY_FOLDER     = "faithframes/worship/videos";
export const WORSHIP_CONTENT_BANNER_CLOUDINARY_FOLDER    = "faithframes/worship/banners";

export const WORSHIP_CONTENT_CATEGORIES = [
  "Story",
  "Message",
  "Image",
  "Video",
  "Study",
  "General",
];

// ─── User-Submitted Prayers ───────────────────────────────────────────────────
export const USER_PRAYERS_COLLECTION = "userPrayers";

export const USER_PRAYER_STATUSES = ["pending", "approved", "rejected"];

export const CONTENT_TYPE_OPTIONS = [
  { value: "story", label: "Story" },
  { value: "message", label: "Message" },
  { value: "image", label: "Image" },
  { value: "video", label: "Video" },
];

export const CONTENT_IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
export const CONTENT_VIDEO_MAX_SIZE_BYTES = 200 * 1024 * 1024;
export const CONTENT_VIDEO_ALLOWED_FORMATS = ["mp4", "mov", "m4v", "webm"];

// ─── Bible Management ───────────────────────────────────────────────────────────
export const BIBLE_BANNER_CLOUDINARY_FOLDER = "faithframes/bible/banners";
export const BIBLE_IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
