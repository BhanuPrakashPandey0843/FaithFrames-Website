import { UserProfile } from "./users";

export interface PremiumUser extends UserProfile {
  isPremium: boolean;
  premiumPlan: string;          // e.g. "Lifetime Access", "Monthly Pass", "Yearly Devotion"
  subscriptionStatus: "Active" | "Expired" | "Cancelled";
  amountPaid: number;           // e.g. 49.99
  paymentGateway: "Stripe" | "Razorpay" | "Google Play" | "Apple In-App";
  transactionId: string;
  purchaseDate: string;         // ISO date string
  expiryDate: string;           // ISO date string or "N/A"
  autoRenewal: boolean;
  platform: "Android" | "iOS";
}

export interface PremiumStats {
  totalPremiumUsers: number;
  totalRevenue: number;
  activeSubscriptions: number;
  expiryWarnings: number; // Subscriptions expiring within 7 days
}

/**
 * Fetches all premium users.
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
 * Refreshes database state and returns premium users.
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
