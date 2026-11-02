import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';
import { Camera, MessageCircle } from 'lucide-react';
import Avatar from '@/components/chat/Avatar';

export default function ProfileSetup({ user, onComplete }) {
  const [displayName, setDisplayName] = useState(user?.full_name || '');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setAvatarUrl(file_url);
    setUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    setSaving(true);
    const phoneNumber = localStorage.getItem('pending_phone_number') || '';
    await base44.entities.Profile.create({
      user_id: user.id,
      display_name: displayName.trim(),
      bio: bio.trim(),
      avatar_url: avatarUrl,
      phone_number: phoneNumber,
      status_message: 'Hey there ! I am using J-Connect.',
      is_online: true,
      last_seen: new Date().toISOString()
    });
    localStorage.removeItem('pending_phone_number');
    setSaving(false);
    onComplete();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: 'hsl(var(--wa-header))' }}>
            <MessageCircle size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-heading font-bold text-[#111b21]">Set up your profile</h1>
          <p className="text-[#667781] mt-2">Let your friends know who you are</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border p-6 space-y-6">
          <div className="flex justify-center">
            <label className="relative cursor-pointer group">
              <Avatar src={avatarUrl} name={displayName} size="xl" />
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={24} className="text-white" />
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              {uploading && (
                <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </label>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Display Name</label>
            <Input
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="rounded-xl"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Bio</label>
            <Textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Tell everyone about yourself..."
              className="rounded-xl resize-none"
              rows={3}
            />
          </div>

          <Button type="submit" className="w-full rounded-xl h-11" disabled={saving || !displayName.trim()}>
            {saving ? 'Setting up...' : 'Get Started'}
          </Button>
        </form>
      </div>
    </div>
  );
}