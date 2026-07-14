import { NextResponse } from "next/server";
import crypto from "crypto";
import { requireAdminSession } from "../../../../lib/requireAdminSession";

/**
 * Deletes a Cloudinary asset (image or video) by public_id.
 * Called after an admin removes a witness video/banner or replaces its
 * media, so unused files don't pile up in the Cloudinary account.
 */
export async function POST(req) {
  const session = await requireAdminSession(req);
  if (!session) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  const cloudName =
    process.env.CLOUDINARY_CLOUD_NAME?.trim() ||
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();

  if (!apiKey || !apiSecret || !cloudName) {
    return NextResponse.json(
      { message: "Cloudinary signing credentials are not configured on the server." },
      { status: 500 }
    );
  }

  const { publicId, resourceType } = await req.json().catch(() => ({}));
  if (!publicId) {
    return NextResponse.json({ message: "Missing publicId" }, { status: 400 });
  }
  const type = resourceType === "video" ? "video" : "image";

  const timestamp = Math.round(Date.now() / 1000);
  const toSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash("sha1").update(toSign).digest("hex");

  try {
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/${type}/destroy`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          public_id: publicId,
          timestamp: String(timestamp),
          api_key: apiKey,
          signature,
        }),
      }
    );
    const data = await res.json();
    if (data.result !== "ok" && data.result !== "not found") {
      return NextResponse.json({ message: "Cloudinary deletion failed", data }, { status: 502 });
    }
    return NextResponse.json({ success: true, result: data.result });
  } catch (err) {
    console.error("[cloudinary-delete]", err);
    return NextResponse.json({ message: "Failed to delete asset" }, { status: 500 });
  }
}
