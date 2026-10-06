// Server-side helpers that decide who is a "premium" (paid) user and who is not.
//
// Source of truth: the `payments` collection written by the
// `verifyAndActivateSubscription` Cloud Function (status === "completed").
// `users/{uid}.subscription` (written by the same function) supplies the plan,
// expiry date and current subscription status.
//
// A top-level `users/{uid}.isPremium === true` flag is also honoured so that
// manually flagged accounts and the `add-sample-premium-user.js` script keep
// showing up as premium.
//
// Everyone else with a `users` document is a non-premium (profile-only) user.

const DAY_MS = 24 * 60 * 60 * 1000;

const PLAN_LABELS = {
  yearly_india: "Yearly (India)",
  yearly_international: "Yearly (International)",
};

const GATEWAY_LABELS = {
  razorpay: "Razorpay",
  stripe: "Stripe",
};

const STATUS_LABELS = {
  active: "Active",
  grace_period: "Grace Period",
  renewal_pending: "Renewal Pending",
  expired: "Expired",
  cancelled: "Cancelled",
  suspended: "Suspended",
  refunded: "Refunded",
  inactive: "Inactive",
};

/** Fields read from each user when listing non-premium users (keeps payloads small). */
const NON_PREMIUM_FIELDS = [
  "name",
  "email",
  "phoneNumber",
  "photoURL",
  "address",
  "country",
  "createdAt",
  "updatedAt",
  "subscription.status",
  "lastReminderAt",
  "reminderCount",
];

// ─── Small utilities ─────────────────────────────────────────────────────────

/** Accepts Firestore Timestamps, Dates, epoch millis and date strings. */
export function toMillis(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (typeof value.toMillis === "function") return value.toMillis();
  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isNaN(t) ? null : t;
  }
  if (typeof value._seconds === "number") return value._seconds * 1000;
  return null;
}

export function toISO(value) {
  const ms = toMillis(value);
  return ms === null ? "" : new Date(ms).toISOString();
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function capitalize(text) {
  const s = String(text || "");
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

// ─── Premium members ─────────────────────────────────────────────────────────

/** Map<userId, completedPayment[]> — every payment that went through. */
async function fetchCompletedPaymentsByUser(db) {
  const snapshot = await db.collection("payments").where("status", "==", "completed").get();
  const byUser = new Map();
  snapshot.docs.forEach((docSnap) => {
    const payment = docSnap.data();
    if (!payment.userId) return;
    const list = byUser.get(payment.userId) || [];
    list.push({ id: docSnap.id, ...payment });
    byUser.set(payment.userId, list);
  });
  return byUser;
}

async function fetchFlaggedPremiumIds(db) {
  const snapshot = await db.collection("users").where("isPremium", "==", true).select().get();
  return snapshot.docs.map((docSnap) => docSnap.id);
}

/** Set of every user id that counts as premium. */
export async function getPremiumUserIds(db) {
  const [byUser, flagged] = await Promise.all([
    fetchCompletedPaymentsByUser(db),
    fetchFlaggedPremiumIds(db),
  ]);
  return new Set([...byUser.keys(), ...flagged]);
}

function buildPremiumMember(uid, userData, payments) {
  const profileMissing = !userData;
  const data = userData || {};
  const sub = data.subscription || {};

  const sorted = [...payments].sort(
    (a, b) => (toMillis(b.createdAt) ?? 0) - (toMillis(a.createdAt) ?? 0)
  );
  const latest = sorted[0] || null;

  // Payments are stored in the smallest currency unit (paise / cents).
  // Flagged accounts without payment records carry a flat `amountPaid` that is
  // already in major units.
  let currency;
  let amountPaid;
  const revenue = {};
  if (latest) {
    currency = String(latest.currency || sub.currency || "USD").toUpperCase();
    amountPaid = typeof latest.amount === "number" ? round2(latest.amount / 100) : 0;
    sorted.forEach((payment) => {
      const c = String(payment.currency || currency).toUpperCase();
      const major = typeof payment.amount === "number" ? payment.amount / 100 : 0;
      revenue[c] = round2((revenue[c] || 0) + major);
    });
  } else {
    currency = String(data.currency || sub.currency || "USD").toUpperCase();
    amountPaid =
      typeof data.amountPaid === "number"
        ? data.amountPaid
        : typeof sub.amount === "number"
        ? round2(sub.amount / 100)
        : 0;
    if (amountPaid) revenue[currency] = amountPaid;
  }

  const rawStatus = String(sub.status || data.subscriptionStatus || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");

  const purchaseMs = toMillis(sub.startDate) ?? toMillis(data.purchaseDate) ?? toMillis(latest?.createdAt);
  const expiryMs = toMillis(sub.expiryDate) ?? toMillis(data.expiryDate);
  const gatewayKey = String(latest?.gateway || "").toLowerCase();

  return {
    id: uid,
    name: data.name || data.displayName || (profileMissing ? "Unknown user" : ""),
    email: data.email || "",
    phoneNumber: data.phoneNumber || "",
    photoURL: data.photoURL || "",
    country: data.country || "",
    isPremium: true,
    profileMissing,
    planId: sub.planId || "",
    premiumPlan: PLAN_LABELS[sub.planId] || data.premiumPlan || (sub.planId ? String(sub.planId) : "Premium"),
    subscriptionStatusRaw: rawStatus,
    subscriptionStatus: STATUS_LABELS[rawStatus] || (rawStatus ? capitalize(rawStatus) : "Unknown"),
    amountPaid,
    currency,
    revenue,
    paymentCount: sorted.length || (amountPaid ? 1 : 0),
    paymentGateway:
      GATEWAY_LABELS[gatewayKey] || data.paymentGateway || (gatewayKey ? capitalize(gatewayKey) : ""),
    transactionId: latest?.transactionId || latest?.orderId || data.transactionId || "",
    purchaseDate: purchaseMs === null ? "" : new Date(purchaseMs).toISOString(),
    expiryDate: expiryMs === null ? "N/A" : new Date(expiryMs).toISOString(),
    autoRenewal: Boolean(data.autoRenewal),
    platform: data.platform || "",
    lastLogin: toISO(data.lastLogin) || toISO(data.updatedAt),
  };
}

/** Everyone who has successfully paid, newest purchase first. */
export async function loadPremiumMembers(db) {
  const [byUser, flagged] = await Promise.all([
    fetchCompletedPaymentsByUser(db),
    fetchFlaggedPremiumIds(db),
  ]);
  const ids = [...new Set([...byUser.keys(), ...flagged])];

  const userDocs = new Map();
  for (let i = 0; i < ids.length; i += 300) {
    const refs = ids.slice(i, i + 300).map((id) => db.collection("users").doc(id));
    const snaps = await db.getAll(...refs);
    snaps.forEach((snap) => userDocs.set(snap.id, snap.exists ? snap.data() : null));
  }

  const members = ids.map((id) => buildPremiumMember(id, userDocs.get(id) || null, byUser.get(id) || []));
  members.sort((a, b) => (Date.parse(b.purchaseDate) || 0) - (Date.parse(a.purchaseDate) || 0));
  return members;
}

export function computePremiumStats(members, now = Date.now()) {
  const soon = now + 7 * DAY_MS;
  const revenueByCurrency = {};
  let activeSubscriptions = 0;
  let expiryWarnings = 0;

  members.forEach((member) => {
    Object.entries(member.revenue || {}).forEach(([currency, amount]) => {
      revenueByCurrency[currency] = round2((revenueByCurrency[currency] || 0) + amount);
    });
    if (member.subscriptionStatusRaw === "active") {
      activeSubscriptions++;
      const expiry = Date.parse(member.expiryDate);
      if (!Number.isNaN(expiry) && expiry > now && expiry <= soon) expiryWarnings++;
    }
  });

  return {
    totalPremiumUsers: members.length,
    activeSubscriptions,
    expiryWarnings,
    revenueByCurrency,
  };
}

// ─── Non-premium users ───────────────────────────────────────────────────────

function buildNonPremiumUser(docSnap) {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    name: data.name || "",
    email: data.email || "",
    phoneNumber: data.phoneNumber || "",
    photoURL: data.photoURL || "",
    address: data.address || "",
    country: data.country || "",
    createdAt: toISO(data.createdAt),
    lastActive: toISO(data.updatedAt),
    // "none" = never subscribed; otherwise the status of a previous subscription
    // (e.g. refunded / expired) that no longer counts as a successful purchase.
    subscriptionStatus: data.subscription?.status || "none",
    lastReminderAt: toISO(data.lastReminderAt),
    reminderCount: typeof data.reminderCount === "number" ? data.reminderCount : 0,
  };
}

/** Every account that has not paid, newest sign-up first. */
export async function loadNonPremiumUsers(db) {
  const [snapshot, premiumIds] = await Promise.all([
    db.collection("users").select(...NON_PREMIUM_FIELDS).get(),
    getPremiumUserIds(db),
  ]);

  const users = [];
  snapshot.docs.forEach((docSnap) => {
    if (!premiumIds.has(docSnap.id)) users.push(buildNonPremiumUser(docSnap));
  });
  users.sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0));

  return {
    users,
    counts: {
      total: snapshot.size,
      premium: premiumIds.size,
      nonPremium: users.length,
    },
  };
}

// ─── Dev fallbacks (used only when Firebase Admin is not configured) ─────────

function mockMember(overrides) {
  return {
    phoneNumber: "",
    photoURL: "",
    country: "",
    isPremium: true,
    profileMissing: false,
    autoRenewal: false,
    platform: "",
    paymentCount: 1,
    ...overrides,
  };
}

export function getMockPremiumUsers() {
  const now = Date.now();
  const iso = (offsetDays) => new Date(now + offsetDays * DAY_MS).toISOString();
  return [
    mockMember({
      id: "mock-premium-1",
      name: "Sarah Jenkins",
      email: "sarah.j@example.com",
      country: "US",
      planId: "yearly_international",
      premiumPlan: PLAN_LABELS.yearly_international,
      subscriptionStatus: "Active",
      subscriptionStatusRaw: "active",
      amountPaid: 1,
      currency: "USD",
      revenue: { USD: 1 },
      paymentGateway: "Stripe",
      transactionId: "pi_mock_0001",
      purchaseDate: iso(-30),
      expiryDate: iso(335),
      lastLogin: iso(-1),
    }),
    mockMember({
      id: "mock-premium-2",
      name: "Arjun Mehta",
      email: "arjun.m@example.com",
      country: "IN",
      planId: "yearly_india",
      premiumPlan: PLAN_LABELS.yearly_india,
      subscriptionStatus: "Active",
      subscriptionStatusRaw: "active",
      amountPaid: 10,
      currency: "INR",
      revenue: { INR: 10 },
      paymentGateway: "Razorpay",
      transactionId: "pay_mock_0002",
      purchaseDate: iso(-360),
      expiryDate: iso(5),
      lastLogin: iso(-2),
    }),
    mockMember({
      id: "mock-premium-3",
      name: "Grace O'Connor",
      email: "grace.oc@example.com",
      country: "IE",
      planId: "yearly_international",
      premiumPlan: PLAN_LABELS.yearly_international,
      subscriptionStatus: "Expired",
      subscriptionStatusRaw: "expired",
      amountPaid: 1,
      currency: "USD",
      revenue: { USD: 1 },
      paymentGateway: "Stripe",
      transactionId: "pi_mock_0003",
      purchaseDate: iso(-400),
      expiryDate: iso(-35),
      lastLogin: iso(-40),
    }),
  ];
}

export function getMockNonPremiumUsers() {
  const now = Date.now();
  const iso = (offsetDays) => new Date(now + offsetDays * DAY_MS).toISOString();
  const base = {
    phoneNumber: "",
    photoURL: "",
    address: "",
    country: "",
    subscriptionStatus: "none",
    lastReminderAt: "",
    reminderCount: 0,
  };
  return [
    { ...base, id: "mock-free-1", name: "David Chen", email: "dchen@example.com", createdAt: iso(-2), lastActive: iso(-1) },
    { ...base, id: "mock-free-2", name: "Emma Watson", email: "emma.w@example.com", createdAt: iso(-14), lastActive: iso(-3), lastReminderAt: iso(-5), reminderCount: 1 },
    { ...base, id: "mock-free-3", name: "Michael Adebayo", email: "madebayo@example.com", createdAt: iso(-45), lastActive: iso(-20) },
    { ...base, id: "mock-free-4", name: "Priya Nair", email: "priya.n@example.com", createdAt: iso(-90), lastActive: iso(-60), subscriptionStatus: "refunded", lastReminderAt: iso(-30), reminderCount: 2 },
  ];
}
