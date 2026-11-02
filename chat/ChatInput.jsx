import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, X, Smile, Mic, Check, Eye } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from '@/components/ui/use-toast';
import EmojiPicker from './EmojiPicker';
import VoiceRecorder from './VoiceRecorder';
import AttachMenu from './AttachMenu';
import PollCreator from './PollCreator';
import LocationPicker from './LocationPicker';
import EventCreator from './EventCreator';
import CameraCapture from './CameraCapture';
import { compressImage } from '@/lib/mediaCompression';

export default function ChatInput({ onSend, onTyping, replyTo, onCancelReply, editingMessage, onEdit, onCancelEdit, profilesMap, blocked }) {
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [showPoll, setShowPoll] = useState(false);
  const [showLocation, setShowLocation] = useState(false);
  const [showEvent, setShowEvent] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [viewOnce, setViewOnce] = useState(false);
  const fileRef = useRef(null);
  const textRef = useRef(null);

  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.text || '');
      setShowEmoji(false);
      setShowVoice(false);
      setTimeout(() => textRef.current?.focus(), 100);
    }
  }, [editingMessage]);

  useEffect(() => {
    if (replyTo) { setShowEmoji(false); setShowVoice(false); }
  }, [replyTo]);

  const handleFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    let processedFile = f;
    if (f.type.startsWith('image/')) {
      processedFile = await compressImage(f);
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target.result);
      reader.readAsDataURL(processedFile);
    } else {
      setPreview(null);
    }
    setFile(processedFile);
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSend = async () => {
    if (blocked) return;
    if (editingMessage) {
      if (!text.trim()) return;
      try { await onEdit?.(editingMessage.id, text.trim()); } catch {}
      setText('');
      return;
    }
    if (!text.trim() && !file) return;
    setUploading(true);
    try {
      let fileData = {};
      if (file) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        const isImage = file.type.startsWith('image/');
        const isVideo = file.type.startsWith('video/');
        const isAudio = file.type.startsWith('audio/');
        fileData = {
          file_url,
          file_name: file.name,
          file_type: isImage ? 'image' : isVideo ? 'video' : isAudio ? 'audio' : 'document'
        };
      }
      await onSend({ text: text.trim(), ...fileData, is_view_once: viewOnce });
      setText('');
      clearFile();
      setViewOnce(false);
    } catch (e) {
      toast({
        title: 'Send failed',
        description: 'Network error — please try again.',
        variant: 'destructive',
        duration: 10000
      });
    } finally {
      setUploading(false);
      textRef.current?.focus();
    }
  };

  const handleSendClick = () => {
    if (uploading) return;
    if (editingMessage) { handleSend(); return; }
    if (!text.trim() && !file) { setShowVoice(true); return; }
    handleSend();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleEmojiSelect = (emoji) => {
    setText(prev => prev + emoji);
    textRef.current?.focus();
  };

  const handleVoiceSent = (fileUrl) => {
    setShowVoice(false);
    onSend?.({ text: '', file_url: fileUrl, file_name: 'voice_message.webm', file_type: 'audio', is_view_once: viewOnce });
    setViewOnce(false);
  };

  const handlePollSend = (pollData) => {
    setShowPoll(false);
    onSend?.({ text: '', message_type: 'poll', poll_data: pollData });
  };

  const handleLocationSend = (loc) => {
    setShowLocation(false);
    const expiresAt = loc.isLive && loc.durationMinutes
      ? new Date(Date.now() + loc.durationMinutes * 60000).toISOString()
      : '';
    onSend?.({
      text: '',
      message_type: 'location',
      location_lat: loc.lat,
      location_lng: loc.lng,
      location_label: loc.label,
      is_live_location: !!loc.isLive,
      live_expires_at: expiresAt
    });
  };

  const handleEventSend = (eventData) => {
    setShowEvent(false);
    onSend?.({ text: '', message_type: 'event', event_data: eventData });
  };

  const handleCameraSend = (data) => {
    setShowCamera(false);
    onSend?.({ ...data, is_view_once: viewOnce });
    setViewOnce(false);
  };

  if (blocked) {
    return (
      <div className="shrink-0 px-4 py-3 border-t border-white/5 text-center" style={{ backgroundColor: '#13152a' }}>
        <p className="text-sm text-white/40">You blocked this contact. Unblock to send messages.</p>
      </div>
    );
  }

  if (showVoice) {
    return (
      <div className="px-3 py-2.5 shrink-0 border-t border-white/5" style={{ backgroundColor: '#13152a' }}>
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={() => setViewOnce(v => !v)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-colors ${viewOnce ? 'text-purple-300 bg-purple-500/10' : 'text-white/40'}`}
            title="View Once"
          >
            <div className={`flex items-center justify-center w-4 h-4 rounded-full border-2 ${viewOnce ? 'border-purple-300' : 'border-current'}`}>
              <span className="text-[8px] font-bold leading-none">1</span>
            </div>
            <span>View Once</span>
          </button>
        </div>
        <VoiceRecorder onSend={handleVoiceSent} onCancel={() => setShowVoice(false)} />
      </div>
    );
  }

  if (showPoll) {
    return <PollCreator onSend={handlePollSend} onCancel={() => setShowPoll(false)} />;
  }

  if (showLocation) {
    return <LocationPicker onSend={handleLocationSend} onCancel={() => setShowLocation(false)} />;
  }

  if (showEvent) {
    return <EventCreator onSend={handleEventSend} onCancel={() => setShowEvent(false)} />;
  }

  if (showCamera) {
    return <CameraCapture onSend={handleCameraSend} onCancel={() => setShowCamera(false)} />;
  }

  const isEditing = !!editingMessage;
  const replyProfile = replyTo ? profilesMap?.[replyTo.sender_id] : null;

  return (
    <div className="shrink-0 border-t border-white/5 relative z-[100]" style={{ backgroundColor: '#13152a' }}>
      {/* Reply / Edit preview */}
      {(replyTo || editingMessage) && (
        <div className="px-3 pt-2.5">
          <div className="flex items-start gap-2 px-3 py-2 rounded-xl border-l-2 border-purple-500"
            style={{ backgroundColor: 'rgba(124,58,237,0.08)' }}>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-purple-400">
                {editingMessage ? 'Editing message' : `Replying to ${replyProfile?.display_name || 'message'}`}
              </p>
              <p className="text-xs text-white/50 truncate">
                {editingMessage?.text || replyTo?.text || (replyTo?.file_url ? '📎 Attachment' : '')}
              </p>
            </div>
            <button onClick={() => { onCancelReply?.(); onCancelEdit?.(); }}
              className="text-white/40 hover:text-white shrink-0">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* File preview */}
      {(preview || (file && !preview)) && (
        <div className="flex items-center gap-2 px-3 py-2 mx-3 mt-2 mb-1 rounded-xl border border-white/10"
          style={{ backgroundColor: '#1e2140' }}>
          {preview
            ? <img src={preview} alt="" className="w-14 h-14 rounded-lg object-cover" />
            : <span className="text-sm truncate flex-1 text-white/80">{file.name}</span>
          }
          <button onClick={clearFile} className="text-white/50 hover:text-white shrink-0">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Emoji picker */}
      {showEmoji && (
        <div className="px-3 py-2">
          <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setShowEmoji(false)} />
        </div>
      )}

      {/* View Once banner */}
      {viewOnce && (
        <div className="px-3 pb-1">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-purple-500/30"
            style={{ backgroundColor: 'rgba(124,58,237,0.1)' }}>
            <Eye size={14} className="text-purple-400" />
            <span className="text-xs text-purple-300 font-medium">View Once — content disappears after it's opened</span>
            <button onClick={() => setViewOnce(false)} className="ml-auto text-purple-400 hover:text-purple-300">
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Input bar */}
      <div className="px-3 py-2.5 flex items-end gap-2">
        <div className="flex-1 min-w-0 flex items-end rounded-2xl px-3 gap-2 min-h-[42px] border border-white/10"
          style={{ backgroundColor: '#1e2140' }}>
          <button onClick={() => { setShowEmoji(s => !s); setShowVoice(false); }}
            className="py-2.5 text-purple-400 hover:text-purple-300 shrink-0">
            <Smile size={22} />
          </button>
          <button
            onClick={() => setViewOnce(v => !v)}
            className={`py-2.5 shrink-0 transition-colors ${viewOnce ? 'text-purple-300' : 'text-white/40 hover:text-purple-400'}`}
            title="View Once"
          >
            <div className={`flex items-center justify-center w-5 h-5 rounded-full border-2 ${viewOnce ? 'border-purple-300' : 'border-current'}`}>
              <span className="text-[10px] font-bold leading-none">1</span>
            </div>
          </button>
          <textarea
            ref={textRef}
            value={text}
            onChange={e => { setText(e.target.value); onTyping?.(); }}
            onKeyDown={handleKeyDown}
            placeholder={file && preview ? 'Add a caption…' : 'Type a message'}
            rows={1}
            disabled={uploading}
            className="flex-1 resize-none bg-transparent text-sm text-white placeholder:text-white/35 focus:outline-none py-2.5 max-h-32"
            style={{ minHeight: '24px' }}
          />
          <div className="relative">
            <button onClick={() => { setShowAttach(s => !s); setShowEmoji(false); setShowVoice(false); }}
              className="py-2.5 text-purple-400 hover:text-purple-300 shrink-0">
              <Paperclip size={22} />
            </button>
            {showAttach && (
              <AttachMenu
                fileRef={fileRef}
                onSelect={(key) => {
                  if (key === 'document') fileRef.current?.click();
                  else if (key === 'poll') setShowPoll(true);
                  else if (key === 'location') setShowLocation(true);
                  else if (key === 'event') setShowEvent(true);
                  else if (key === 'camera') setShowCamera(true);
                }}
                onClose={() => setShowAttach(false)}
              />
            )}
          </div>
          <input ref={fileRef} type="file" className="hidden" onChange={handleFile}
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip" />
        </div>
        <button onClick={handleSendClick} disabled={uploading}
          className="shrink-0 w-11 h-11 flex items-center justify-center rounded-full transition-all shadow-lg hover:scale-105 active:scale-95"
          style={{ background: isEditing ? 'linear-gradient(135deg, #059669, #047857)' : 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
          {uploading
            ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : isEditing
              ? <Check size={18} className="text-white" />
              : (text.trim() || file)
                ? <Send size={18} className="text-white" />
                : <Mic size={18} className="text-white" />}
        </button>
      </div>
    </div>
  );
}