// Edge Runtime compatible — uses Web Crypto API instead of Node.js crypto

async function hmacSign(secret, data) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function verifySessionToken(token) {
  if (!token || typeof token !== "string") return null;

  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return null;

  const dotIndex = token.lastIndexOf(".");
  if (dotIndex === -1) return null;

  const data = token.slice(0, dotIndex);
  const signature = token.slice(dotIndex + 1);
  if (!data || !signature) return null;

  const expected = await hmacSign(secret, data);

  if (!timingSafeEqual(signature, expected)) return null;

  try {
    const payload = JSON.parse(atob(data.replace(/-/g, "+").replace(/_/g, "/")));
    if (!payload?.email || !payload?.exp || Date.now() > payload.exp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
