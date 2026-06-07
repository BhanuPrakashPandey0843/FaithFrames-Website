import { NextResponse } from "next/server";
import { verifySessionToken } from "../../../lib/session";

export async function GET(req) {
  const token = req.cookies.get("authToken")?.value;
  const session = await verifySessionToken(token);

  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    email: session.email,
    exp: session.exp,
  });
}
