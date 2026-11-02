// End-to-End Encryption for J-Connect using the Web Crypto API.
// Key agreement: ECDH on curve P-256.  Message encryption: AES-256-GCM.
// Private keys NEVER leave the device — stored in IndexedDB.
// Encrypted payloads are prefixed "enc:v1:" so legacy plaintext still renders.

const DB_NAME = 'jconnect_e2ee';
const DB_VERSION = 1;
const STORE_KEYPAIR = 'keypair';
const STORE_CONVKEYS = 'conv_keys';
const PREFIX = 'enc:v1:';

// ─── IndexedDB helpers ──────────────────────────────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_KEYPAIR)) db.createObjectStore(STORE_KEYPAIR);
      if (!db.objectStoreNames.contains(STORE_CONVKEYS)) db.createObjectStore(STORE_CONVKEYS);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(store, key) {
  try {
    const db = await openDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(store, 'readonly');
      const req = tx.objectStore(store).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });
  } catch { return null; }
}

async function idbSet(store, key, value) {
  try {
    const db = await openDB();
    await new Promise((resolve) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {}
}

// ─── Base64 helpers ─────────────────────────────────────────────────────
function bufToB64(buf) {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function b64ToBuf(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

// ─── Key pair management ────────────────────────────────────────────────
export async function getOrCreateKeyPair() {
  const existing = await idbGet(STORE_KEYPAIR, 'me');
  if (existing?.privateJwk) {
    const privateKey = await crypto.subtle.importKey(
      'jwk', existing.privateJwk,
      { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveKey', 'deriveBits']
    );
    return { privateKey, publicKeyB64: existing.publicKeyB64 };
  }
  const kp = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey', 'deriveBits']
  );
  const pubRaw = await crypto.subtle.exportKey('raw', kp.publicKey);
  const publicKeyB64 = bufToB64(pubRaw);
  const privateJwk = await crypto.subtle.exportKey('jwk', kp.privateKey);
  await idbSet(STORE_KEYPAIR, 'me', { privateJwk, publicKeyB64 });
  return { privateKey: kp.privateKey, publicKeyB64 };
}

export async function importPublicKey(b64) {
  return crypto.subtle.importKey(
    'raw', b64ToBuf(b64),
    { name: 'ECDH', namedCurve: 'P-256' }, false, []
  );
}

// ─── Shared key derivation (ECDH → AES-256-GCM) ─────────────────────────
async function deriveSharedKey(privateKey, otherPublicB64) {
  const otherPub = await importPublicKey(otherPublicB64);
  return crypto.subtle.deriveKey(
    { name: 'ECDH', public: otherPub },
    privateKey,
    { name: 'AES-GCM', length: 256 },
    true, ['encrypt', 'decrypt']
  );
}

// ─── Conversation key retrieval (cached in IndexedDB) ───────────────────
export async function getConversationKey(conversation, myUserId, profilesMap) {
  if (!conversation || !myUserId) return null;

  // Check cache first
  const cached = await idbGet(STORE_CONVKEYS, conversation.id);
  if (cached) {
    try {
      return await crypto.subtle.importKey('raw', cached,
        { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    } catch {}
  }

  if (conversation.type === 'direct') {
    const otherId = conversation.participant_ids?.find(id => id !== myUserId);
    if (!otherId) return null;
    const otherProf = profilesMap?.[otherId];
    if (!otherProf?.public_key) return null;
    try {
      const myKP = await getOrCreateKeyPair();
      const key = await deriveSharedKey(myKP.privateKey, otherProf.public_key);
      const raw = await crypto.subtle.exportKey('raw', key);
      await idbSet(STORE_CONVKEYS, conversation.id, new Uint8Array(raw));
      return key;
    } catch { return null; }
  }

  // Group / channel — decrypt the group key distributed by the creator
  if (conversation.encrypted_group_keys) {
    try {
      const keysMap = JSON.parse(conversation.encrypted_group_keys);
      const myEnc = keysMap[myUserId];
      if (!myEnc) return null;
      const creatorId = conversation.admin_ids?.[0];
      const creatorProf = profilesMap?.[creatorId];
      if (!creatorProf?.public_key) return null;
      const myKP = await getOrCreateKeyPair();
      const pairwiseKey = await deriveSharedKey(myKP.privateKey, creatorProf.public_key);
      const [ivB64, ctB64] = myEnc.split(':');
      const groupKeyRaw = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: b64ToBuf(ivB64) }, pairwiseKey, b64ToBuf(ctB64)
      );
      const groupKey = await crypto.subtle.importKey('raw', groupKeyRaw,
        { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
      await idbSet(STORE_CONVKEYS, conversation.id, new Uint8Array(groupKeyRaw));
      return groupKey;
    } catch { return null; }
  }
  return null;
}

// ─── Encrypt / Decrypt text ─────────────────────────────────────────────
export function isEncrypted(text) {
  return typeof text === 'string' && text.startsWith(PREFIX);
}

export async function encryptText(plaintext, key) {
  if (!key || !plaintext) return plaintext;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder().encode(plaintext);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc);
  return PREFIX + bufToB64(iv.buffer) + ':' + bufToB64(ct);
}

export async function decryptText(payload, key) {
  if (!key || !isEncrypted(payload)) return payload;
  try {
    const rest = payload.slice(PREFIX.length);
    const sep = rest.indexOf(':');
    const iv = b64ToBuf(rest.slice(0, sep));
    const ct = b64ToBuf(rest.slice(sep + 1));
    const dec = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
    return new TextDecoder().decode(dec);
  } catch {
    return '🔒 Encrypted message';
  }
}

// ─── Group key generation + per-member distribution ─────────────────────
export async function generateGroupKey() {
  const raw = crypto.getRandomValues(new Uint8Array(32));
  const key = await crypto.subtle.importKey('raw', raw,
    { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  return { key, raw: new Uint8Array(raw) };
}

export async function encryptGroupKeyForMembers(groupKeyRaw, memberIds, myKP, profilesMap, myUserId) {
  const map = {};
  for (const userId of memberIds) {
    if (userId === myUserId) continue;
    const prof = profilesMap?.[userId];
    if (!prof?.public_key) continue;
    try {
      const pairwiseKey = await deriveSharedKey(myKP.privateKey, prof.public_key);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, pairwiseKey, groupKeyRaw);
      map[userId] = bufToB64(iv.buffer) + ':' + bufToB64(ct);
    } catch {}
  }
  return map;
}

export async function storeConversationKey(conversationId, keyBytes) {
  await idbSet(STORE_CONVKEYS, conversationId, keyBytes);
}