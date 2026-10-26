export const config = { schedule: "* * * * *" };

export default async function notificationsWorker() {
  const baseUrl = process.env.URL || process.env.DEPLOY_PRIME_URL;
  const secret = process.env.NOTIFICATION_CRON_SECRET;
  if (!baseUrl || !secret) {
    throw new Error("Scheduled notification worker is missing site URL or cron secret.");
  }

  const response = await fetch(new URL("/api/cron/notifications", baseUrl), {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  });
  if (!response.ok) {
    throw new Error(`Notification worker endpoint returned ${response.status}.`);
  }
}
