/**
 * Baby cry audio pre-processing pipeline.
 * Layer 1: Filter chain to isolate cry frequencies (200-1200Hz)
 * Layer 2: Voice Activity Detection to extract only the crying segment
 *
 * Removes: TV audio, adult voices, electronic hiss, AC hum, traffic rumble
 * Boosts: Baby cry frequencies in 200-1200Hz range
 */

/**
 * Pre-process audio to isolate baby cry frequencies.
 * Applies high-pass (180Hz), low-pass (1400Hz), dual notch (50/60Hz),
 * and peak boost (500Hz) to clean up background noise.
 */
export async function preprocessAudioBuffer(rawArrayBuffer) {
	const audioCtx = new (window.AudioContext || window.webkitAudioContext)({
		sampleRate: 16000
	});

	let rawBuffer;
	try {
		rawBuffer = await audioCtx.decodeAudioData(rawArrayBuffer.slice(0));
	} catch {
		await audioCtx.close();
		throw new Error('Failed to decode audio');
	}

	const offlineCtx = new OfflineAudioContext(
		1,
		Math.ceil(rawBuffer.duration * 16000),
		16000
	);

	const source = offlineCtx.createBufferSource();
	source.buffer = rawBuffer;

	const highPass = offlineCtx.createBiquadFilter();
	highPass.type = 'highpass';
	highPass.frequency.value = 180;
	highPass.Q.value = 0.7;

	const lowPass = offlineCtx.createBiquadFilter();
	lowPass.type = 'lowpass';
	lowPass.frequency.value = 1400;
	lowPass.Q.value = 0.7;

	const notch50 = offlineCtx.createBiquadFilter();
	notch50.type = 'notch';
	notch50.frequency.value = 50;
	notch50.Q.value = 10;

	const notch60 = offlineCtx.createBiquadFilter();
	notch60.type = 'notch';
	notch60.frequency.value = 60;
	notch60.Q.value = 10;

	const cryBoost = offlineCtx.createBiquadFilter();
	cryBoost.type = 'peaking';
	cryBoost.frequency.value = 500;
	cryBoost.gain.value = 4;
	cryBoost.Q.value = 1.2;

	source.connect(highPass);
	highPass.connect(notch50);
	notch50.connect(notch60);
	notch60.connect(lowPass);
	lowPass.connect(cryBoost);
	cryBoost.connect(offlineCtx.destination);

	source.start();
	const cleanBuffer = await offlineCtx.startRendering();
	await audioCtx.close();
	return cleanBuffer;
}

/**
 * Detect which segment of audio contains the baby cry using energy-based VAD.
 * Returns {start, end} in seconds of the continuous cry segment.
 */
export function detectCrySegment(audioBuffer) {
	const data = audioBuffer.getChannelData(0);
	const sampleRate = audioBuffer.sampleRate;
	const windowSize = Math.floor(sampleRate * 0.1);

	let maxEnergy = 0;
	const energies = [];

	for (let i = 0; i < data.length - windowSize; i += windowSize) {
		let sum = 0;
		for (let j = i; j < i + windowSize; j++) {
			sum += data[j] * data[j];
		}
		const rms = Math.sqrt(sum / windowSize);
		energies.push({ time: i / sampleRate, rms });
		if (rms > maxEnergy) {
			maxEnergy = rms;
		}
	}

	const threshold = maxEnergy * 0.3;
	let segStart = 0;
	let segEnd = audioBuffer.duration;
	let foundStart = false;

	for (const { time, rms } of energies) {
		if (!foundStart && rms > threshold) {
			segStart = Math.max(0, time - 0.2);
			foundStart = true;
		}
		if (foundStart && rms > threshold) {
			segEnd = Math.min(audioBuffer.duration, time + 0.5);
		}
	}

	if (segEnd - segStart < 2.0) {
		segStart = Math.max(0, segStart - 1.0);
		segEnd = Math.min(audioBuffer.duration, segEnd + 1.0);
	}

	return { start: segStart, end: segEnd };
}

/**
 * Extract audio segment as a new AudioBuffer.
 */
export function extractSegment(audioBuffer, start, end) {
	const sampleRate = audioBuffer.sampleRate;
	const startSample = Math.floor(start * sampleRate);
	const endSample = Math.floor(end * sampleRate);
	const length = endSample - startSample;

	const audioCtx = new AudioContext();
	const segmentBuffer = audioCtx.createBuffer(1, length, sampleRate);
	const sourceData = audioBuffer.getChannelData(0);
	const segmentData = segmentBuffer.getChannelData(0);

	for (let i = 0; i < length; i++) {
		segmentData[i] = sourceData[startSample + i];
	}
	audioCtx.close();
	return segmentBuffer;
}

function audioBufferToWav(audioBuffer) {
	const sampleRate = audioBuffer.sampleRate;
	const bitDepth = 16;
	const bytesPerSample = bitDepth / 8;
	const blockAlign = bytesPerSample;
	const samples = audioBuffer.getChannelData(0);
	const dataLength = samples.length * bytesPerSample;
	const buffer = new ArrayBuffer(44 + dataLength);
	const view = new DataView(buffer);

	writeString(view, 0, 'RIFF');
	view.setUint32(4, 36 + dataLength, true);
	writeString(view, 8, 'WAVE');
	writeString(view, 12, 'fmt ');
	view.setUint32(16, 16, true);
	view.setUint16(20, 1, true);
	view.setUint16(22, 1, true);
	view.setUint32(24, sampleRate, true);
	view.setUint32(28, sampleRate * blockAlign, true);
	view.setUint16(32, blockAlign, true);
	view.setUint16(34, bitDepth, true);
	writeString(view, 36, 'data');
	view.setUint32(40, dataLength, true);

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

/**
 * Full pipeline: decode → filter → VAD → extract cry segment → WAV blob.
 */
export async function processAudioBlob(rawBlob) {
	const arrayBuffer = await rawBlob.arrayBuffer();
	const cleanBuffer = await preprocessAudioBuffer(arrayBuffer);
	const { start, end } = detectCrySegment(cleanBuffer);
	const cryBuffer = extractSegment(cleanBuffer, start, end);
	const processedBlob = audioBufferToWav(cryBuffer);

	return {
		processedBlob,
		duration: end - start,
		segmentStart: start,
		segmentEnd: end,
		originalDuration: cleanBuffer.duration
	};
}
