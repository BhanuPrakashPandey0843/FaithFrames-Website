export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_TEXT_LENGTH = 2000;
export const MAX_TITLE_LENGTH = 120;

export function validateImageFile(file) {
  if (!file) {
    return { ok: false, message: 'Please select an image file.' };
  }

  if (!file.type?.startsWith('image/')) {
    return { ok: false, message: 'Only image files are allowed.' };
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, message: 'Image must be smaller than 5MB.' };
  }

  return { ok: true };
}

export function validateRequiredText(value, label, maxLength = MAX_TEXT_LENGTH) {
  const trimmed = String(value ?? '').trim();
  if (!trimmed) {
    return { ok: false, message: `${label} is required.` };
  }
  if (trimmed.length > maxLength) {
    return { ok: false, message: `${label} must be ${maxLength} characters or fewer.` };
  }
  return { ok: true, value: trimmed };
}

export const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
const VIDEO_EXTENSION_RE = /\.(mp4|mov|m4v|webm)$/i;

export function validateVideoFile(file) {
  if (!file) {
    return { ok: false, message: 'Please select a video file.' };
  }
  const looksLikeVideo = file.type?.startsWith('video/') || VIDEO_EXTENSION_RE.test(file.name || '');
  if (!looksLikeVideo) {
    return { ok: false, message: 'Only video files (mp4, mov, m4v, webm) are allowed.' };
  }
  if (file.size > MAX_VIDEO_BYTES) {
    return { ok: false, message: 'Video must be smaller than 200MB.' };
  }
  return { ok: true };
}

export function validateOptionalNumber(value, label, { min = 0, max = Infinity } = {}) {
  if (value === '' || value === null || value === undefined) {
    return { ok: true, value: 0 };
  }
  const num = Number(value);
  if (Number.isNaN(num)) {
    return { ok: false, message: `${label} must be a number.` };
  }
  if (num < min || num > max) {
    return { ok: false, message: `${label} must be between ${min} and ${max}.` };
  }
  return { ok: true, value: num };
}
