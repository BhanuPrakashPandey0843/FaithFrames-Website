import { UserProfile } from "./users";

export interface PremiumUser extends UserProfile {
  isPremium: boolean;
  profileMissing: boolean;      // paid, but the user's profile document no longer exists
  country?: string;
  planId: string;               // "yearly_india" | "yearly_international" | ""
  premiumPlan: string;          // display label, e.g. "Yearly (India)"
  subscriptionStatus: string;   // display label: Active, Grace Period, Expired, Cancelled, Suspended, ...
  subscriptionStatusRaw: string;
  amountPaid: number;           // latest payment, major units (e.g. 10 = ₹10 / $1.00)
  currency: string;             // ISO code of the latest payment, e.g. "INR", "USD"
  paymentCount: number;         // completed payments (renewals included)
  paymentGateway: string;       // "Stripe" | "Razorpay" | ""
  transactionId: string;
  purchaseDate: string;         // ISO date string or ""
  expiryDate: string;           // ISO date string or "N/A"
  autoRenewal: boolean;
  platform: string;             // "Android" | "iOS" | "" (not recorded for most users)
  lastLogin: string;
}

export interface PremiumStats {
  totalPremiumUsers: number;
  activeSubscriptions: number;
  expiryWarnings: number; // Active subscriptions expiring within 7 days
  revenueByCurrency: Record<string, number>; // major units per currency, e.g. { INR: 10, USD: 1 }
  totalUsers: number;
  nonPremiumUsers: number;
}

/**
 * Fetches every user who has successfully paid for a subscription.
 */
export async function fetchPremiumUsers(): Promise<PremiumUser[]> {
  try {
    const res = await fetch("/api/admin/premium-users", { cache: "no-store" });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error ${res.status}`);
    }
    const data = await res.json();
    return data.premiumUsers || [];
  } catch (err: any) {
    console.error("[services/premium fetchPremiumUsers]", err);
    throw err;
  }
}

/**
 * Reloads premium users (data is always read live from Firestore).
 */
export async function refreshPremiumData(): Promise<PremiumUser[]> {
  try {
    const res = await fetch("/api/admin/premium-users?refresh=true", { cache: "no-store" });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error ${res.status}`);
    }
    const data = await res.json();
    return data.premiumUsers || [];
  } catch (err: any) {
    console.error("[services/premium refreshPremiumData]", err);
    throw err;
  }
}

/**
 * Fetches analytics summary for premium users.
 */
export async function fetchPremiumStats(): Promise<PremiumStats> {
  try {
    const res = await fetch("/api/admin/premium-users/stats", { cache: "no-store" });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error ${res.status}`);
    }
    return await res.json();
  } catch (err: any) {
    console.error("[services/premium fetchPremiumStats]", err);
    throw err;
  }
}
