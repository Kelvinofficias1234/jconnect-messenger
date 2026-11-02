// src/lib/webrtcCompat.js
// Lightweight cross-browser WebRTC normalization layer.
// Replaces the heavy webrtc-adapter npm package with a focused shim that
// handles the key differences between Blink (Chrome/Opera/Edge), WebKit
// (Safari iOS/macOS), and Gecko (Firefox) without pulling in a large dep.

/**
 * Normalizes vendor-prefixed WebRTC APIs and patches known browser quirks.
 * Call once at app startup (imported in main.jsx).
 */
export function initWebRTCCompat() {
  if (typeof window === 'undefined') return;

  // 1. RTCPeerConnection — normalize vendor prefixes (older Safari/Firefox)
  if (!window.RTCPeerConnection) {
    window.RTCPeerConnection =
      window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
  }

  // 2. getUserMedia — normalize vendor prefixes
  if (navigator && !navigator.mediaDevices) {
    navigator.mediaDevices = {};
  }
  if (navigator.mediaDevices && !navigator.mediaDevices.getUserMedia) {
    const legacyGetUserMedia =
      navigator.getUserMedia ||
      navigator.webkitGetUserMedia ||
      navigator.mozGetUserMedia;
    if (legacyGetUserMedia) {
      navigator.mediaDevices.getUserMedia = (constraints) =>
        new Promise((resolve, reject) => {
          legacyGetUserMedia.call(navigator, constraints, resolve, reject);
        });
    }
  }

  // 3. MediaStream — normalize vendor prefixes
  if (typeof window !== 'undefined' && !window.MediaStream) {
    window.MediaStream = window.webkitMediaStream || window.mozMediaStream;
  }

  // 4. Safari iOS/macOS: ensure srcObject is supported (older WebKit)
  //    Some older Safari versions don't have srcObject on HTMLMediaElement.
  if (typeof HTMLMediaElement !== 'undefined' &&
    'srcObject' in HTMLMediaElement.prototype === false) {
    Object.defineProperty(HTMLMediaElement.prototype, 'srcObject', {
      get() {
        return this._srcObject || null;
      },
      set(stream) {
        this._srcObject = stream;
        if (stream) {
          // Fallback: use URL.createObjectURL for older WebKit
          try { this.src = URL.createObjectURL(stream); } catch {}
        } else {
          this.src = '';
        }
      },
    });
  }

  // 5. Firefox: normalize RTCIceCandidate.toJSON (older Firefox versions)
  if (window.RTCIceCandidate && !RTCIceCandidate.prototype.toJSON) {
    RTCIceCandidate.prototype.toJSON = function () {
      return {
        candidate: this.candidate,
        sdpMid: this.sdpMid,
        sdpMLineIndex: this.sdpMLineIndex,
        usernameFragment: this.usernameFragment,
      };
    };
  }

  // 6. Firefox: normalize RTCSessionDescription.toJSON
  if (window.RTCSessionDescription && !RTCSessionDescription.prototype.toJSON) {
    RTCSessionDescription.prototype.toJSON = function () {
      return { type: this.type, sdp: this.sdp };
    };
  }
}

// Auto-initialize on import
initWebRTCCompat();