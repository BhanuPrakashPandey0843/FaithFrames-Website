// Pure helpers that decide what a given recipient wants to receive.
// Preference document shape (notification_preferences/{uid}):
//   { version: 2, pushEnabled: bool, push: { [categoryId]: bool }, inApp: { [categoryId]: bool }, updatedAt }
// Legacy flat flag still honoured: { premium: bool } (written by the old preferences screen).

import { getCategory } from "./constants.js";

function asBool(value) {
  return typeof value === "boolean" ? value : undefined;
}

/**
 * @returns {{inApp: boolean, push: boolean}}
 *  - inApp: a copy is stored in the user's notification inbox
 *  - push:  a push alert may be sent (needs inApp, the master push switch, and the category switch)
 * Required categories (personal / account) ignore the per-category switches but still respect the
 * master push switch.
 */
export function resolveRecipientPrefs(prefsData, categoryId) {
  const category = getCategory(categoryId);
  if (!category) return { inApp: false, push: false };

  const prefs = prefsData && typeof prefsData === "object" ? prefsData : {};
  const masterPush = prefs.pushEnabled === true;

  if (category.required) return { inApp: true, push: masterPush };

  let inApp = asBool(prefs.inApp?.[category.id]);
  let push = asBool(prefs.push?.[category.id]);

  if (category.id === "premium") {
    const legacy = asBool(prefs.premium);
    if (legacy !== undefined) {
      if (inApp === undefined) inApp = legacy;
      if (push === undefined) push = legacy;
    }
  }

  inApp = inApp ?? category.defaultInApp;
  push = push ?? category.defaultPush;

  return { inApp, push: Boolean(masterPush && inApp && push) };
}
