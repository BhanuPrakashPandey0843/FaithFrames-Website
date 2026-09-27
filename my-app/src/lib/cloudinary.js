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

  const url = String(data.secure_url || data.url || "").trim();
  if (!url) {
    throw new Error("Cloudinary did not return an image URL");
  }
  return url.startsWith("http://") ? `https://${url.slice("http://".length)}` : url;
}

/**
 * Upload a video file to Cloudinary (resource_type=video) with live progress
 * reporting and cancel support. Uses XMLHttpRequest instead of fetch because
 * fetch cannot report upload progress.
 *
 * @param {File} file
 * @param {string} folder Cloudinary folder, e.g. WITNESS_VIDEO_CLOUDINARY_FOLDER
 * @param {(percent: number) => void} [onProgress] 0-100
 * @returns {{ promise: Promise<{secure_url: string, public_id: string, duration: number}>, cancel: () => void }}
 */
export function uploadVideoToCloudinary(file, folder, onProgress) {
  const xhr = new XMLHttpRequest();
  let aborted = false;

  const promise = (async () => {
    if (!file) {
      throw new Error("No file provided");
    }
    if (file.size > 200 * 1024 * 1024) {
      throw new Error("Video must be smaller than 200MB");
    }

    const signed = await getSignedUploadParams(folder);
    if (!signed?.signature) {
      throw new Error("Could not get an upload signature. Check Cloudinary server credentials.");
    }

    const uploadUrl = `https://api.cloudinary.com/v1_1/${signed.cloudName}/video/upload`;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", signed.apiKey);
    formData.append("timestamp", String(signed.timestamp));
    formData.append("signature", signed.signature);
    if (folder) formData.append("folder", folder);

    return new Promise((resolve, reject) => {
      xhr.open("POST", uploadUrl);

      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable && onProgress) {
          onProgress(Math.round((evt.loaded / evt.total) * 100));
        }
      };

      xhr.onload = () => {
        if (aborted) return;
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve({
              secure_url: data.secure_url,
              public_id: data.public_id,
              duration: Math.round(data.duration || 0),
            });
          } else {
            reject(new Error(data.error?.message || "Cloudinary video upload failed"));
          }
        } catch {
          reject(new Error("Unexpected response from Cloudinary"));
        }
      };

      xhr.onerror = () => {
        if (!aborted) reject(new Error("Network error during video upload"));
      };
      xhr.onabort = () => reject(new Error("Upload cancelled"));

      xhr.send(formData);
    });
  })();

  return {
    promise,
    cancel: () => {
      aborted = true;
      xhr.abort();
    },
  };
}

/** Delete an uploaded asset from Cloudinary via the signed admin API route. */
export async function deleteCloudinaryAsset(publicId, resourceType = "image") {
  if (!publicId) return;
  try {
    await fetch("/api/admin/cloudinary-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicId, resourceType }),
    });
  } catch {
    // best-effort cleanup — don't block the UI on failure
  }
}
