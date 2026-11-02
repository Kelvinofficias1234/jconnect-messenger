import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

export default function useCurrentProfile() {
  const [profile, setProfile] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    const me = await base44.auth.me();
    setUser(me);
    const profiles = await base44.entities.Profile.filter({ user_id: me.id });
    if (profiles.length > 0) {
      setProfile(profiles[0]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const updatePresence = useCallback(async (isOnline) => {
    if (!profile) return;
    try {
      await base44.entities.Profile.update(profile.id, {
        is_online: isOnline,
        last_seen: new Date().toISOString()
      });
    } catch (e) {
      // Best-effort presence beacon — ignore transient/unload network errors
    }
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    updatePresence(true);
    const interval = setInterval(() => updatePresence(true), 30000);
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') updatePresence(false);
      else if (document.visibilityState === 'visible') updatePresence(true);
    };
    const handleBeforeUnload = () => updatePresence(false);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pagehide', handleBeforeUnload);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pagehide', handleBeforeUnload);
      updatePresence(false);
    };
  }, [profile, updatePresence]);

  return { profile, user, loading, reload: loadProfile };
}