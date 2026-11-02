import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { base44 } from '@/api/base44Client';

/**
 * Checks if the Contact Picker API is available (Android Chrome 80+).
 * iOS Safari and desktop browsers do not support this API.
 */
export function isContactsPickerSupported() {
  return typeof navigator !== 'undefined' &&
    'contacts' in navigator &&
    typeof navigator.contacts?.select === 'function';
}

/**
 * Normalizes a raw phone number to E.164 format (e.g. +250788123456).
 * Returns null if the number cannot be parsed or is invalid.
 */
export function normalizeToE164(rawNumber, defaultCountry = 'RW') {
  if (!rawNumber) return null;
  const cleaned = String(rawNumber).replace(/[^\d+]/g, '');
  if (!cleaned) return null;
  try {
    const parsed = parsePhoneNumberFromString(cleaned, defaultCountry);
    if (parsed && parsed.isValid()) return parsed.format('E.164');
  } catch {}
  return null;
}

/**
 * Reads the device's local address book via the Contact Picker API.
 * Returns a de-duplicated array of E.164-formatted phone numbers.
 * Returns null if the API is unavailable or the user denies permission.
 *
 * NOTE: This must be called from a user-initiated click handler — the
 * Contact Picker API requires a user gesture.
 */
export async function readLocalContacts(defaultCountry = 'RW') {
  if (!isContactsPickerSupported()) return null;
  try {
    const contacts = await navigator.contacts.select(['name', 'tel'], { multiple: true });
    const numbers = [];
    for (const c of contacts || []) {
      const tels = Array.isArray(c.tel) ? c.tel : (c.tel ? [c.tel] : []);
      for (const raw of tels) {
        const e164 = normalizeToE164(raw, defaultCountry);
        if (e164) numbers.push(e164);
      }
    }
    return [...new Set(numbers)];
  } catch (e) {
    return null;
  }
}

/**
 * Strict intersection query: returns only J-Connect profiles whose
 * phone_number is in the uploaded address book array. The query runs
 * server-side — the client never receives non-matching profiles.
 */
export async function discoverContactsByPhones(phoneNumbers, currentUserId) {
  if (!phoneNumbers || phoneNumbers.length === 0) return [];
  const matches = await base44.entities.Profile.filter({
    phone_number: { $in: phoneNumbers }
  });
  return matches.filter(p => p.user_id !== currentUserId);
}

/**
 * Fetches profiles for a specific set of user IDs only (e.g. conversation
 * participants). Used to replace the global Profile.list() directory fetch.
 */
export async function getProfilesByUserIds(userIds) {
  if (!userIds || userIds.length === 0) return [];
  return await base44.entities.Profile.filter({
    user_id: { $in: userIds }
  });
}