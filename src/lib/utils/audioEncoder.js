/**
 * Convert WebM/Opus blob to 16kHz mono WAV using Web Audio API
 * Returns a proper WAV Blob that Gemini API accepts.
 */

/**
 * @param {Blob} blob - Audio blob from MediaRecorder
 * @returns {Promise<Blob>} - WAV blob at 16kHz mono
 */
export async function convertToWav(blob) {
	const arrayBuffer = await blob.arrayBuffer();
	const audioCtx = new AudioContext();
	
	try {
		const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
		
		// Create offline context for 16kHz mono resampling
		const duration = audioBuffer.duration;
		const sampleRate = 16000;
		const numberOfChannels = 1;
		const offlineCtx = new OfflineAudioContext(numberOfChannels, sampleRate * duration, sampleRate);
		
		const source = offlineCtx.createBufferSource();
		// Mix to mono if stereo
		if (audioBuffer.numberOfChannels === 2) {
			const monoBuffer = offlineCtx.createBuffer(1, audioBuffer.length, audioBuffer.sampleRate);
			const left = audioBuffer.getChannelData(0);
			const right = audioBuffer.getChannelData(1);
			const mono = monoBuffer.getChannelData(0);
			for (let i = 0; i < audioBuffer.length; i++) {
				mono[i] = (left[i] + right[i]) * 0.5;
			}
			source.buffer = monoBuffer;
		} else {
			source.buffer = audioBuffer;
		}
		
		source.connect(offlineCtx.destination);
		source.start();
		
		const resampled = await offlineCtx.startRendering();
		const wavBlob = audioBufferToWav(resampled);
		return wavBlob;
	} finally {
		audioCtx.close();
	}
}

/**
 * Check if a MIME type is supported by the Gemini API
 * @param {string} mimeType
 * @returns {boolean}
 */
export function isSupportedAudioFormat(mimeType) {
	const supported = [
		'audio/wav', 'audio/x-wav', 'audio/wave',
		'audio/mpeg', 'audio/mp3',
		'audio/flac', 'audio/x-flac',
		'audio/ogg', 'audio/aac', 'audio/x-m4a', 'audio/mp4'
	];
	return supported.some(t => mimeType?.includes(t));
}

/**
 * Encode AudioBuffer as WAV Blob
 */
function audioBufferToWav(audioBuffer) {
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
