import { NextResponse } from "next/server";
import crypto from "crypto";
import { requireAdminSession } from "../../../../lib/requireAdminSession";

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

  const { folder } = await req.json().catch(() => ({}));
  const timestamp = Math.round(Date.now() / 1000);
  const params = { timestamp };

  if (folder) {
    params.folder = folder;
  }

  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  const signature = crypto
    .createHash("sha1")
    .update(`${toSign}${apiSecret}`)
    .digest("hex");

  return NextResponse.json({
    apiKey,
    cloudName,
    timestamp,
    signature,
    folder: folder || null,
  });
}
