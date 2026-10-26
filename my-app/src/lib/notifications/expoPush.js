// Minimal Expo Push API client (no dependencies). Docs: https://docs.expo.dev/push-notifications/sending-notifications/
//
// IMPORTANT semantics (do not over-promise to admins):
//  - a "ticket" with status "ok" only means Expo ACCEPTED the message for delivery.
//  - a "receipt" with status "ok" means Expo handed it to FCM/APNs. It still does not prove the
//    notification was displayed or seen on the device — only an in-app open/read can prove that.

export const EXPO_SEND_URL = "https://exp.host/--/api/v2/push/send";
export const EXPO_RECEIPTS_URL = "https://exp.host/--/api/v2/push/getReceipts";
export const SEND_CHUNK_SIZE = 100;
export const RECEIPT_CHUNK_SIZE = 300;

const TOKEN_RE = /^Expo(nent)?PushToken\[[^\]\s]{6,}\]$/;

export function isExpoPushToken(token) {
  return typeof token === "string" && token.length <= 200 && TOKEN_RE.test(token);
}

export function chunk(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function backoffMs(attempt, retryAfterHeader) {
  const retryAfter = Number(retryAfterHeader);
  if (Number.isFinite(retryAfter) && retryAfter > 0) return Math.min(retryAfter * 1000, 15000);
  const base = Math.min(500 * 2 ** attempt, 8000);
  return base + Math.floor(Math.random() * 250);
}

async function postJson(url, payload, { fetchImpl, accessToken, timeoutMs, maxRetries, sleep }) {
  let lastError = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const headers = { Accept: "application/json", "Content-Type": "application/json" };
      if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
      const res = await fetchImpl(url, { method: "POST", headers, body: JSON.stringify(payload), signal: controller.signal });
      if (res.status === 429 || res.status >= 500) {
        lastError = new Error(`Expo push service responded ${res.status}`);
        if (attempt < maxRetries) await sleep(backoffMs(attempt, res.headers?.get?.("retry-after")));
        continue;
      }
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        // 4xx other than 429 are not retryable (bad payload / credentials).
        const message = json?.errors?.[0]?.message || `Expo push service responded ${res.status}`;
        const err = new Error(message);
        err.permanent = true;
        throw err;
      }
      return json;
    } catch (err) {
      if (err?.permanent) throw err;
      lastError = err?.name === "AbortError" ? new Error("Expo push request timed out") : err;
      if (attempt < maxRetries) await sleep(backoffMs(attempt));
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError || new Error("Expo push request failed");
}

/**
 * Send messages and return one ticket per message, in the same order.
 * Ticket: { status: "ok", id } | { status: "error", message, details?: {error}, retryable?: boolean }
 */
export async function sendExpoPushMessages(
  messages,
  { fetchImpl = fetch, accessToken = process.env.EXPO_ACCESS_TOKEN, timeoutMs = 15000, maxRetries = 3, sleep = defaultSleep } = {}
) {
  const tickets = [];
  for (const group of chunk(messages, SEND_CHUNK_SIZE)) {
    try {
      const json = await postJson(EXPO_SEND_URL, group, { fetchImpl, accessToken, timeoutMs, maxRetries, sleep });
      const data = Array.isArray(json?.data) ? json.data : null;
      if (!data || data.length !== group.length) {
        group.forEach(() => tickets.push({ status: "error", message: "Unexpected response from the push service", retryable: true }));
      } else {
        data.forEach((t) => tickets.push(t && typeof t === "object" ? t : { status: "error", message: "Malformed ticket", retryable: true }));
      }
    } catch (err) {
      const retryable = !err?.permanent;
      group.forEach(() => tickets.push({ status: "error", message: String(err?.message || "Push request failed").slice(0, 300), retryable }));
    }
  }
  return tickets;
}

/** Returns a Map(ticketId -> receipt). Receipts missing from the response are simply absent. */
export async function getExpoReceipts(
  ids,
  { fetchImpl = fetch, accessToken = process.env.EXPO_ACCESS_TOKEN, timeoutMs = 15000, maxRetries = 2, sleep = defaultSleep } = {}
) {
  const receipts = new Map();
  for (const group of chunk(ids, RECEIPT_CHUNK_SIZE)) {
    const json = await postJson(EXPO_RECEIPTS_URL, { ids: group }, { fetchImpl, accessToken, timeoutMs, maxRetries, sleep });
    const data = json?.data && typeof json.data === "object" ? json.data : {};
    for (const [id, receipt] of Object.entries(data)) receipts.set(id, receipt);
  }
  return receipts;
}

/**
 * Classify a failed ticket/receipt.
 * - invalidToken: the device token is dead — delete it so we stop sending.
 * - retryable: a later attempt may succeed (rate limits, transient provider errors).
 * - config: a server/app configuration problem (credentials, sender id) the admin must fix.
 */
export function classifyPushError(ticketOrReceipt) {
  const code = ticketOrReceipt?.details?.error || "";
  if (code === "DeviceNotRegistered") return { invalidToken: true, retryable: false, config: false, code };
  if (code === "MessageRateExceeded") return { invalidToken: false, retryable: true, config: false, code };
  if (code === "InvalidCredentials" || code === "MismatchSenderId") return { invalidToken: false, retryable: false, config: true, code };
  if (code === "MessageTooBig") return { invalidToken: false, retryable: false, config: false, code };
  return { invalidToken: false, retryable: ticketOrReceipt?.retryable === true, config: false, code };
}
