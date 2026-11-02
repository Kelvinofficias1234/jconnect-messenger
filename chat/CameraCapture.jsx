import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, SwitchCamera, Video, Camera, Send, RotateCcw } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { compressImage } from '@/lib/mediaCompression';

const pickVideoMime = () => {
  const types = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'];
  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t)) return t;
  }
  return '';
};

export default function CameraCapture({ onSend, onCancel }) {
  const [mode, setMode] = useState('photo');
  const [captured, setCaptured] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [sending, setSending] = useState(false);
  const [facing, setFacing] = useState('environment');
  const [caption, setCaption] = useState('');
  const [error, setError] = useState(null);

  const videoRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const recordTimerRef = useRef(null);

  const startCamera = useCallback(async () => {
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      const s = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 3840 },
          height: { ideal: 2160 },
          frameRate: { ideal: 60, min: 30 }
        },
        audio: true
      });
      streamRef.current = s;
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.play().catch(() => {});
      }
    } catch (e) {
      setError('Camera access denied. Please enable camera permissions.');
    }
  }, [facing]);

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };
  }, [facing]);

  const takePhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      setCaptured({ url: URL.createObjectURL(blob), blob, type: 'image' });
    }, 'image/jpeg', 1.0);
  };

  const toggleRecording = () => {
    if (recording) {
      if (recorderRef.current && recorderRef.current.state === 'recording') recorderRef.current.stop();
      setRecording(false);
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      return;
    }
    if (!streamRef.current) return;
    const mimeType = pickVideoMime();
    if (!mimeType) { setError('Video recording not supported on this device.'); return; }
    try {
      chunksRef.current = [];
      const recorder = new MediaRecorder(streamRef.current, {
        mimeType,
        videoBitsPerSecond: 16000000,
        audioBitsPerSecond: 128000
      });
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blobType = (recorder.mimeType || 'video/webm').split(';')[0];
        const ext = blobType.includes('mp4') ? 'mp4' : 'webm';
        const blob = new Blob(chunksRef.current, { type: blobType });
        setCaptured({ url: URL.createObjectURL(blob), blob, type: 'video', ext });
      };
      recorder.start(100);
      recorderRef.current = recorder;
      setRecording(true);
      setRecordTime(0);
      recordTimerRef.current = setInterval(() => setRecordTime(t => t + 1), 1000);
    } catch (e) {
      setError('Video recording not supported on this device.');
    }
  };

  const retake = () => {
    if (captured?.url) URL.revokeObjectURL(captured.url);
    setCaptured(null);
    setCaption('');
  };

  const handleSend = async () => {
    if (!captured || sending) return;
    setSending(true);
    try {
      let blob = captured.blob;
      let fileName = captured.type === 'image' ? 'camera_photo.jpg' : `camera_video.${captured.ext || 'webm'}`;
      let fileType = captured.type === 'image' ? 'image/jpeg' : (captured.blob.type || 'video/webm');

      if (captured.type === 'image') {
        const compressed = await compressImage(new File([blob], fileName, { type: fileType }));
        blob = compressed;
        fileName = compressed.name || fileName;
        fileType = compressed.type || fileType;
      }

      const file = new File([blob], fileName, { type: fileType });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onSend({
        text: caption.trim(),
        file_url,
        file_name: fileName,
        file_type: captured.type === 'image' ? 'image' : 'video'
      });
      if (captured.url) URL.revokeObjectURL(captured.url);
    } catch (e) {
      setError('Failed to send. Please try again.');
      setSending(false);
    }
  };

  const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // ── Preview after capture ──
  if (captured) {
    return (
      <div className="fixed inset-0 z-[80] flex flex-col bg-black">
        <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ backgroundColor: 'rgba(13,15,30,0.95)' }}>
          {!sending && (
            <button onClick={retake} className="flex items-center gap-2 text-white/80 hover:text-white">
              <RotateCcw size={20} /> <span className="text-sm font-medium">Retake</span>
            </button>
          )}
          <div className="flex-1" />
          {sending ? (
            <div className="flex items-center gap-2 text-white/60">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span className="text-sm">Sending…</span>
            </div>
          ) : (
            <button onClick={handleSend}
              className="flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
              <Send size={16} /> Send
            </button>
          )}
        </div>
        <div className="flex-1 flex items-center justify-center overflow-hidden">
          {captured.type === 'image' ? (
            <img src={captured.url} alt="" className="max-w-full max-h-full object-contain" />
          ) : (
            <video src={captured.url} controls autoPlay playsInline className="max-w-full max-h-full" />
          )}
        </div>
        {!sending && (
          <div className="shrink-0 p-4" style={{ backgroundColor: 'rgba(13,15,30,0.95)' }}>
            <input
              value={caption}
              onChange={e => setCaption(e.target.value)}
              placeholder="Add a caption…"
              className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50"
            />
          </div>
        )}
      </div>
    );
  }

  // ── Live camera feed ──
  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-black">
      <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ backgroundColor: 'rgba(13,15,30,0.95)' }}>
        <button onClick={onCancel} className="p-2 -ml-2 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors">
          <X size={22} />
        </button>
        <h2 className="text-white font-semibold text-base flex-1">Camera</h2>
        <button onClick={() => setFacing(f => f === 'environment' ? 'user' : 'environment')}
          className="p-2 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors">
          <SwitchCamera size={22} />
        </button>
      </div>

      {error ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
          <Camera size={40} className="text-red-400" />
          <p className="text-sm text-red-400 text-center">{error}</p>
          <button onClick={() => { setError(null); startCamera(); }}
            className="px-4 py-2 rounded-full text-sm font-medium text-white"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
            Try again
          </button>
        </div>
      ) : (
        <>
          <div className="flex-1 relative overflow-hidden">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            {recording && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full"
                style={{ backgroundColor: 'rgba(239,68,68,0.92)' }}>
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                <span className="text-xs font-bold text-white">{fmtTime(recordTime)}</span>
              </div>
            )}
          </div>

          <div className="shrink-0 p-6 pb-8" style={{ backgroundColor: 'rgba(13,15,30,0.95)' }}>
            <div className="flex justify-center gap-2 mb-6">
              <button onClick={() => setMode('photo')}
                className="px-4 py-1.5 rounded-full text-xs font-medium transition-colors"
                style={mode === 'photo' ? { background: 'rgba(124,58,237,0.3)', color: '#fff' } : { color: 'rgba(255,255,255,0.4)' }}>
                <Camera size={14} className="inline mr-1.5 align-middle" /> Photo
              </button>
              <button onClick={() => setMode('video')}
                className="px-4 py-1.5 rounded-full text-xs font-medium transition-colors"
                style={mode === 'video' ? { background: 'rgba(124,58,237,0.3)', color: '#fff' } : { color: 'rgba(255,255,255,0.4)' }}>
                <Video size={14} className="inline mr-1.5 align-middle" /> Video
              </button>
            </div>

            <div className="flex justify-center">
              <button onClick={mode === 'photo' ? takePhoto : toggleRecording}
                className="rounded-full border-4 border-white flex items-center justify-center transition-transform active:scale-90"
                style={{ width: '72px', height: '72px' }}>
                {mode === 'video' && recording ? (
                  <div className="w-6 h-6 rounded bg-red-500" />
                ) : (
                  <div className="rounded-full" style={{
                    width: '48px', height: '48px',
                    backgroundColor: mode === 'video' ? 'rgba(239,68,68,0.9)' : 'rgba(255,255,255,0.9)'
                  }} />
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}