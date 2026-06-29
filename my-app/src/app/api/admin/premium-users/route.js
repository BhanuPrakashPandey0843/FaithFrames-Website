import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { requireAdminSession } from "../../../../lib/requireAdminSession";
import { getAdminDb, isFirebaseAdminConfigured } from "../../../../lib/firebaseAdmin";

const MOCK_PREMIUM_USERS = [
  {
    name: "Sarah Jenkins",
    email: "sarah.j@example.com",
    phoneNumber: "+1 (555) 234-5678",
    photoURL: "https://i.pravatar.cc/150?img=47",
    isPremium: true,
    premiumPlan: "Lifetime Access",
    subscriptionStatus: "Active",
    amountPaid: 49.99,
    paymentGateway: "Stripe",
    transactionId: "ch_3Mv8xK2eZvKYlo2C1g9a8b7c",
    purchaseDate: "2025-12-10T14:30:00Z",
    expiryDate: "N/A",
    autoRenewal: false,
    platform: "iOS",
    lastLogin: "2026-06-28T09:15:00Z"
  },
  {
    name: "David Chen",
    email: "dchen@example.com",
    phoneNumber: "+1 (555) 876-5432",
    photoURL: "https://i.pravatar.cc/150?img=33",
    isPremium: true,
    premiumPlan: "Monthly Pass",
    subscriptionStatus: "Active",
    amountPaid: 4.99,
    paymentGateway: "Razorpay",
    transactionId: "pay_O9xK2eZvKYlo2C",
    purchaseDate: "2026-06-15T08:12:00Z",
    expiryDate: "2026-07-15T08:12:00Z",
    autoRenewal: true,
    platform: "Android",
    lastLogin: "2026-06-27T18:40:00Z"
  },
  {
    name: "Grace O'Connor",
    email: "grace.oc@example.com",
    phoneNumber: "+353 87 123 4567",
    photoURL: "https://i.pravatar.cc/150?img=5",
    isPremium: true,
    premiumPlan: "Yearly Devotion",
    subscriptionStatus: "Active",
    amountPaid: 29.99,
    paymentGateway: "Apple In-App",
    transactionId: "1000000876543210",
    purchaseDate: "2026-01-20T11:45:00Z",
    expiryDate: "2027-01-20T11:45:00Z",
    autoRenewal: true,
    platform: "iOS",
    lastLogin: "2026-06-28T07:22:00Z"
  },
  {
    name: "Michael Adebayo",
    email: "madebayo@example.com",
    phoneNumber: "+234 803 123 4567",
    photoURL: "https://i.pravatar.cc/150?img=12",
    isPremium: true,
    premiumPlan: "Monthly Pass",
    subscriptionStatus: "Expired",
    amountPaid: 4.99,
    paymentGateway: "Google Play",
    transactionId: "GPA.3321-4567-8901-23456",
    purchaseDate: "2026-04-10T16:20:00Z",
    expiryDate: "2026-05-10T16:20:00Z",
    autoRenewal: false,
    platform: "Android",
    lastLogin: "2026-05-09T14:10:00Z"
  },
  {
    name: "Emma Watson",
    email: "emma.w@example.com",
    phoneNumber: "+44 7911 123456",
    photoURL: "https://i.pravatar.cc/150?img=32",
    isPremium: true,
    premiumPlan: "Yearly Devotion",
    subscriptionStatus: "Cancelled",
    amountPaid: 29.99,
    paymentGateway: "Stripe",
    transactionId: "ch_3Mv8xK2eZvKYlo2C9x8y7z6w",
    purchaseDate: "2026-02-14T09:00:00Z",
    expiryDate: "2027-02-14T09:00:00Z",
    autoRenewal: false,
    platform: "iOS",
    lastLogin: "2026-06-25T11:30:00Z"
  }
];

function unauthorized() {
  return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
}

export async function GET(req) {
  const session = await requireAdminSession(req);
  if (!session) return unauthorized();

  // If Firebase Admin isn't configured, return mock data
  if (!isFirebaseAdminConfigured()) {
    const mockUsersWithIds = MOCK_PREMIUM_USERS.map((user, index) => ({
      ...user,
      id: `mock-user-${index}`,
    }));
    return NextResponse.json({ premiumUsers: mockUsersWithIds });
  }

  const { searchParams } = new URL(req.url);
  const seedParam = searchParams.get("seed") === "true";
  const refreshParam = searchParams.get("refresh") === "true";

  try {
    const db = getAdminDb();
    
    // Check if we need to seed mock data
    if (seedParam) {
      const batch = db.batch();
      for (const item of MOCK_PREMIUM_USERS) {
        const userRef = db.collection("users").doc();
        batch.set(userRef, {
          ...item,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        });
      }
      await batch.commit();
    }

    // Query premium users (where isPremium == true)
    let snapshot = await db.collection("users").where("isPremium", "==", true).get();

    // Auto-seed in dev if there are no premium users in firestore
    if (snapshot.empty && !refreshParam) {
      const batch = db.batch();
      for (const item of MOCK_PREMIUM_USERS) {
        const userRef = db.collection("users").doc();
        batch.set(userRef, {
          ...item,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        });
      }
      await batch.commit();
      // Re-query after seeding
      snapshot = await db.collection("users").where("isPremium", "==", true).get();
    }

    const premiumUsers = snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        name: data.name || "",
        email: data.email || "",
        phoneNumber: data.phoneNumber || "",
        photoURL: data.photoURL || "",
        isPremium: data.isPremium || false,
        premiumPlan: data.premiumPlan || "",
        subscriptionStatus: data.subscriptionStatus || "Expired",
        amountPaid: typeof data.amountPaid === "number" ? data.amountPaid : 0,
        paymentGateway: data.paymentGateway || "Stripe",
        transactionId: data.transactionId || "",
        purchaseDate: data.purchaseDate || (data.createdAt?.toDate?.()?.toISOString()) || new Date().toISOString(),
        expiryDate: data.expiryDate || "N/A",
        autoRenewal: data.autoRenewal || false,
        platform: data.platform || "iOS",
        lastLogin: data.lastLogin || (data.updatedAt?.toDate?.()?.toISOString()) || new Date().toISOString(),
      };
    });

    return NextResponse.json({ premiumUsers });
  } catch (err) {
    console.error("[api/admin/premium-users GET]", err);
    return NextResponse.json({ message: "Failed to load premium users" }, { status: 500 });
  }
}
