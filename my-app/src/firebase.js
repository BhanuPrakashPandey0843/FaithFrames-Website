import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { isValidFirebaseConfig, resolveFirebaseConfig } from "./lib/firebaseConfig";

export const firebaseConfig = resolveFirebaseConfig();
export const hasValidFirebaseConfig = isValidFirebaseConfig(firebaseConfig);

if (!hasValidFirebaseConfig && typeof window === "undefined") {
  console.warn(
    "[Firebase] Config not fully set, but continuing for build"
  );
}

let app = null;
let db = null;
let storage = null;
let auth = null;
let analytics = null;

if (hasValidFirebaseConfig) {
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  db = getFirestore(app);
  storage = getStorage(app);
  auth = getAuth(app);

  if (typeof window !== "undefined" && firebaseConfig.measurementId) {
    import("firebase/analytics")
      .then(({ getAnalytics, isSupported }) =>
        isSupported().then((supported) => {
          if (supported) analytics = getAnalytics(app);
        })
      )
      .catch(() => {
        // Analytics optional on admin panel
      });
  }
}

// Helper functions to safely get Firebase instances
export function getFirebaseApp() { return app; }
export function getFirebaseDb() { return db; }
export function getFirebaseStorage() { return storage; }
export function getFirebaseAuth() { return auth; }

export { app, db, storage, auth, analytics };
