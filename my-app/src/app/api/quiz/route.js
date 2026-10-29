import { getAuth } from "firebase-admin/auth";
import { NextResponse } from "next/server";
import { getAdminApp, isFirebaseAdminConfigured } from "../../../lib/firebaseAdmin";
import { QuizApiError, runQuizAction } from "../../../lib/quizServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getAllowedOrigin(origin) {
  if (!origin) return "";
  try {
    const url = new URL(origin);
    if (url.origin !== origin || url.username || url.password) return null;

    const isLocalOrigin =
      (url.protocol === "http:" || url.protocol === "https:") &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1");
    const isFaithFramesOrigin =
      url.protocol === "https:" &&
      (url.hostname === "faithframes.online" || url.hostname.endsWith(".faithframes.online"));

    return isLocalOrigin || isFaithFramesOrigin ? url.origin : null;
  } catch {
    return null;
  }
}

function withCors(response, origin) {
  const headers = new Headers(response.headers);
  const varyValues = (headers.get("Vary") || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (!varyValues.some((value) => value.toLowerCase() === "origin")) {
    varyValues.push("Origin");
  }
  headers.set("Vary", varyValues.join(", "));
  if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
    headers.set("Access-Control-Max-Age", "600");
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function jsonResponse(body, status, origin) {
  return withCors(NextResponse.json(body, { status }), origin);
}

function errorStatus(code) {
  return {
    "invalid-argument": 400,
    unauthenticated: 401,
    "permission-denied": 403,
    "not-found": 404,
    "already-exists": 409,
    "failed-precondition": 412,
    internal: 500,
  }[code] || 500;
}

export async function OPTIONS(request) {
  const origin = getAllowedOrigin(request.headers.get("origin") || "");
  if (origin === null) {
    return jsonResponse({ message: "Origin is not allowed." }, 403, "");
  }
  return withCors(new Response(null, { status: 204 }), origin);
}

export async function POST(request) {
  const origin = getAllowedOrigin(request.headers.get("origin") || "");
  if (origin === null) {
    return jsonResponse({ message: "Origin is not allowed." }, 403, "");
  }
  if (!isFirebaseAdminConfigured()) {
    return jsonResponse({ message: "Quiz API is not configured." }, 503, origin);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ message: "Invalid JSON request body." }, 400, origin);
  }

  try {
    const { action, data = {} } = body || {};
    if (
      !["getQuizQuestions", "startQuizSession", "answerQuizQuestion", "submitQuizSession"].includes(
        action
      )
    ) {
      return jsonResponse({ message: "Unknown quiz action." }, 400, origin);
    }
    const authorization = request.headers.get("authorization") || "";
    let authContext = null;
    if (authorization) {
      const match = authorization.match(/^Bearer\s+(.+)$/i);
      if (!match) return jsonResponse({ message: "Invalid authorization header." }, 401, origin);
      try {
        const decoded = await getAuth(getAdminApp()).verifyIdToken(match[1]);
        authContext = { uid: decoded.uid, name: decoded.name, picture: decoded.picture };
      } catch {
        return jsonResponse({ message: "Authentication token is invalid or expired." }, 401, origin);
      }
    }

    const result = await runQuizAction(action, data, authContext);
    return jsonResponse(result, 200, origin);
  } catch (error) {
    if (error instanceof QuizApiError) {
      return jsonResponse({ message: error.message }, errorStatus(error.code), origin);
    }
    console.error("[api/quiz POST]", error);
    return jsonResponse({ message: "Quiz request failed." }, 500, origin);
  }
}
