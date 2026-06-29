import { NextResponse } from "next/server";
import { verifySessionToken } from "./lib/session";

export async function proxy(req) {
  const token = req.cookies.get("authToken")?.value;
  const session = await verifySessionToken(token);

  if (!session) {
    const response = NextResponse.redirect(new URL("/login", req.url));
    if (token) {
      response.cookies.set("authToken", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
    }
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
