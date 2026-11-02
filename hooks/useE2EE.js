import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { getOrCreateKeyPair } from '@/lib/e2ee';

// Initializes the user's ECDH keypair and publishes the public key to their
// Profile entity so other users can encrypt messages to them.
export default function useE2EE(userId, profile) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        const kp = await getOrCreateKeyPair();
        // Publish public key to Profile if missing or changed
        if (profile?.id && profile.public_key !== kp.publicKeyB64) {
          try {
            await base44.entities.Profile.update(profile.id, { public_key: kp.publicKeyB64 });
          } catch {}
        }
      } catch {}
      if (!cancelled) setReady(true);
    })();
    return () => { cancelled = true; };
  }, [userId, profile?.id]);

  return { ready };
}