/**
 * Server-side Firebase Auth + Firestore helpers (REST, no firebase-admin required).
 * Uses the same Firebase project as the mobile app.
 */

export async function firebaseSignInWithPassword(email, password) {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "Firebase is not configured on the server." };
  }

  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );

  const data = await res.json();
  if (!res.ok) {
    return {
      ok: false,
      error: data?.error?.message || "Invalid email or password.",
    };
  }

  return {
    ok: true,
    idToken: data.idToken,
    localId: data.localId,
    email: data.email,
  };
}

export async function firebaseGetUserRole(projectId, idToken, uid) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${idToken}` },
  });

  if (!res.ok) return null;

  const doc = await res.json();
  return doc?.fields?.role?.stringValue ?? null;
}
