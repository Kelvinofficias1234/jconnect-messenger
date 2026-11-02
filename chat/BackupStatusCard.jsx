import React from 'react';
import { Shield, ShieldCheck, Clock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/use-toast';

export default function BackupStatusCard({ profile, onUpdate }) {
  const enabled = profile?.backup_enabled;
  const lastBackup = profile?.last_backup_date;

  const toggle = async (newVal) => {
    try {
      await base44.entities.Profile.update(profile.id, {
        backup_enabled: newVal,
        backup_consent_date: new Date().toISOString()
      });
      toast({ title: newVal ? 'Auto Backup enabled' : 'Backup disabled', duration: 10000 });
      onUpdate();
    } catch (e) {
      toast({ title: 'Update failed', variant: 'destructive' });
    }
  };

  const formatDate = (d) => {
    if (!d) return 'Never';
    try { return new Date(d).toLocaleString(); } catch { return 'Never'; }
  };

  return (
    <div className="rounded-2xl border p-4 space-y-3"
      style={{
        backgroundColor: enabled ? 'rgba(124,58,237,0.08)' : 'rgba(255,255,255,0.02)',
        borderColor: enabled ? 'rgba(155,48,255,0.3)' : 'rgba(255,255,255,0.08)'
      }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ background: enabled ? 'linear-gradient(135deg, #9b30ff, #6b21d6)' : 'rgba(255,255,255,0.06)' }}>
            {enabled ? <ShieldCheck size={18} className="text-white" /> : <Shield size={18} className="text-white/50" />}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Auto Backup</p>
            <p className="text-xs text-white/40">{enabled ? 'Active · Automatic' : 'Not enabled'}</p>
          </div>
        </div>
        <Switch checked={!!enabled} onCheckedChange={toggle} />
      </div>
      {enabled ? (
        <div className="flex items-center gap-2 pt-2 border-t border-white/8">
          <Clock size={13} className="text-purple-400/60" />
          <p className="text-xs text-white/45">Last backup: {formatDate(lastBackup)}</p>
        </div>
      ) : (
        <p className="text-xs text-white/35 leading-relaxed">
          Enable to automatically back up your chats, media, events &amp; contacts to J-Connect's secure cloud.
        </p>
      )}
    </div>
  );
}