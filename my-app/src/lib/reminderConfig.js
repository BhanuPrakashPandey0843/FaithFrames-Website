// Settings for admin → user subscription reminders.
// Plain constants only (no server imports) so both API routes and UI can use them.

/** A user who was reminded within this window is skipped unless the admin forces it. */
export const REMINDER_COOLDOWN_HOURS = 24;

export const REMINDER_TITLE_MAX = 80;
export const REMINDER_MESSAGE_MAX = 300;

/** Hard cap per API request (one Firestore batch = 2 writes per user, limit 500). */
export const REMINDER_MAX_USERS_PER_REQUEST = 200;

/** `{name}` is replaced with the user's first name when the reminder is sent. */
export const DEFAULT_REMINDER_TITLE = "Unlock Faith Frames Premium";
export const DEFAULT_REMINDER_MESSAGE =
  "Hi {name}, your Faith Frames journey is just getting started. Go premium for unlimited verses, premium wallpapers, exclusive stories and an ad-free experience.";
