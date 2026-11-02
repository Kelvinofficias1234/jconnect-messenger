import React, { useState } from 'react';
import { X, Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from '@/components/ui/use-toast';

const CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'tech', label: 'Technology' },
  { value: 'education', label: 'Education' },
  { value: 'business', label: 'Business' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'sports', label: 'Sports' },
  { value: 'other', label: 'Other' },
];

export default function CreateCommunityModal({ currentUserId, onCreated, onClose }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [isPublic, setIsPublic] = useState(true);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const community = await base44.entities.Community.create({
        name: name.trim(),
        description: description.trim(),
        owner_id: currentUserId,
        admin_ids: [],
        member_ids: [currentUserId],
        is_public: isPublic,
        category
      });
      // Create a default "General" sub-group
      await base44.entities.Conversation.create({
        type: 'group',
        name: 'General',
        participant_ids: [currentUserId],
        admin_ids: [currentUserId],
        community_id: community.id,
        last_message_text: '',
        last_message_time: new Date().toISOString()
      });
      toast({ title: 'Community created!', description: `${name} is ready to go`, duration: 10000 });
      onCreated(community);
    } catch (e) {
      toast({ title: 'Could not create', description: e?.message || 'Try again.', variant: 'destructive' });
    }
    setCreating(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl p-5 space-y-4" style={{ backgroundColor: '#1e2140' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-purple-400" />
            <h3 className="font-semibold text-white">Create Community</h3>
          </div>
          <button onClick={onClose} className="p-1 text-white/40 hover:text-white"><X size={20} /></button>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-white/70">Community Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. K-Lab Innovators"
            className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none border border-white/10"
            style={{ backgroundColor: '#0f1025' }} />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-white/70">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
            placeholder="What is this community about?"
            className="w-full px-4 py-2.5 rounded-xl text-sm text-white placeholder:text-white/30 focus:outline-none border border-white/10 resize-none"
            style={{ backgroundColor: '#0f1025' }} />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-white/70">Category</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button key={cat.value} onClick={() => setCategory(cat.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${category === cat.value ? 'text-white' : 'text-white/50 border border-white/10'}`}
                style={category === cat.value ? { background: 'linear-gradient(135deg, #9b30ff, #6b21d6)' } : {}}>
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between py-1">
          <div>
            <p className="text-sm font-medium text-white/70">Public Community</p>
            <p className="text-xs text-white/30">Discoverable in Explore directory</p>
          </div>
          <button onClick={() => setIsPublic(!isPublic)}
            className={`w-11 h-6 rounded-full transition-colors relative ${isPublic ? 'bg-purple-600' : 'bg-white/10'}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${isPublic ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>

        <div className="flex gap-2 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm text-white/60 border border-white/10">Cancel</button>
          <button onClick={handleCreate} disabled={creating || !name.trim()}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg, #9b30ff, #6b21d6)' }}>
            {creating ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}