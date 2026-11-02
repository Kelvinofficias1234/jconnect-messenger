import React, { useEffect, useRef } from 'react';

// Memoized video player — prevents call-duration timer state updates
// from triggering DOM repaints of the <video> element, which fills RAM
// and crashes mobile tabs ("Aw, Snap!") after ~2 minutes of video calls.
const VideoPlayer = React.memo(function VideoPlayer({ stream, className, muted = false }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && stream && ref.current.srcObject !== stream) {
      const el = ref.current;
      el.srcObject = stream;
      // Start muted to guarantee autoplay across all browsers,
      // then unmute once playback begins (only for remote streams).
      el.muted = true;
      el.play().then(() => {
        if (!muted) el.muted = false;
      }).catch(() => {
        el.muted = true;
        el.play().catch(() => {});
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream]); // Only re-attach when the stream reference changes — never on timer ticks

  return <video ref={ref} autoPlay playsInline muted={muted} className={className} />;
});

export default VideoPlayer;