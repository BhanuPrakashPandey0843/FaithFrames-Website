const PLACEHOLDER_PREFIXES = ["$EXPO_PUBLIC_", "$NEXT_PUBLIC_"];

function isPlaceholder(value) {
  if (!value || value === "undefined") return true;
  return PLACEHOLDER_PREFIXES.some((prefix) => value.startsWith(prefix));
}

export function resolveFirebaseConfig() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  };

  const measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? "";
  if (measurementId && !isPlaceholder(measurementId)) {
    return { ...config, measurementId };
  }

  return config;
}

export function isValidFirebaseConfig(config) {
  const required = [
    config.apiKey,
    config.authDomain,
    config.projectId,
    config.storageBucket,
    config.messagingSenderId,
    config.appId,
  ];
  return required.every(
    (value) => typeof value === "string" && value.length > 0 && !isPlaceholder(value)
  );
}
