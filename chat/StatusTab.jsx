import React, { useState, useEffect } from 'react';
import { Plus, X, Trash2, Eye } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import Avatar from './Avatar';
import StoryViewer from './StoryViewer';
import { formatStoryTime } from '@/lib/timeFormat';

export default function StatusTab({ currentUserId, currentProfile, allProfiles, searchQuery }) {
  const [stories, setStories] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [viewingUser, setViewingUser] = useState(null);
  // Live-ticking clock so relative times ("POSTED NOW" → "1 min ago") update
  // in real time without manual refresh. 15s interval is invisible to users.
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 15000);
    return () => clearInterval(interval);
  }, []);

  const profileMap = {};
  allProfiles.forEach(p => { profileMap[p.user_id] = p; });

  const loadStories = async () => {
    const all = await base44.entities.Story.list('-created_date', 200);
    // Auto-delete stories past their 24h expiry
    const now = Date.now();
    const valid = [];
    for (const s of all) {
      const expires = s.expires_at ? new Date(s.expires_at).getTime() : new Date(s.created_date).getTime() + 24 * 60 * 60 * 1000;
      if (expires < now) {
        try { await base44.entities.Story.delete(s.id); } catch {}
      } else {
        valid.push(s);
      }
    }
    setStories(valid);
  };

  useEffect(() => { loadStories(); }, []);

  const grouped = {};
  stories.forEach(s => {
    if (!grouped[s.user_id]) grouped[s.user_id] = [];
    grouped[s.user_id].push(s);
  });

  const myStories = grouped[currentUserId] || [];
  const others = Object.keys(grouped)
    .filter(id => id !== currentUserId)
    .filter(userId => {
      if (!searchQuery) return true;
      const prof = profileMap[userId];
      if (!prof) return false;
      const q = searchQuery.toLowerCase();
      return (
        prof.display_name?.toLowerCase().includes(q) ||
        prof.username?.toLowerCase().includes(q)
      );
    });

  const handleViewed = async (storyId) => {
    const story = stories.find(s => s.id === storyId);
    if (!story || story.user_id === currentUserId) return; // Don't count self as viewer
    if (story.viewed_by?.includes(currentUserId)) return; // Already counted
    // Use updateMany with $addToSet for atomic unique viewer addition —
    // avoids race conditions where concurrent viewers overwrite each other's updates
    try {
      await base44.entities.Story.updateMany({ id: storyId }, { $addToSet: { viewed_by: currentUserId } });
    } catch {}
  };

  // Real-time subscription: live-update story data (especially viewed_by) so
  // the creator's view counter ticks up instantly without manual refresh.
  useEffect(() => {
    const unsub = base44.entities.Story.subscribe((event) => {
      if (event.type === 'update') {
        setStories(prev => prev.map(s => s.id === event.data.id ? event.data : s));
      } else if (event.type === 'create') {
        setStories(prev => prev.find(s => s.id === event.data.id) ? prev : [event.data, ...prev]);
      } else if (event.type === 'delete') {
        setStories(prev => prev.filter(s => s.id !== event.data.id));
      }
    });
    return () => unsub();
  }, []);

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide" style={{ backgroundColor: '#0f1025' }}>
      {/* MY STATUS */}
      <div className="px-4 pt-4 pb-2">
        <p className="text-xs font-bold text-white/35 uppercase tracking-widest mb-3">My Status</p>
        <div
          onClick={() => myStories.length > 0 ? setViewingUser(currentUserId) : setShowCreate(true)}
          className="flex items-center gap-3 p-3 rounded-2xl cursor-pointer hover:bg-white/5 transition-colors active:scale-98">
          <div className="relative">
            <div className={`p-0.5 rounded-full ${myStories.length > 0 ? 'bg-gradient-to-br from-purple-500 to-indigo-600' : 'bg-white/10'}`}>
              <div className="p-0.5 rounded-full" style={{ backgroundColor: '#0f1025' }}>
                <Avatar src={currentProfile?.avatar_url} name={currentProfile?.display_name} size="md" />
              </div>
            </div>
            {myStories.length === 0 && (
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center border-2"
                style={{ backgroundColor: '#7c3aed', borderColor: '#0f1025' }}>
                <Plus size={12} className="text-white" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">My Status</p>
            <p className="text-xs text-white/35">
              {myStories.length > 0
                ? `${myStories.length} update${myStories.length > 1 ? 's' : ''} · ${formatStoryTime(myStories[0].posted_at || myStories[0].created_date)}`
                : 'Tap to add status update'}
            </p>
          </div>
          <button
            onClick={e => { e.stopPropagation(); setShowCreate(true); }}
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors hover:bg-white/10"
            style={{ backgroundColor: 'rgba(124,58,237,0.15)' }}>
            <Plus size={18} className="text-purple-400" />
          </button>
        </div>
      </div>

      {/* RECENT UPDATES */}
      <div className="px-4 pt-2 pb-4">
        <p className="text-xs font-bold text-white/35 uppercase tracking-widest mb-3">Recent Updates</p>

        {others.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ background: 'rgba(124,58,237,0.12)', border: '2px solid rgba(124,58,237,0.3)' }}>
              <div className="w-10 h-10 rounded-full border-2 border-dashed border-purple-500/40" />
            </div>
            <p className="text-white/50 font-semibold text-sm">No status updates</p>
            <p className="text-white/25 text-xs mt-1 max-w-[200px]">Status updates from your contacts will appear here</p>
          </div>
        ) : (
          <div className="space-y-1">
            {others.map(userId => {
              const userStories = grouped[userId];
              const prof = profileMap[userId];
              const allViewed = userStories.every(s => s.viewed_by?.includes(currentUserId));
              return (
                <div
                  key={userId}
                  onClick={() => setViewingUser(userId)}
                  className="flex items-center gap-3 p-3 rounded-2xl cursor-pointer hover:bg-white/5 transition-colors active:scale-98">
                  <div className={`p-0.5 rounded-full ${allViewed ? 'bg-white/20' : 'bg-gradient-to-br from-purple-500 to-indigo-600'}`}>
                    <div className="p-0.5 rounded-full" style={{ backgroundColor: '#0f1025' }}>
                      <Avatar src={prof?.avatar_url} name={prof?.display_name} size="md" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{prof?.display_name || 'Unknown'}</p>
                    <p className="text-xs text-white/35">{formatStoryTime(userStories[0].posted_at || userStories[0].created_date)}</p>
                  </div>
                  <div className="flex items-center gap-1 text-white/25 text-xs">
                    <Eye size={12} />
                    <span>{userStories.length}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Status Modal */}
      {showCreate && (
        <CreateStatusModal
          currentUserId={currentUserId}
          currentProfile={currentProfile}
          onClose={() => setShowCreate(false)}
          onCreated={() => { loadStories(); setShowCreate(false); }}
        />
      )}

      {/* Story Viewer */}
      {viewingUser && grouped[viewingUser] && (
        <StoryViewer
          stories={grouped[viewingUser]}
          profile={profileMap[viewingUser] || currentProfile}
          currentUserId={currentUserId}
          profilesMap={profileMap}
          onClose={() => { setViewingUser(null); loadStories(); }}
          onViewed={handleViewed}
          canDelete={viewingUser === currentUserId}
          onDelete={async (storyId) => {
            await base44.entities.Story.delete(storyId);
            loadStories();
            if ((grouped[viewingUser] || []).length <= 1) setViewingUser(null);
          }}
        />
      )}
    </div>
  );
}

function CreateStatusModal({ currentUserId, currentProfile, onClose, onCreated }) {
  const [mode, setMode] = useState('text');
  const [text, setText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [bgColor, setBgColor] = useState('#7c3aed');
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);

  const TEXT_BGS = ['#7c3aed', '#1e40af', '#059669', '#dc2626', '#ea580c', '#db2777', '#0d0b1e', '#475569'];

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setImageUrl(file_url);
    setUploading(false);
  };

  const handlePost = async () => {
    if (mode === 'photo' && !imageUrl) return;
    if (mode === 'text' && !text.trim()) return;
    setPosting(true);
    await base44.entities.Story.create({
      user_id: currentUserId,
      type: mode === 'photo' ? 'image' : 'text',
      content: mode === 'photo' ? imageUrl : text.trim(),
      background_color: bgColor,
      viewed_by: [],
      posted_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });
    setPosting(false);
    onCreated();
  };

  const canPost = mode === 'photo' ? !!imageUrl : !!text.trim();

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: '#0d0b1e' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10" style={{ backgroundColor: '#13152a' }}>
        <button onClick={onClose}
          className="p-2.5 -ml-2 rounded-full text-white/80 hover:text-white hover:bg-white/10 active:scale-95 transition-all shrink-0">
          <X size={26} />
        </button>
        <h2 className="font-bold text-white text-lg flex-1 text-center">New Status</h2>
        <button onClick={handlePost} disabled={posting || !canPost}
          className="flex items-center gap-1.5 px-5 py-2 rounded-full font-semibold text-sm text-white active:scale-95 transition-all shrink-0 disabled:opacity-40"
          style={{ background: posting || !canPost ? 'rgba(124,58,237,0.3)' : 'linear-gradient(135deg,#9b30ff,#6b21d6)' }}>
          {posting
            ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            : <>Post</>}
        </button>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 p-3 border-b border-white/5">
        <button onClick={() => setMode('text')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${mode === 'text' ? 'text-white' : 'text-white/40'}`}
          style={mode === 'text' ? { background: 'linear-gradient(135deg,#9b30ff,#6b21d6)' } : { backgroundColor: 'rgba(255,255,255,0.05)' }}>
          Text
        </button>
        <button onClick={() => setMode('photo')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${mode === 'photo' ? 'text-white' : 'text-white/40'}`}
          style={mode === 'photo' ? { background: 'linear-gradient(135deg,#9b30ff,#6b21d6)' } : { backgroundColor: 'rgba(255,255,255,0.05)' }}>
          Photo
        </button>
      </div>

      {/* Content */}
      {mode === 'text' ? (
        <div className="flex-1 flex flex-col">
          <div className="flex-1 flex items-center justify-center p-6" style={{ backgroundColor: bgColor }}>
            <textarea autoFocus value={text} onChange={e => setText(e.target.value)}
              placeholder="Type a status..."
              className="w-full max-w-md bg-transparent text-white text-2xl font-semibold text-center placeholder:text-white/40 focus:outline-none resize-none"
              style={{ minHeight: '120px', caretColor: 'white' }} />
          </div>
          <div className="flex gap-2.5 p-4 justify-center border-t border-white/5 overflow-x-auto scrollbar-hide">
            {TEXT_BGS.map(c => (
              <button key={c} onClick={() => setBgColor(c)}
                className="w-9 h-9 rounded-full border-2 shrink-0 transition-transform"
                style={{ backgroundColor: c, borderColor: bgColor === c ? '#fff' : 'transparent', transform: bgColor === c ? 'scale(1.2)' : 'scale(1)' }} />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 gap-4">
          <label className="relative w-full aspect-video rounded-2xl overflow-hidden cursor-pointer group"
            style={{ backgroundColor: '#1a1040', border: imageUrl ? 'none' : '2px dashed rgba(124,58,237,0.4)' }}>
            {imageUrl ? (
              <>
                <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <p className="text-white text-sm font-medium">Tap to change</p>
                </div>
                <button onClick={e => { e.preventDefault(); setImageUrl(''); }}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/50 rounded-full flex items-center justify-center">
                  <X size={14} className="text-white" />
                </button>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                {uploading ? (
                  <div className="w-8 h-8 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: 'rgba(124,58,237,0.15)' }}>
                      <Plus size={26} className="text-purple-400" />
                    </div>
                    <p className="text-white/40 text-sm">Tap to add photo</p>
                  </>
                )}
              </div>
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </label>
          <p className="text-white/30 text-xs text-center">Your photo will be visible for 24 hours</p>
        </div>
      )}
    </div>
  );
}