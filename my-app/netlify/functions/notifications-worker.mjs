// Runs every minute (Netlify scheduled function, production deploys only) and asks the Next.js app
// to process due notification work: send queued/scheduled campaigns in batches and collect push
// receipts. If this function is not deployed, or NOTIFICATION_CRON_SECRET is missing, admin
// campaigns stay "Queued" and nothing is ever delivered.
export const config = { schedule: "* * * * *" };

export default async function notificationsWorker() {
  const baseUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;
  const secret = process.env.NOTIFICATION_CRON_SECRET;
  if (!baseUrl || !secret) {
    throw new Error("Scheduled notification worker is missing site URL or cron secret (NOTIFICATION_CRON_SECRET).");
  }

  const response = await fetch(new URL("/api/cron/notifications", baseUrl), {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (!response.ok) {
    throw new Error(`Notification worker endpoint returned ${response.status}.`);
  }
  const summary = await response.json().catch(() => null);
  if (summary && (summary.pages > 0 || summary.receipts > 0 || summary.failed > 0)) {
    console.log("[notifications-worker]", JSON.stringify({
      campaigns: summary.processed,
      pages: summary.pages,
      recipients: summary.recipients,
      receipts: summary.receipts,
      failed: summary.failed,
    }));
  }
}
