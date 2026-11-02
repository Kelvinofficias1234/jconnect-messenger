import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import CallScreen from './CallScreen';
import IncomingCallModal from './IncomingCallModal';
import { playRingtoneLoop, stopRingtone } from '@/lib/ringtonePlayer';
import { notifyIncomingCall } from '@/lib/notificationManager';
import { getSavedRingtone } from '@/lib/ringtonePlayer';
import { unlockAudioNow } from '@/lib/audioUnlock';
import { mungeSdpForOpus } from '@/lib/voiceCallEngine';
import { toast } from '@/components/ui/use-toast';

const CallContext = createContext(null);

// STUN + TURN ICE servers for global NAT/firewall traversal.
// Google STUN for candidate discovery; Open Relay TURN for strict NAT/firewall
// relay (symmetric NAT, corporate firewalls). Replace TURN credentials with
// Twilio NTS ephemeral credentials for production-scale traffic.
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
    // TURN over TLS on 443 — bypasses restrictive firewalls that block non-HTTPS ports
    { urls: 'turns:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' }
  ],
  iceCandidatePoolSize: 10,
  iceTransportPolicy: 'all'
};

export const useCall = () => useContext(CallContext);

export function CallProvider({ children }) {
  const [currentUserId, setCurrentUserId] = useState(null);
  const [allProfiles, setAllProfiles] = useState([]);
  const [activeCall, setActiveCall] = useState(null);
  const [callStatus, setCallStatus] = useState('idle'); // idle | calling | connected | ended
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [callError, setCallError] = useState(null);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);

  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const activeCallRef = useRef(null);
  const incomingCallRef = useRef(null);
  const pendingIceRef = useRef([]);
  const remoteStreamRef = useRef(null);
  const startRef = useRef(0);
  const callStatusRef = useRef('idle');
  const ringtoneIdRef = useRef(getSavedRingtone());
  const rawStreamRef = useRef(null);
  const disconnectTimerRef = useRef(null);
  const callTimeoutRef = useRef(null);

  useEffect(() => { callStatusRef.current = callStatus; }, [callStatus]);

  // Cleanup on unmount: stop all media tracks and close the peer connection
  // to prevent memory leaks and "Aw, Snap!" browser crashes.
  useEffect(() => {
    return () => {
      if (pcRef.current) {
        try {
          pcRef.current.onicecandidate = null;
          pcRef.current.ontrack = null;
          pcRef.current.onconnectionstatechange = null;
          pcRef.current.oniceconnectionstatechange = null;
          pcRef.current.close();
        } catch {}
        pcRef.current = null;
      }
      if (rawStreamRef.current) {
        rawStreamRef.current.getTracks().forEach(t => { try { t.stop(); } catch {} });
        rawStreamRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => { try { t.stop(); } catch {} });
        localStreamRef.current = null;
      }
      if (remoteStreamRef.current) {
        remoteStreamRef.current.getTracks().forEach(t => { try { t.stop(); } catch {} });
        remoteStreamRef.current = null;
      }
      stopRingtone();
    };
  }, []);

  // Keep preferred ringtone id in a ref so profile changes never re-trigger the loop
  useEffect(() => {
    if (currentUserId && allProfiles.length) {
      const myProf = allProfiles.find(p => p.user_id === currentUserId);
      if (myProf?.ringtone) ringtoneIdRef.current = myProf.ringtone;
    }
  }, [currentUserId, allProfiles]);

  // Play ringtone ONLY while an incoming call is pending — stops the instant it's gone
  useEffect(() => {
    if (incomingCall) {
      playRingtoneLoop(ringtoneIdRef.current || 'j_connect_call');
    } else {
      stopRingtone();
    }
    return () => stopRingtone();
  }, [incomingCall]);

  // Absolute guarantee: ringtone stops the moment a call connects or goes idle,
  // regardless of which code path triggered the transition (answer, reject, end).
  useEffect(() => {
    if (callStatus === 'connected' || callStatus === 'idle') {
      stopRingtone();
    }
  }, [callStatus]);

  // Load current user + profiles (self-contained)
  useEffect(() => {
    let mounted = true;
    (async () => {
      let me = null;
      try {
        me = await base44.auth.me();
        if (mounted) setCurrentUserId(me.id);
      } catch {}
      if (me) {
        try {
          // Privacy: Load only profiles of conversation participants + contacts.
          // Never fetch the global user directory.
          const convos = await base44.entities.Conversation.filter({ participant_ids: me.id }, '-last_message_time', 200);
          const participantIds = new Set();
          convos.forEach(c => c.participant_ids?.forEach(id => participantIds.add(id)));
          const contacts = await base44.entities.Contact.filter({ user_id: me.id });
          contacts.forEach(c => participantIds.add(c.contact_user_id));
          participantIds.add(me.id);
          const profs = participantIds.size > 0
            ? await base44.entities.Profile.filter({ user_id: { $in: [...participantIds] } })
            : [];
          if (mounted) setAllProfiles(profs);
        } catch {}
      }
    })();
    return () => { mounted = false; };
  }, []);

  const profileMap = {};
  allProfiles.forEach(p => { profileMap[p.user_id] = p; });

  const sendSignal = useCallback(async (callId, from, to, signalType, payload, callType) => {
    try {
      await base44.entities.CallSignal.create({
        call_id: callId,
        from_user_id: from,
        to_user_id: to,
        signal_type: signalType,
        payload: payload ? JSON.stringify(payload) : '',
        call_type: callType || 'voice'
      });
    } catch {}
  }, []);

  const cleanupSignals = useCallback(async (callId) => {
    if (!callId) return;
    try { await base44.entities.CallSignal.deleteMany({ call_id: callId }); } catch {}
  }, []);

  const stopMedia = useCallback(() => {
    if (rawStreamRef.current) {
      rawStreamRef.current.getTracks().forEach(t => t.stop());
      rawStreamRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => { try { t.stop(); } catch {} });
      localStreamRef.current = null;
      setLocalStream(null);
    }
  }, []);

  const closePeer = useCallback(() => {
    if (pcRef.current) {
      try {
        pcRef.current.onicecandidate = null;
        pcRef.current.ontrack = null;
        pcRef.current.onconnectionstatechange = null;
        pcRef.current.close();
      } catch {}
      pcRef.current = null;
    }
    remoteStreamRef.current = null;
    setRemoteStream(null);
    setHasRemoteVideo(false);
    pendingIceRef.current = [];
  }, []);

  const writeCallLog = useCallback(async (call, connected) => {
    if (!call) return;
    const duration = startRef.current ? Math.round((Date.now() - startRef.current) / 1000) : 0;
    try {
      await base44.entities.CallLog.create({
        caller_id: call.role === 'caller' ? currentUserId : call.otherUserId,
        callee_id: call.role === 'callee' ? currentUserId : call.otherUserId,
        call_type: call.callType,
        direction: call.role === 'caller' ? 'outgoing' : 'incoming',
        status: connected ? 'answered' : 'missed',
        duration_seconds: duration,
        participants: [currentUserId, call.otherUserId]
      });
    } catch {}
  }, [currentUserId]);

  const endCall = useCallback((reason = 'end') => {
    if (disconnectTimerRef.current) { clearTimeout(disconnectTimerRef.current); disconnectTimerRef.current = null; }
    if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null; }
    const call = activeCallRef.current;
    const connected = callStatusRef.current === 'connected';
    // Tear down UI immediately — never block on network
    closePeer();
    stopMedia();
    stopRingtone();
    activeCallRef.current = null;
    incomingCallRef.current = null;
    setIncomingCall(null);
    setActiveCall(null);
    setCallStatus('idle');
    startRef.current = 0;
    // Fire-and-forget signaling & logging in the background.
    // Always send 'end' as the signal type — the remote party only recognizes
    // 'end'/'reject'/'busy'. Sending 'failed'/'closed'/'disconnected' would
    // be ignored, leaving the remote screen counting forever.
    if (call) {
      sendSignal(call.callId, currentUserId, call.otherUserId, 'end', null, call.callType);
      writeCallLog(call, connected);
      cleanupSignals(call.callId);
    }
  }, [currentUserId, sendSignal, cleanupSignals, closePeer, stopMedia, writeCallLog]);

  const optimizeSenders = useCallback(async (pc, callType) => {
    try {
      const senders = pc.getSenders();
      await Promise.all(senders.map(async (sender) => {
        if (!sender.track) return;
        const params = sender.getParameters();
        if (!params.encodings || params.encodings.length === 0) params.encodings = [{}];
        if (sender.track.kind === 'audio') {
          // Ultra-clear HD voice — 128 kbps Opus
          params.encodings[0].maxBitrate = 128000;
        } else if (sender.track.kind === 'video') {
          // Ultra HD video — 8 Mbps for razor-sharp, detailed frames;
          // WebRTC congestion control auto-adapts down on weak networks
          params.encodings[0].maxBitrate = 2000000;
          params.encodings[0].maxFramerate = 30;
          params.degradationPreference = 'maintain-framerate';
        }
        try { await sender.setParameters(params); } catch {}
      }));
    } catch {}
  }, []);

  // ── Codec enforcement: Opus 48kHz for audio, VP8/VP9 for video ──
  // Forces the browser to negotiate these codecs first, ensuring high-fidelity
  // voice and efficient video encoding regardless of peer defaults.
  const setPreferredCodecs = useCallback((pc, callType) => {
    try {
      const transceivers = pc.getTransceivers();
      // Audio: Opus first (48kHz, full-band, low-latency, CELT-based)
      const audioCaps = RTCRtpSender.getCapabilities('audio');
      if (audioCaps) {
        const opus = audioCaps.codecs.filter(c => c.mimeType === 'audio/opus');
        const rest = audioCaps.codecs.filter(c => c.mimeType !== 'audio/opus');
        transceivers
          .filter(t => t.receiver.track?.kind === 'audio')
          .forEach(t => { try { t.setCodecPreferences([...opus, ...rest]); } catch {} });
      }
      // Video: H.264 first (hardware decoding on iOS WebKit / Android), then VP8
      // (universal baseline), then VP9 (better compression, not always hardware-accelerated)
      if (callType === 'video') {
        const videoCaps = RTCRtpSender.getCapabilities('video');
        if (videoCaps) {
          const h264 = videoCaps.codecs.filter(c => c.mimeType === 'video/H264');
          const vp8 = videoCaps.codecs.filter(c => c.mimeType === 'video/VP8');
          const vp9 = videoCaps.codecs.filter(c => c.mimeType === 'video/VP9');
          const rest = videoCaps.codecs.filter(c =>
            c.mimeType !== 'video/H264' && c.mimeType !== 'video/VP8' && c.mimeType !== 'video/VP9');
          transceivers
            .filter(t => t.receiver.track?.kind === 'video')
            .forEach(t => { try { t.setCodecPreferences([...h264, ...vp8, ...vp9, ...rest]); } catch {} });
        }
      }
    } catch {}
  }, []);

  const createPeer = useCallback((callId, otherUserId, callType) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    pc.onicecandidate = (e) => {
      if (e.candidate) sendSignal(callId, currentUserId, otherUserId, 'ice', e.candidate.toJSON(), callType);
    };
    pc.ontrack = (e) => {
      if (callType === 'video') {
        // Video call: accumulate audio + video tracks into a single stream.
        // e.streams[0] can be undefined or differ between the audio and video
        // ontrack events on some browsers, so we accumulate into a persistent
        // stream to guarantee both tracks reach the <video> element together.
        if (!remoteStreamRef.current) remoteStreamRef.current = new MediaStream();
        try { remoteStreamRef.current.addTrack(e.track); } catch {}
        // New stream reference forces React re-render so VideoPlayer re-attaches
        const stream = new MediaStream(remoteStreamRef.current.getTracks());
        remoteStreamRef.current = stream;
        setRemoteStream(stream);
        if (e.track.kind === 'video') setHasRemoteVideo(true);
      } else {
        // Voice call: use the event stream directly (one track only)
        const incomingStream = e.streams[0] || new MediaStream([e.track]);
        remoteStreamRef.current = incomingStream;
        setRemoteStream(incomingStream);
      }
    };
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'connected') {
        stopRingtone(); // Absolute guarantee: no ringtone during a live call
        if (disconnectTimerRef.current) { clearTimeout(disconnectTimerRef.current); disconnectTimerRef.current = null; }
        if (callTimeoutRef.current) { clearTimeout(callTimeoutRef.current); callTimeoutRef.current = null; }
        startRef.current = Date.now();
        setCallStatus('connected');
      } else if (state === 'disconnected') {
        // Grace period: transient blips shouldn't hang up, but a sustained
        // disconnect MUST tear down and silence all audio (no ghost ringtone).
        // 15s gives ICE restart enough time to recover on flaky networks.
        if (!disconnectTimerRef.current) {
          disconnectTimerRef.current = setTimeout(() => {
            disconnectTimerRef.current = null;
            stopRingtone();
            endCall('disconnected');
          }, 15000);
        }
      } else if (state === 'closed') {
        // Remote hung up — tear down immediately
        if (disconnectTimerRef.current) { clearTimeout(disconnectTimerRef.current); disconnectTimerRef.current = null; }
        stopRingtone();
        endCall(state);
      } else if (state === 'failed') {
        // Don't immediately hang up on 'failed' — give ICE restart a chance to recover.
        // Audio-only calls can briefly hit 'failed' before the connection stabilizes.
        // 5s grace period prevents premature hangup from transient ICE failures.
        if (!disconnectTimerRef.current) {
          disconnectTimerRef.current = setTimeout(() => {
            disconnectTimerRef.current = null;
            stopRingtone();
            endCall('failed');
          }, 5000);
        }
      }
    };
    // ── Granular ICE connection monitoring: eliminates lag & packet drops ──
    // oniceconnectionstatechange fires earlier than onconnectionstatechange,
    // giving us a chance to restart ICE before the call fully drops.
    pc.oniceconnectionstatechange = () => {
      try {
        const iceState = pc.iceConnectionState;
        // Silence ringtone the instant ICE connects — fires earlier than
        // onconnectionstatechange, giving the fastest possible cutoff.
        if (iceState === 'connected' || iceState === 'completed') {
          stopRingtone();
          // Cancel any pending disconnect teardown — ICE recovered
          if (disconnectTimerRef.current) { clearTimeout(disconnectTimerRef.current); disconnectTimerRef.current = null; }
        }
        if (iceState === 'failed' || iceState === 'disconnected') {
          // ICE failed or temporarily disconnected — attempt an ICE restart to
          // recover without hanging up. This re-negotiates with fresh candidates.
          try { pc.restartIce(); } catch {}
        }
      } catch {}
    };
    pcRef.current = pc;
    return pc;
  }, [currentUserId, sendSignal, endCall]);

  const processLocalStream = useCallback(async (rawStream, callType) => {
    rawStreamRef.current = rawStream;
    const tracks = [];
    // Audio: use raw microphone tracks directly. Hardware AEC (echoCancellation,
    // noiseSuppression, autoGainControl) is already enabled via getUserMedia
    // constraints and is more reliable than the software AudioWorklet, which
    // can introduce phase distortion that makes speech unintelligible on some
    // devices/browsers.
    rawStream.getAudioTracks().forEach(t => tracks.push(t));
    // Video: use raw camera tracks directly.
    if (callType === 'video') {
      rawStream.getVideoTracks().forEach(t => tracks.push(t));
    }
    return new MediaStream(tracks);
  }, []);

  // Adaptive media constraints: tries standard mobile-friendly video first,
  // then steps down to lower resolution if the device/browser can't handle it,
  // preventing uncaught media errors and frozen streams on low-end devices.
  const getAdaptiveMediaStream = useCallback(async (callType) => {
    const audioConstraints = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      channelCount: 1,
      sampleRate: 48000,
      latency: 0,
      advanced: [
        { echoCancellation: true, googEchoCancellation: true },
        { autoGainControl: true, googAutoGainControl: true },
        { noiseSuppression: true, googNoiseSuppression: true },
        { googHighpassFilter: true }
      ]
    };
    if (callType === 'video') {
      // Attempt 1: standard mobile-friendly constraints
      try {
        return await navigator.mediaDevices.getUserMedia({
          audio: audioConstraints,
          video: { width: { ideal: 480, max: 720 }, height: { ideal: 480, max: 1280 }, facingMode: 'user', frameRate: { ideal: 24, max: 30 } }
        });
      } catch (e) {
        // Attempt 2: lower resolution fallback (320x240, 15fps)
        try {
          return await navigator.mediaDevices.getUserMedia({
            audio: audioConstraints,
            video: { width: { ideal: 320 }, height: { ideal: 240 }, facingMode: 'user', frameRate: { ideal: 15, max: 24 } }
          });
        } catch (e2) {
          // Attempt 3: audio-only fallback — don't crash, just drop video
          return await navigator.mediaDevices.getUserMedia({ audio: audioConstraints, video: false });
        }
      }
    }
    return await navigator.mediaDevices.getUserMedia({ audio: audioConstraints, video: false });
  }, []);

  const startCall = useCallback(async (targetUserId, callType = 'voice') => {
    if (!currentUserId || activeCallRef.current || incomingCallRef.current) return;
    setCallError(null);
    // Show call screen IMMEDIATELY — before async media setup — so the caller
    // transitions into the full-screen call view instantly instead of staying
    // stuck on the chat screen while getUserMedia/ICE negotiation completes.
    const callId = `${currentUserId}_${targetUserId}_${Date.now()}`;
    const call = { callId, otherUserId: targetUserId, callType, role: 'caller' };
    activeCallRef.current = call;
    setActiveCall(call);
    setCallStatus('calling');
    try {
      unlockAudioNow(); // Unlock audio playback within the user gesture (mobile autoplay)
      const rawStream = await getAdaptiveMediaStream(callType);
      const stream = await processLocalStream(rawStream, callType);
      localStreamRef.current = stream;
      setLocalStream(stream);
      const pc = createPeer(callId, targetUserId, callType);
      // Explicitly add transceivers with sendrecv direction BEFORE creating the SDP offer.
      // This prevents instant signaling renegotiation drops on audio-only calls.
      if (callType === 'voice') {
        pc.addTransceiver('audio', { direction: 'sendrecv' });
      } else {
        pc.addTransceiver('audio', { direction: 'sendrecv' });
        pc.addTransceiver('video', { direction: 'sendrecv' });
      }
      // Attach local tracks to the created transceivers (await replaceTrack so the
      // audio track is fully attached before SDP offer is generated)
      const tcvrs = pc.getTransceivers();
      for (const track of stream.getTracks()) {
        const tcv = tcvrs.find(t => t.receiver.track?.kind === track.kind && !t.sender.track);
        if (tcv) await tcv.sender.replaceTrack(track);
        else pc.addTrack(track, stream);
      }
      setPreferredCodecs(pc, callType);
      const offer = await pc.createOffer();
      // Munge SDP to force Opus first + add low-latency params (useinbandfec,
      // usedtx, maxaveragebitrate). Applied to both voice and video calls —
      // only modifies m=audio lines, so video SDP sections are untouched.
      const finalOffer = mungeSdpForOpus(offer);
      await pc.setLocalDescription(finalOffer);
      await optimizeSenders(pc, callType);
      await sendSignal(callId, currentUserId, targetUserId, 'offer', finalOffer, callType);
      // Auto-end if the callee doesn't answer within 45 seconds (no infinite "Calling…")
      callTimeoutRef.current = setTimeout(() => {
        if (callStatusRef.current === 'calling' || callStatusRef.current === 'ringing') {
          endCall('timeout');
        }
      }, 45000);
    } catch (e) {
      setCallError('Could not access camera or microphone. Please check permissions.');
      toast({ title: 'Camera & Microphone Required', description: 'Please grant camera and microphone permissions to make calls.', variant: 'destructive', duration: 10000 });
      stopMedia();
      activeCallRef.current = null;
      setActiveCall(null);
      setCallStatus('idle');
    }
  }, [currentUserId, createPeer, sendSignal, stopMedia, optimizeSenders, processLocalStream, setPreferredCodecs, getAdaptiveMediaStream]);

  const rejectCall = useCallback(async () => {
    const inc = incomingCallRef.current;
    stopRingtone();
    if (inc) {
      await sendSignal(inc.callId, currentUserId, inc.fromUserId, 'reject', null, inc.callType);
      await cleanupSignals(inc.callId);
    }
    incomingCallRef.current = null;
    setIncomingCall(null);
  }, [currentUserId, sendSignal, cleanupSignals]);

  const acceptCall = useCallback(async () => {
    const inc = incomingCallRef.current;
    if (!inc) return;
    // Stop ringtone + dismiss incoming modal IMMEDIATELY — before any async media work
    stopRingtone();
    incomingCallRef.current = null;
    setIncomingCall(null);
    // Show call screen IMMEDIATELY — before async media setup — so the callee
    // transitions into the full-screen call view instantly instead of staying
    // stuck on the incoming call modal while getUserMedia/ICE negotiation completes.
    const call = { callId: inc.callId, otherUserId: inc.fromUserId, callType: inc.callType, role: 'callee' };
    activeCallRef.current = call;
    setActiveCall(call);
    setCallStatus('connecting');
    try {
      unlockAudioNow(); // Unlock audio playback within the user gesture (mobile autoplay)
      const rawStream = await getAdaptiveMediaStream(inc.callType);
      const stream = await processLocalStream(rawStream, inc.callType);
      localStreamRef.current = stream;
      setLocalStream(stream);
      const pc = createPeer(inc.callId, inc.fromUserId, inc.callType);
      // Set remote description FIRST — this creates transceivers for the remote
      // m-lines and fires ontrack for incoming tracks. This is the standard WebRTC
      // answerer flow and ensures ontrack fires reliably on all browsers including mobile.
      await pc.setRemoteDescription(inc.offer);
      // Attach local tracks to the transceivers created by setRemoteDescription
      const tcvrs = pc.getTransceivers();
      for (const track of stream.getTracks()) {
        const tcv = tcvrs.find(t => t.receiver.track?.kind === track.kind && !t.sender.track);
        if (tcv) await tcv.sender.replaceTrack(track);
        else pc.addTrack(track, stream);
      }
      // Ensure transceiver directions are sendrecv for bidirectional media
      tcvrs.forEach(t => { try { if (t.direction !== 'sendrecv') t.direction = 'sendrecv'; } catch {} });
      setPreferredCodecs(pc, inc.callType);
      const queued = pendingIceRef.current;
      pendingIceRef.current = [];
      for (const c of queued) { try { await pc.addIceCandidate(c); } catch {} }
      const answer = await pc.createAnswer();
      // Munge SDP to force Opus first + add low-latency params (useinbandfec,
      // usedtx, maxaveragebitrate). Applied to both voice and video calls —
      // only modifies m=audio lines, so video SDP sections are untouched.
      const finalAnswer = mungeSdpForOpus(answer);
      await pc.setLocalDescription(finalAnswer);
      await optimizeSenders(pc, inc.callType);
      await sendSignal(inc.callId, currentUserId, inc.fromUserId, 'answer', finalAnswer, inc.callType);
      setCallStatus('connected');
    } catch (e) {
      setCallError('Could not access camera or microphone. Please check permissions.');
      toast({ title: 'Camera & Microphone Required', description: 'Please grant camera and microphone permissions to receive calls.', variant: 'destructive', duration: 10000 });
      activeCallRef.current = null;
      setActiveCall(null);
      setCallStatus('idle');
      rejectCall();
    }
  }, [currentUserId, createPeer, sendSignal, rejectCall, optimizeSenders, processLocalStream, setPreferredCodecs, getAdaptiveMediaStream]);

  // Subscribe to incoming signals
  useEffect(() => {
    if (!currentUserId) return;
    const unsub = base44.entities.CallSignal.subscribe((event) => {
      const data = event.data;
      if (!data || data.to_user_id !== currentUserId) return;

      if (data.signal_type === 'offer') {
        // Ignore duplicate offers for the SAME call — the realtime subscription
        // can re-deliver the original offer after the callee has already answered.
        // Without this guard, the callee would send 'busy' for the duplicate,
        // causing the caller to hang up even though the call is connected.
        const dupInc = incomingCallRef.current;
        const dupCall = activeCallRef.current;
        if (dupInc && dupInc.callId === data.call_id) return;
        if (dupCall && dupCall.callId === data.call_id) return;

        if (activeCallRef.current || incomingCallRef.current) {
          sendSignal(data.call_id, currentUserId, data.from_user_id, 'busy', null, data.call_type);
          return;
        }
        try {
          const offer = JSON.parse(data.payload);
          incomingCallRef.current = {
            callId: data.call_id,
            fromUserId: data.from_user_id,
            callType: data.call_type || 'voice',
            offer
          };
          setIncomingCall(incomingCallRef.current);
          sendSignal(data.call_id, currentUserId, data.from_user_id, 'ringing', null, data.call_type);
          // Native OS notification for incoming call when app is backgrounded
          const callerProfile = allProfiles.find(p => p.user_id === data.from_user_id);
          notifyIncomingCall(callerProfile?.display_name || 'Someone', data.call_type || 'voice');
        } catch {}
        return;
      }

      // ICE candidates must be queued even BEFORE the callee answers — the
      // caller starts sending them immediately after setLocalDescription(offer).
      // Without this, they hit the activeCallRef guard below and are dropped,
      // so the WebRTC connection never establishes and the caller's side fails.
      if (data.signal_type === 'ice') {
        const inc = incomingCallRef.current;
        const call = activeCallRef.current;
        const relevantCallId = call?.callId || inc?.callId;
        if (relevantCallId !== data.call_id) return;
        const pc = pcRef.current;
        try {
          const cand = JSON.parse(data.payload);
          if (pc && pc.remoteDescription) {
            pc.addIceCandidate(cand).catch(() => {});
          } else {
            pendingIceRef.current.push(cand);
          }
        } catch {}
        return;
      }

      const call = activeCallRef.current;
      if (!call || call.callId !== data.call_id) return;

      if (data.signal_type === 'ringing') {
        if (callStatusRef.current === 'calling') setCallStatus('ringing');
      } else if (data.signal_type === 'answer') {
        stopRingtone(); // Stop caller's ringtone the instant the callee answers
        const pc = pcRef.current;
        if (pc) {
          pc.setRemoteDescription(JSON.parse(data.payload)).then(() => {
            const queued = pendingIceRef.current;
            pendingIceRef.current = [];
            queued.forEach(c => pc.addIceCandidate(c).catch(() => {}));
          }).catch(() => {});
        }
        // FIX: Transition caller UI to connected immediately when the answer
        // is received — don't wait for onconnectionstatechange which may lag.
        if (callStatusRef.current === 'calling' || callStatusRef.current === 'ringing') {
          setCallStatus('connected');
        }
      } else if (data.signal_type === 'end' || data.signal_type === 'reject' || data.signal_type === 'busy') {
        endCall(data.signal_type);
      }
    });
    return () => { unsub(); };
  }, [currentUserId, sendSignal, endCall]);

  const value = {
    activeCall, callStatus, localStream, remoteStream, hasRemoteVideo, incomingCall, callError,
    otherProfile: activeCall ? profileMap[activeCall.otherUserId] : null,
    incomingProfile: incomingCall ? profileMap[incomingCall.fromUserId] : null,
    startCall, acceptCall, rejectCall, endCall
  };

  return (
    <CallContext.Provider value={value}>
      {children}
      {incomingCall && currentUserId && (
        <IncomingCallModal
          incoming={incomingCall}
          profile={value.incomingProfile}
          onAccept={acceptCall}
          onReject={rejectCall}
        />
      )}
      {activeCall && currentUserId && (
        <CallScreen
          call={activeCall}
          status={callStatus}
          localStream={localStream}
          remoteStream={remoteStream}
          hasRemoteVideo={hasRemoteVideo}
          otherProfile={value.otherProfile}
          onEnd={() => endCall('end')}
        />
      )}
    </CallContext.Provider>
  );
}