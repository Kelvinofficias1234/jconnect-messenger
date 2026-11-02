import React, { useState, useRef, useEffect } from 'react';
import { Trash2, Send } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function VoiceRecorder({ onSend, onCancel }) {
  const [seconds, setSeconds] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const mimeTypeRef = useRef('audio/webm');

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      streamRef.current = stream;

      // Boost input volume with Web Audio API GainNode — makes voice LOUD,
      // not a whisper. 3x gain compensates for conservative autoGainControl.
      const audioContext = new AudioContext();
      const sourceNode = audioContext.createMediaStreamSource(stream);
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 3.0;
      const destination = audioContext.createMediaStreamDestination();
      sourceNode.connect(gainNode);
      gainNode.connect(destination);
      audioContextRef.current = audioContext;

      // Detect best supported MIME type — webm/opus on Chrome, mp4 on Safari
      const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4;codecs=mp4a.40.2', 'audio/mp4', 'audio/ogg;codecs=opus'];
      const mimeType = candidates.find(t => MediaRecorder.isTypeSupported(t)) || '';
      mimeTypeRef.current = mimeType || 'audio/webm';

      const mr = new MediaRecorder(destination.stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.start(100); // timeslice ensures data flushes periodically — prevents broken/empty blobs
      mediaRecorderRef.current = mr;
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } catch (e) {
      setError('Microphone access denied');
      setTimeout(() => onCancel(), 1500);
    }
  };

  useEffect(() => {
    startRecording();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const cleanup = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    if (audioContextRef.current) { try { audioContextRef.current.close(); } catch {} audioContextRef.current = null; }
  };

  const handleCancel = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    cleanup();
    onCancel();
  };

  const handleSend = () => {
    const mr = mediaRecorderRef.current;
    if (!mr || mr.state === 'inactive') return;
    mr.onstop = async () => {
      cleanup();
      const mimeType = mimeTypeRef.current;
      const ext = mimeType.includes('mp4') ? 'm4a' : mimeType.includes('ogg') ? 'ogg' : 'webm';
      const audioBlob = new Blob(chunksRef.current, { type: mimeType });
      if (audioBlob.size === 0) { onCancel(); return; }
      setUploading(true);
      try {
        const file = new File([audioBlob], `voice_${Date.now()}.${ext}`, { type: mimeType });
        const { file_url } = await base44.integrations.Core.UploadPublicFile({ file });
        onSend(file_url);
      } catch (e) {
        setError('Upload failed');
        setTimeout(() => onCancel(), 1500);
      }
      setUploading(false);
    };
    mr.stop();
  };

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  if (error) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-2xl border border-red-500/20" style={{ backgroundColor: '#1e2140' }}>
        <span className="text-sm text-red-400">{error}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-white/10" style={{ backgroundColor: '#1e2140' }}>
      {uploading ? (
        <>
          <div className="w-5 h-5 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
          <span className="text-sm text-white/60">Sending voice message…</span>
        </>
      ) : (
        <>
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse shrink-0" />
          <span className="text-sm text-white/80 flex-1 font-mono">{fmt(seconds)}</span>
          <button onClick={handleCancel} title="Discard"
            className="w-9 h-9 rounded-full flex items-center justify-center bg-white/10 hover:bg-red-500/20 transition-colors shrink-0">
            <Trash2 size={18} className="text-red-400" />
          </button>
          <button onClick={handleSend} title="Send"
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
            <Send size={18} className="text-white" />
          </button>
        </>
      )}
    </div>
  );
}