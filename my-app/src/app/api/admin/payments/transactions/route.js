import { NextResponse } from "next/server";
import { requireAdminSession } from "../../../../../lib/requireAdminSession";
import { getAdminDb, isFirebaseAdminConfigured } from "../../../../../lib/firebaseAdmin";

function unauthorized() {
  return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
}

export async function GET(req) {
  const session = await requireAdminSession(req);
  if (!session) return unauthorized();

  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json({ message: "Firebase Admin is not configured." }, { status: 500 });
  }

  try {
    const db = getAdminDb();
    const snapshot = await db.collection("users").where("isPremium", "==", true).get();

    const transactions = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: `tx_${docSnap.id}`,
        userId: docSnap.id,
        userName: data.name || "",
        userEmail: data.email || "",
        amount: typeof data.amountPaid === "number" ? data.amountPaid : 0,
        currency: "USD",
        gateway: data.paymentGateway || "Stripe",
        status: data.subscriptionStatus === "Expired" ? "failed" : "success",
        transactionId: data.transactionId || `tx_${Math.random().toString(36).substring(2, 11)}`,
        createdAt: data.purchaseDate || new Date().toISOString(),
      };
    });

    // Sort by purchase/created date descending
    transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ transactions });
  } catch (err) {
    console.error("[api/admin/payments/transactions GET]", err);
    return NextResponse.json({ message: "Failed to load transactions" }, { status: 500 });
  }
}
