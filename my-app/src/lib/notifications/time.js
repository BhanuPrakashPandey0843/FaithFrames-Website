// Time-zone helpers built on Intl (no dependencies). All "local" strings are wall-clock values in
// the given IANA time zone, e.g. "2026-11-02T19:00" in "Asia/Kolkata".

const LOCAL_DATETIME_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const LOCAL_TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

const formatterCache = new Map();

function getFormatter(timeZone) {
  let fmt = formatterCache.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatterCache.set(timeZone, fmt);
  }
  return fmt;
}

export function isValidTimeZone(timeZone) {
  if (typeof timeZone !== "string" || !timeZone || timeZone.length > 64) return false;
  try {
    getFormatter(timeZone);
    return true;
  } catch {
    return false;
  }
}

export function isValidLocalDateTime(value) {
  const m = LOCAL_DATETIME_RE.exec(String(value || ""));
  if (!m) return false;
  const [, y, mo, d, h, mi] = m.map(Number);
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return false;
  const probe = new Date(Date.UTC(y, mo - 1, d, h, mi));
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === mo - 1 && probe.getUTCDate() === d;
}

export function isValidLocalTime(value) {
  return LOCAL_TIME_RE.test(String(value || ""));
}

/** Wall-clock parts of an instant in a time zone. */
export function zonedParts(utcMs, timeZone) {
  const parts = {};
  for (const p of getFormatter(timeZone).formatToParts(new Date(utcMs))) {
    if (p.type !== "literal") parts[p.type] = Number(p.value);
  }
  return { year: parts.year, month: parts.month, day: parts.day, hour: parts.hour, minute: parts.minute, second: parts.second };
}

/** Offset (zone wall-clock minus UTC) in ms at the given instant. */
function offsetMs(utcMs, timeZone) {
  const p = zonedParts(utcMs, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

/** "YYYY-MM-DDTHH:mm" wall-clock in `timeZone` -> UTC epoch ms (DST-safe). */
export function zonedLocalToUtcMs(local, timeZone) {
  const m = LOCAL_DATETIME_RE.exec(local);
  if (!m) throw new Error("Invalid local date-time");
  const [, y, mo, d, h, mi] = m.map(Number);
  const wallAsUtc = Date.UTC(y, mo - 1, d, h, mi);
  let guess = wallAsUtc - offsetMs(wallAsUtc, timeZone);
  // Re-evaluate the offset at the guess so instants near a DST change resolve correctly.
  const corrected = wallAsUtc - offsetMs(guess, timeZone);
  if (corrected !== guess) guess = corrected;
  return guess;
}

/** UTC epoch ms -> "YYYY-MM-DDTHH:mm" wall-clock in `timeZone`. */
export function utcMsToZonedLocal(utcMs, timeZone) {
  const p = zonedParts(utcMs, timeZone);
  const pad = (n) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/** "YYYYMMDD" of an instant in `timeZone` — used for per-day idempotency keys. */
export function localDateKey(utcMs, timeZone) {
  const p = zonedParts(utcMs, timeZone);
  const pad = (n) => String(n).padStart(2, "0");
  return `${p.year}${pad(p.month)}${pad(p.day)}`;
}

/** First occurrence of HH:mm (wall-clock in `timeZone`) strictly after `afterMs`. */
export function nextDailyOccurrenceMs(timeLocal, timeZone, afterMs) {
  if (!isValidLocalTime(timeLocal)) throw new Error("Invalid time of day");
  const p = zonedParts(afterMs, timeZone);
  const pad = (n) => String(n).padStart(2, "0");
  // Walk calendar days (not 24h blocks) so DST changes never skip or repeat a day.
  const base = Date.UTC(p.year, p.month - 1, p.day);
  for (let add = 0; add < 3; add++) {
    const day = new Date(base + add * 86400000);
    const local = `${day.getUTCFullYear()}-${pad(day.getUTCMonth() + 1)}-${pad(day.getUTCDate())}T${timeLocal}`;
    const utc = zonedLocalToUtcMs(local, timeZone);
    if (utc > afterMs) return utc;
  }
  throw new Error("Could not compute next occurrence");
}
