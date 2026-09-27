/** Calendar day key in local time: "2026-08-30". Avoids UTC-midnight day shifts. */
export function toDisplayDateKey(value = new Date()) {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    return value.trim();
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function todayDisplayDateKey() {
  return toDisplayDateKey(new Date());
}

export function normalizeDisplayDate(value) {
  const key = toDisplayDateKey(value);
  return key && /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : null;
}
