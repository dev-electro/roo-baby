/**
 * Pre-process audio to isolate baby cry frequencies
 * Baby cries = 200Hz to 1200Hz fundamental frequency range
 * This removes: TV audio, adult voices (lower range),
 *               electronic hiss, AC hum, traffic rumble
 */
export async function preprocessAudioBuffer(rawArrayBuffer) {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)({
    sampleRate: 16000 // Resample to 16kHz for consistency
  });

  // Decode raw audio
  const rawBuffer = await audioCtx.decodeAudioData(rawArrayBuffer);

  // Create offline context for processing (non-realtime, fast)
  const offlineCtx = new OfflineAudioContext(
    1,                          // mono
    rawBuffer.duration * 16000, // samples
    16000                       // 16kHz sample rate
  );

  const source = offlineCtx.createBufferSource();
  source.buffer = rawBuffer;

  // Filter 1: High-pass at 180Hz
  // Removes: AC hum (50/60Hz), floor vibration, deep TV audio, rumble
  const highPass = offlineCtx.createBiquadFilter();
  highPass.type = 'highpass';
  highPass.frequency.value = 180;
  highPass.Q.value = 0.7;

  // Filter 2: Low-pass at 1400Hz
  // Removes: High-frequency electronic hiss, radio interference, sibilance
  const lowPass = offlineCtx.createBiquadFilter();
  lowPass.type = 'lowpass';
  lowPass.frequency.value = 1400;
  lowPass.Q.value = 0.7;

  // Filter 3: Notch filter at 50Hz (power line hum, India uses 50Hz)
  const notch50 = offlineCtx.createBiquadFilter();
  notch50.type = 'notch';
  notch50.frequency.value = 50;
  notch50.Q.value = 10;

  // Filter 4: Notch filter at 60Hz (for 60Hz power line environments)
  const notch60 = offlineCtx.createBiquadFilter();
  notch60.type = 'notch';
  notch60.frequency.value = 60;
  notch60.Q.value = 10;

  // Filter 5: Peak boost in cry range (emphasizes baby cry frequencies)
  const cryBoost = offlineCtx.createBiquadFilter();
  cryBoost.type = 'peaking';
  cryBoost.frequency.value = 500; // Center of baby cry range
  cryBoost.gain.value = 4;        // +4dB boost
  cryBoost.Q.value = 1.2;

  // Chain: source → highPass → notch50 → notch60 → lowPass → cryBoost → destination
  source.connect(highPass);
  highPass.connect(notch50);
  notch50.connect(notch60);
  notch60.connect(lowPass);
  lowPass.connect(cryBoost);
  cryBoost.connect(offlineCtx.destination);

  source.start();

  // Render to clean buffer
  const cleanBuffer = await offlineCtx.startRendering();
  return cleanBuffer;
}

/**
 * Detect which segment of audio contains the baby cry
 * Returns: {start, end} in seconds of loudest/most active segment
 */
export function detectCrySegment(audioBuffer) {
  const data = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;
  const windowSize = Math.floor(sampleRate * 0.1); // 100ms windows

  let maxEnergy = 0;
  let maxStart = 0;
  const energies = [];

  // Calculate RMS energy for each 100ms window
  for (let i = 0; i < data.length - windowSize; i += windowSize) {
    let sum = 0;
    for (let j = i; j < i + windowSize; j++) {
      sum += data[j] * data[j];
    }
    const rms = Math.sqrt(sum / windowSize);
    energies.push({ time: i / sampleRate, rms });
    if (rms > maxEnergy) {
      maxEnergy = rms;
      maxStart = i / sampleRate;
    }
  }

  // Find threshold = 30% of max energy
  const threshold = maxEnergy * 0.3;

  // Find continuous segment above threshold
  let segStart = 0;
  let segEnd = audioBuffer.duration;
  let foundStart = false;

  for (const { time, rms } of energies) {
    if (!foundStart && rms > threshold) {
      segStart = Math.max(0, time - 0.2); // 200ms before onset
      foundStart = true;
    }
    if (foundStart && rms > threshold) {
      segEnd = Math.min(audioBuffer.duration, time + 0.5); // 500ms after
    }
  }

  // Ensure minimum 2 seconds of audio
  if (segEnd - segStart < 2.0) {
    segStart = Math.max(0, segStart - 1.0);
    segEnd = Math.min(audioBuffer.duration, segEnd + 1.0);
  }

  return { start: segStart, end: segEnd };
}

/**
 * Extract audio segment and return as new AudioBuffer
 */
export function extractSegment(audioBuffer, start, end) {
  const sampleRate = audioBuffer.sampleRate;
  const startSample = Math.floor(start * sampleRate);
  const endSample = Math.floor(end * sampleRate);
  const length = endSample - startSample;

  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const segmentBuffer = audioCtx.createBuffer(1, length, sampleRate);
  const sourceData = audioBuffer.getChannelData(0);
  const segmentData = segmentBuffer.getChannelData(0);

  for (let i = 0; i < length; i++) {
    segmentData[i] = sourceData[startSample + i];
  }

  return segmentBuffer;
}

/**
 * Encodes an AudioBuffer into a proper WAV Blob
 */
export function audioBufferToWav(audioBuffer) {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const samples = audioBuffer.getChannelData(0);
  const dataLength = samples.length * numChannels * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(buffer);

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  // Write interleaved samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    let sample = Math.max(-1, Math.min(1, samples[i]));
    sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    view.setInt16(offset, sample, true);
    offset += bytesPerSample;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
