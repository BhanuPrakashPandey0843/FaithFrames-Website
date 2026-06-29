import { NextResponse } from "next/server";
import crypto from "crypto";
import { firebaseGetUserRole, firebaseSignInWithPassword } from "../../../lib/firebaseAuthApi";

function signSessionToken(email) {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error("ADMIN_SESSION_SECRET is not configured");
  }

  const payload = {
    email,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };

  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(data)
    .digest("base64url");

  return `${data}.${signature}`;
}

function setAuthCookie(response, token) {
  response.cookies.set("authToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

function credentialsConfigured() {
  const hasAdminEnv =
    Boolean(process.env.ADMIN_EMAIL?.trim()) &&
    Boolean(process.env.ADMIN_PASSWORD?.trim());
  const hasFirebase =
    Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim()) &&
    Boolean(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim());
  return hasAdminEnv || hasFirebase;
}

async function tryEnvAdminLogin(email, password) {
  const adminEmail = process.env.ADMIN_EMAIL?.trim()?.toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD?.trim();
  console.log("\n[DEBUG] tryEnvAdminLogin");
  console.log("  Input email:", JSON.stringify(email));
  console.log("  Expected email:", JSON.stringify(adminEmail));
  console.log("  Input password:", JSON.stringify(password));
  console.log("  Expected password:", JSON.stringify(adminPassword));
  console.log("  Email match?", email === adminEmail);
  console.log("  Password match?", password === adminPassword);
  if (!adminEmail || !adminPassword) return false;
  return email === adminEmail && password === adminPassword;
}

async function tryFirebaseAdminLogin(email, password) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();
  if (!projectId || !apiKey) return { ok: false, reason: "firebase_not_configured" };

  const signIn = await firebaseSignInWithPassword(email, password);
  if (!signIn.ok) return { ok: false, reason: "invalid_credentials" };

  const adminEmail = process.env.ADMIN_EMAIL?.trim()?.toLowerCase();
  const role = await firebaseGetUserRole(projectId, signIn.idToken, signIn.localId);
  const isAdminRole = role === "admin";
  const isConfiguredAdminEmail = adminEmail && signIn.email?.toLowerCase() === adminEmail;

  if (!isAdminRole && !isConfiguredAdminEmail) {
    return { ok: false, reason: "not_admin" };
  }

  return { ok: true, email: signIn.email };
}

export async function POST(req) {
  try {
    const { email, password } = await req.json();
    const normalizedEmail = String(email ?? "").trim().toLowerCase();
    const normalizedPassword = String(password ?? "").trim();

    console.log("[DEBUG] Login attempt received");
    console.log("[DEBUG] Input email:", email);
    console.log("[DEBUG] Normalized email:", normalizedEmail);
    console.log("[DEBUG] Input password length:", password?.length);

    if (!normalizedEmail || !normalizedPassword) {
      return NextResponse.json(
        { success: false, message: "Email and password are required." },
        { status: 400 }
      );
    }

    if (!process.env.ADMIN_SESSION_SECRET?.trim()) {
      console.error("[DEBUG] ADMIN_SESSION_SECRET not configured");
      return NextResponse.json(
        { success: false, message: "Session secret is not configured on the server." },
        { status: 500 }
      );
    }

    const credentialsOk = credentialsConfigured();
    console.log("[DEBUG] credentialsConfigured():", credentialsOk);

    if (!credentialsOk) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Admin credentials are not configured. Fill shared/firebase.env and run scripts/sync-firebase-env.ps1.",
        },
        { status: 500 }
      );
    }

    let sessionEmail = null;

    const envLoginResult = await tryEnvAdminLogin(normalizedEmail, normalizedPassword);
    console.log("[DEBUG] tryEnvAdminLogin result:", envLoginResult);
    
    if (envLoginResult) {
      sessionEmail = normalizedEmail;
    } else {
      console.log("[DEBUG] Trying Firebase admin login...");
      const firebaseResult = await tryFirebaseAdminLogin(
        normalizedEmail,
        normalizedPassword
      );
      console.log("[DEBUG] tryFirebaseAdminLogin result:", firebaseResult);

      if (firebaseResult.ok) {
        sessionEmail = firebaseResult.email?.toLowerCase() ?? normalizedEmail;
      } else if (firebaseResult.reason === "not_admin") {
        return NextResponse.json(
          { success: false, message: "This account does not have admin access." },
          { status: 403 }
        );
      } else {
        return NextResponse.json(
          { success: false, message: "Invalid email or password." },
          { status: 401 }
        );
      }
    }

    const token = signSessionToken(sessionEmail);
    const response = NextResponse.json(
      { success: true, message: "Login successful" },
      { status: 200 }
    );
    setAuthCookie(response, token);
    return response;
  } catch (err) {
    console.error("[login] error:", err);
    return NextResponse.json(
      { success: false, message: "Error logging in." },
      { status: 500 }
    );
  }
}
