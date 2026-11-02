import { base44 } from '@/api/base44Client';

/**
 * Creates a mutual contact relationship between two users.
 * Inserts User B into User A's contact list AND User A into User B's contact list.
 * Skips silently if the contact already exists.
 *
 * @param {string} userAId - First user's ID
 * @param {object} userAProfile - First user's profile (for display name/username)
 * @param {string} userBId - Second user's ID
 * @param {object} userBProfile - Second user's profile
 * @param {string} source - 'referral' | 'search' | 'manual'
 * @returns {Promise<boolean>} true if a new contact was created, false if it already existed
 */
export async function createMutualContacts(userAId, userAProfile, userBId, userBProfile, source = 'search') {
  if (!userAId || !userBId || userAId === userBId) return false;
  try {
    // Check if contact already exists (avoid duplicates)
    const existing = await base44.entities.Contact.filter({
      user_id: userAId,
      contact_user_id: userBId
    });
    if (existing.length > 0) return false;

    // Create both contact records (mutual)
    await base44.entities.Contact.create({
      user_id: userAId,
      contact_user_id: userBId,
      contact_username: userBProfile?.username || '',
      contact_display_name: userBProfile?.display_name || '',
      source
    });
    await base44.entities.Contact.create({
      user_id: userBId,
      contact_user_id: userAId,
      contact_username: userAProfile?.username || '',
      contact_display_name: userAProfile?.display_name || '',
      source
    });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Processes a pending deep-link referral stored in localStorage.
 * If a referral username exists, looks up the referrer and creates a mutual
 * contact relationship between the new user and the referrer.
 *
 * @param {string} currentUserId - The newly registered user's ID
 * @param {object} currentProfile - The new user's profile
 */
export async function processPendingReferral(currentUserId, currentProfile) {
  const referralUsername = localStorage.getItem('referral_username');
  if (!referralUsername) return;

  try {
    // Look up the referrer by username
    const results = await base44.entities.Profile.filter({ username: referralUsername });
    const referrer = results.find(p => p.user_id !== currentUserId);
    if (!referrer) {
      localStorage.removeItem('referral_username');
      return;
    }

    // Create mutual contact: new user ↔ referrer
    await createMutualContacts(
      currentUserId, currentProfile,
      referrer.user_id, referrer,
      'referral'
    );
    localStorage.removeItem('referral_username');
  } catch (e) {
    localStorage.removeItem('referral_username');
  }
}

/**
 * Loads all contacts for the current user from the Contact entity,
 * then fetches their full profiles for rendering (avatar, online status, etc.).
 *
 * @param {string} currentUserId - The current user's ID
 * @returns {Promise<Array>} Array of contact profile objects, sorted by display name
 */
export async function loadMyContacts(currentUserId) {
  try {
    const contacts = await base44.entities.Contact.filter({ user_id: currentUserId });
    if (contacts.length === 0) return [];
    const userIds = contacts.map(c => c.contact_user_id);
    const profiles = await base44.entities.Profile.filter({ user_id: { $in: userIds } });
    return profiles.sort((a, b) => (a.display_name || '').localeCompare(b.display_name || ''));
  } catch (e) {
    return [];
  }
}