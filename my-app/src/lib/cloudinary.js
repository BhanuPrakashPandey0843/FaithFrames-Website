export const CLOUDINARY_CLOUD_NAME =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dhliwva4d";

export const CLOUDINARY_UPLOAD_PRESET =
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "faithframes_uploads";

export const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

async function getSignedUploadParams(folder) {
  try {
    const response = await fetch("/api/admin/cloudinary-sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder }),
    });

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch {
    return null;
  }
}

export async function uploadImageToCloudinary(file, folder) {
  if (!file) {
    throw new Error("No file provided");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Image must be smaller than 5MB");
  }

  if (!file.type?.startsWith("image/")) {
    throw new Error("Only image files are allowed");
  }

  const signed = await getSignedUploadParams(folder);
  const formData = new FormData();
  formData.append("file", file);

  const uploadUrl = signed?.cloudName
    ? `https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`
    : CLOUDINARY_UPLOAD_URL;

  if (signed?.signature) {
    formData.append("api_key", signed.apiKey);
    formData.append("timestamp", String(signed.timestamp));
    formData.append("signature", signed.signature);
    if (folder) {
      formData.append("folder", folder);
    }
  } else {
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    if (folder) {
      formData.append("folder", folder);
    }
  }

  const response = await fetch(uploadUrl, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || "Cloudinary upload failed");
  }

  return data.secure_url;
}
