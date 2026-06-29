export interface Transaction {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  currency: string;
  gateway: "Stripe" | "Razorpay" | "Google Play" | "Apple In-App";
  status: "success" | "failed" | "pending";
  transactionId: string;
  createdAt: string; // ISO date string
}

/**
 * Fetches transaction logs for audit.
 */
export async function fetchTransactions(): Promise<Transaction[]> {
  try {
    const res = await fetch("/api/admin/payments/transactions", { cache: "no-store" });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error ${res.status}`);
    }
    const data = await res.json();
    return data.transactions || [];
  } catch (err: any) {
    console.error("[services/payments fetchTransactions]", err);
    throw err;
  }
}
