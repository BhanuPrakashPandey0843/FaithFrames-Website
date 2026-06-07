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
