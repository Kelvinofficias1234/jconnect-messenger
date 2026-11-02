/**
 * Media compression utility for J-Connect.
 * Compresses images via canvas before upload to reduce bandwidth —
 * critical for low-bandwidth / 2G / Edge connections.
 */

/**
 * Compress an image File to a JPEG/WebP blob at reduced quality and dimensions.
 * @param {File} file - Source image file
 * @param {object} opts
 * @param {number} opts.maxWidth - Max width in px (default 1280)
 * @param {number} opts.maxHeight - Max height in px (default 1280)
 * @param {number} opts.quality - JPEG quality 0–1 (default 0.72)
 * @returns {Promise<File>} Compressed image as a File
 */
export async function compressImage(file, opts = {}) {
  const { maxWidth = 1280, maxHeight = 1280, quality = 0.72 } = opts;

  // Non-image or tiny file — return as-is
  if (!file.type.startsWith('image/') || file.size < 50_000) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      // Scale down if exceeds max dimensions
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          const compressed = new File(
            [blob],
            file.name.replace(/\.(png|webp|heic|heif)$/i, '.jpg'),
            { type: 'image/jpeg' }
          );
          resolve(compressed);
        },
        'image/jpeg',
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

/**
 * Compress an audio blob by re-encoding at a lower bitrate using MediaRecorder.
 * Falls back to the original blob if re-encoding isn't supported.
 * @param {Blob} audioBlob - Original audio blob
 * @returns {Promise<Blob>} Compressed audio blob
 */
export async function compressAudio(audioBlob) {
  // Web audio API downsampling — only if the blob is large (>500KB)
  if (audioBlob.size < 500_000) return audioBlob;
  try {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    // Create offline context at lower sample rate (16kHz for voice)
    const targetRate = 16000;
    const offlineCtx = new OfflineAudioContext(1, Math.ceil(audioBuffer.duration * targetRate), targetRate);
    const source = offlineCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(offlineCtx.destination);
    source.start();
    const rendered = await offlineCtx.startRendering();
    // Convert back to WAV
    const wavBlob = audioBufferToWav(rendered);
    return wavBlob.size < audioBlob.size ? wavBlob : audioBlob;
  } catch {
    return audioBlob;
  }
}

function audioBufferToWav(buffer) {
  const numChannels = 1;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = buffer.length * blockAlign;
  const arrayBuffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(arrayBuffer);
  const channels = buffer.getChannelData(0);

  let offset = 0;
  function writeString(str) { for (let i = 0; i < str.length; i++) view.setUint8(offset++, str.charCodeAt(i)); }
  function writeUint32(val) { view.setUint32(offset, val, true); offset += 4; }
  function writeUint16(val) { view.setUint16(offset, val, true); offset += 2; }

  writeString('RIFF');
  writeUint32(36 + dataSize);
  writeString('WAVE');
  writeString('fmt ');
  writeUint32(16);
  writeUint16(format);
  writeUint16(numChannels);
  writeUint32(sampleRate);
  writeUint32(sampleRate * blockAlign);
  writeUint16(blockAlign);
  writeUint16(bitDepth);
  writeString('data');
  writeUint32(dataSize);

  for (let i = 0; i < channels.length; i++) {
    const s = Math.max(-1, Math.min(1, channels[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
  return new Blob([arrayBuffer], { type: 'audio/wav' });
}