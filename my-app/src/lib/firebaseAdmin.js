import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// ─── Diagnostics ─────────────────────────────────────────────────────────────
// Log which env-var path is being used so failures are immediately visible
// in `next dev` output without exposing secret values.
function logAdminDiagnostics() {
  const hasJson = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim());
  const hasProjectId = Boolean(process.env.FIREBASE_ADMIN_PROJECT_ID?.trim());
  const hasClientEmail = Boolean(process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim());
  const hasPrivateKey = Boolean(process.env.FIREBASE_ADMIN_PRIVATE_KEY?.trim());

  console.error("[firebaseAdmin] Configuration diagnostics:");
  console.error("  FIREBASE_SERVICE_ACCOUNT_JSON present:", hasJson);
  console.error("  FIREBASE_ADMIN_PROJECT_ID present:     ", hasProjectId);
  console.error("  FIREBASE_ADMIN_CLIENT_EMAIL present:   ", hasClientEmail);
  console.error("  FIREBASE_ADMIN_PRIVATE_KEY present:    ", hasPrivateKey);

  if (!hasJson && !(hasProjectId && hasClientEmail && hasPrivateKey)) {
    console.error(
      "[firebaseAdmin] FIX: Open .env.local and set either:\n" +
      "  Option A) FIREBASE_SERVICE_ACCOUNT_JSON=<paste full JSON on one line>\n" +
      "  Option B) FIREBASE_ADMIN_PROJECT_ID + FIREBASE_ADMIN_CLIENT_EMAIL + FIREBASE_ADMIN_PRIVATE_KEY"
    );
  }
}

// ─── Service-account resolver ─────────────────────────────────────────────────
function resolveServiceAccount() {
  // Option A: full JSON blob
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (json) {
    try {
      const parsed = JSON.parse(json);
      // Check required fields for JSON service account
      if (!parsed.project_id || !parsed.client_email || !parsed.private_key) {
        return null;
      }
      return parsed;
    } catch {
      // Malformed JSON — treat as not configured
      return null;
    }
  }

  // Option B: split credentials
  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim();
  const rawPrivateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.trim();
  
  // All three are required for split credentials
  if (!projectId || !clientEmail || !rawPrivateKey) {
    return null;
  }
  
  // Firebase private keys use literal \n; replace them with real newlines.
  const privateKey = rawPrivateKey.replace(/\\n/g, "\n");
  return { projectId, clientEmail, privateKey };
}

// ─── Public helpers ───────────────────────────────────────────────────────────
export function isFirebaseAdminConfigured() {
  const sa = resolveServiceAccount();
  if (!sa) return false;
  
  // Validate we have all required fields for Firebase Admin initialization
  if (sa.project_id && sa.client_email && sa.private_key) {
    return true;
  }
  if (sa.projectId && sa.clientEmail && sa.privateKey) {
    return true;
  }
  
  return false;
}

/** Returns the singleton Admin App, initialising it on first call. */
export function getAdminApp() {
  // Reuse an already-initialised app (module-level singleton via firebase-admin internals).
  const apps = getApps();
  if (apps.length > 0) return apps[0];

  const serviceAccount = resolveServiceAccount();
  if (!serviceAccount) {
    logAdminDiagnostics();
    throw new Error(
      "Firebase Admin is not configured. " +
      "Set FIREBASE_SERVICE_ACCOUNT_JSON or the three FIREBASE_ADMIN_* variables in .env.local."
    );
  }

  // project_id is the JSON key name; projectId is our normalised field name.
  const projectId = serviceAccount.project_id ?? serviceAccount.projectId;

  return initializeApp({
    credential: cert(serviceAccount),
    projectId,
  });
}

/** Returns the Admin Firestore instance. */
export function getAdminDb() {
  return getFirestore(getAdminApp());
}
