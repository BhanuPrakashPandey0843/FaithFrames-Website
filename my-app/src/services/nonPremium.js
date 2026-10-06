import { REMINDER_MAX_USERS_PER_REQUEST } from "../lib/reminderConfig";

/**
 * @typedef {Object} NonPremiumUser
 * @property {string} id
 * @property {string} name
 * @property {string} email
 * @property {string} phoneNumber
 * @property {string} photoURL
 * @property {string} address
 * @property {string} country
 * @property {string} createdAt        ISO date of sign-up ("" if unknown)
 * @property {string} lastActive       ISO date of last profile activity ("" if unknown)
 * @property {string} subscriptionStatus "none" or the status of a previous, non-paying subscription (e.g. "refunded")
 * @property {string} lastReminderAt   ISO date of the last reminder ("" if never)
 * @property {number} reminderCount
 */

/**
 * @typedef {Object} ReminderResult
 * @property {number} total  users submitted
 * @property {number} sent   reminders delivered
 * @property {{premium:number, missing:number, recentlyReminded:number, optedOut:number}} skipped
 */

async function parseResponse(res) {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.message || `HTTP error ${res.status}`);
  }
  return json;
}

/**
 * Accounts that have never completed a payment.
 * @returns {Promise<{ users: NonPremiumUser[], counts: { total: number, premium: number, nonPremium: number } }>}
 */
export async function fetchNonPremiumUsers() {
  const res = await fetch("/api/admin/non-premium-users", { cache: "no-store" });
  const data = await parseResponse(res);
  return {
    users: data.users || [],
    counts: data.counts || { total: 0, premium: 0, nonPremium: 0 },
  };
}

/**
 * Sends the subscription reminder to any number of users. The list is split
 * into requests the API accepts; `onProgress(done, total)` is called after each one.
 *
 * @param {string[]} userIds
 * @param {{ title?: string, message?: string, force?: boolean }} [options]
 * @param {(done: number, total: number) => void} [onProgress]
 * @returns {Promise<ReminderResult>}
 */
export async function sendSubscriptionReminders(userIds, options = {}, onProgress) {
  const totals = {
    total: 0,
    sent: 0,
    skipped: { premium: 0, missing: 0, recentlyReminded: 0, optedOut: 0 },
  };

  for (let i = 0; i < userIds.length; i += REMINDER_MAX_USERS_PER_REQUEST) {
    const chunk = userIds.slice(i, i + REMINDER_MAX_USERS_PER_REQUEST);
    try {
      const res = await fetch("/api/admin/non-premium-users/remind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userIds: chunk,
          title: options.title,
          message: options.message,
          force: options.force === true,
        }),
      });
      const data = await parseResponse(res);

      totals.total += data.total || 0;
      totals.sent += data.sent || 0;
      Object.keys(totals.skipped).forEach((key) => {
        totals.skipped[key] += data.skipped?.[key] || 0;
      });
    } catch (err) {
      if (totals.sent > 0) {
        throw new Error(
          `${err.message} — reminders had already been sent to ${totals.sent} user${totals.sent === 1 ? "" : "s"} before this error.`
        );
      }
      throw err;
    }
    if (onProgress) onProgress(Math.min(i + chunk.length, userIds.length), userIds.length);
  }

  return totals;
}
