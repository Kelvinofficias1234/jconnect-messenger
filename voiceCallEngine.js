// src/lib/voiceCallEngine.js
// Voice-only WebRTC enhancements: SDP munging to force Opus codec priority.
// Applied exclusively to audio (voice) calls — video calls are untouched.

/**
 * Reorders the audio media section's codec list to put Opus first.
 * This is a fallback for browsers that don't support RTCRtpTransceiver.setCodecPreferences
 * (e.g., older Safari/Firefox). On modern browsers, setCodecPreferences (already
 * called in CallProvider) handles this natively; this SDP munging is a safety net.
 *
 * Only modifies m=audio lines — never touches m=video lines, so video calls
 * are completely unaffected even if this function were called on them.
 */
export function mungeSdpForOpus(desc) {
  if (!desc || !desc.sdp) return desc;
  const sdp = desc.sdp;

  // Find the Opus payload type (e.g., "a=rtpmap:111 opus/48000/2")
  const opusMatch = sdp.match(/a=rtpmap:(\d+) opus\/48000\/2/);
  if (!opusMatch) return desc;
  const opusPt = opusMatch[1];

  const lines = sdp.split(/\r?\n/);
  let modified = false;
  let fmtpFound = false;

  const result = lines.map((line) => {
    if (line.startsWith('m=audio')) {
      const parts = line.split(' ');
      const port = parts[1];
      const proto = parts[2];
      const pts = parts.slice(3);
      if (pts[0] === opusPt) return line; // already first
      const reordered = [opusPt, ...pts.filter((pt) => pt !== opusPt)];
      modified = true;
      return `m=audio ${port} ${proto} ${reordered.join(' ')}`;
    }
    // Add low-latency Opus parameters to the fmtp line:
    // useinbandfec=1 (Forward Error Correction), usedtx=1 (Discontinuous
    // Transmission), maxaveragebitrate=32000 (cap bitrate to prevent
    // cellular packet queuing and reduce lag).
    if (line.startsWith(`a=fmtp:${opusPt} `)) {
      fmtpFound = true;
      let fmtp = line;
      if (!fmtp.includes('useinbandfec=')) { fmtp += ';useinbandfec=1'; modified = true; }
      if (!fmtp.includes('usedtx=')) { fmtp += ';usedtx=1'; modified = true; }
      if (!fmtp.includes('maxaveragebitrate=')) { fmtp += ';maxaveragebitrate=32000'; modified = true; }
      return fmtp;
    }
    return line;
  });

  // If no fmtp line exists for Opus, insert one after the m=audio line
  if (!fmtpFound) {
    const mAudioIdx = result.findIndex(l => l.startsWith('m=audio'));
    if (mAudioIdx !== -1) {
      result.splice(mAudioIdx + 1, 0, `a=fmtp:${opusPt} useinbandfec=1;usedtx=1;maxaveragebitrate=32000`);
      modified = true;
    }
  }

  if (!modified) return desc;
  return new RTCSessionDescription({ type: desc.type, sdp: result.join('\r\n') });
}