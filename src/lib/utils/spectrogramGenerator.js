/**
 * Generate mel spectrogram PNG from audio Blob using Web Audio API + Canvas.
 * Used to convert baby cry audio into a visual representation that VLMs can analyze.
 * Falls back to regular Canvas if OffscreenCanvas is unavailable.
 */

import { fft } from './fft.js';

const SPECTROGRAM_WIDTH = 1024;
const SPECTROGRAM_HEIGHT = 512;
const LABEL_MARGIN_LEFT = 48;
const LABEL_MARGIN_BOTTOM = 24;
const SPECTROGRAM_PLOT_W = SPECTROGRAM_WIDTH - LABEL_MARGIN_LEFT;
const SPECTROGRAM_PLOT_H = SPECTROGRAM_HEIGHT - LABEL_MARGIN_BOTTOM;
const MEL_BANDS = 256;
const SAMPLE_RATE = 16000;
const FFT_SIZE = 4096;
const HOP_SIZE = 256;

async function decodeAudio(blob) {
	const arrayBuffer = await blob.arrayBuffer();
	const audioCtx = new AudioContext();
	try {
		const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
		const duration = audioBuffer.duration;
		const offlineCtx = new OfflineAudioContext(1, Math.ceil(SAMPLE_RATE * duration), SAMPLE_RATE);
		const source = offlineCtx.createBufferSource();
		if (audioBuffer.numberOfChannels >= 2) {
			const monoBuffer = offlineCtx.createBuffer(1, audioBuffer.length, audioBuffer.sampleRate);
			const left = audioBuffer.getChannelData(0);
			const right = audioBuffer.getChannelData(1);
			const mono = monoBuffer.getChannelData(0);
			for (let i = 0; i < audioBuffer.length; i++) mono[i] = (left[i] + right[i]) * 0.5;
			source.buffer = monoBuffer;
		} else {
			source.buffer = audioBuffer;
		}
		source.connect(offlineCtx.destination);
		source.start();
		const resampled = await offlineCtx.startRendering();
		return resampled.getChannelData(0);
	} finally {
		await audioCtx.close();
	}
}

function computeSpectrogram(samples) {
	const numFrames = Math.max(1, Math.floor((samples.length - FFT_SIZE) / HOP_SIZE) + 1);
	const window = hannWindow(FFT_SIZE);
	const magnitudes = new Float32Array(numFrames * MEL_BANDS);

	for (let frame = 0; frame < numFrames; frame++) {
		const offset = frame * HOP_SIZE;
		const fftInput = new Float32Array(FFT_SIZE);
		for (let i = 0; i < FFT_SIZE; i++) {
			fftInput[i] = (offset + i < samples.length ? samples[offset + i] : 0) * window[i];
		}
		const spectrum = fft(fftInput);
		const melSpectrum = applyMelFilterbank(spectrum);
		for (let bin = 0; bin < MEL_BANDS; bin++) {
			magnitudes[frame * MEL_BANDS + bin] = melSpectrum[bin];
		}
	}

	return { magnitudes, numFrames };
}

function hannWindow(size) {
	const w = new Float32Array(size);
	for (let i = 0; i < size; i++) w[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (size - 1)));
	return w;
}

function applyMelFilterbank(spectrum) {
	const numBins = spectrum.length;
	const melMin = hzToMel(80);
	const melMax = hzToMel(SAMPLE_RATE / 2);
	const melPoints = new Float32Array(MEL_BANDS + 2);
	for (let i = 0; i < MEL_BANDS + 2; i++) {
		melPoints[i] = melMin + (melMax - melMin) * i / (MEL_BANDS + 1);
	}
	const binPoints = new Float32Array(MEL_BANDS + 2);
	for (let i = 0; i < MEL_BANDS + 2; i++) {
		binPoints[i] = melToHz(melPoints[i]) / (SAMPLE_RATE / 2) * (numBins - 1);
	}

	const melSpectrum = new Float32Array(MEL_BANDS);
	for (let band = 0; band < MEL_BANDS; band++) {
		const fLeft = binPoints[band];
		const fCenter = binPoints[band + 1];
		const fRight = binPoints[band + 2];
		let sum = 0;
		for (let k = Math.floor(fLeft); k <= Math.ceil(fRight); k++) {
			if (k < 0 || k >= numBins) continue;
			let weight = 0;
			if (k >= fLeft && k <= fCenter) weight = (k - fLeft) / (fCenter - fLeft + 1e-10);
			else if (k > fCenter && k <= fRight) weight = (fRight - k) / (fRight - fCenter + 1e-10);
			sum += spectrum[k] * weight;
		}
		melSpectrum[band] = Math.log(sum + 1e-10);
	}
	return melSpectrum;
}

function hzToMel(hz) { return 2595 * Math.log10(1 + hz / 700); }
function melToHz(mel) { return 700 * (Math.pow(10, mel / 2595) - 1); }

function getMagmaRGB(t) {
	const stops = [
		[0.0, 0.001, 0.001, 0.014],
		[0.14, 0.117, 0.067, 0.396],
		[0.29, 0.416, 0.075, 0.498],
		[0.43, 0.643, 0.243, 0.396],
		[0.57, 0.860, 0.478, 0.188],
		[0.71, 0.976, 0.753, 0.094],
		[0.86, 0.988, 0.976, 0.361],
		[1.0, 0.987, 0.991, 0.750],
	];
	if (t <= 0) return [Math.round(stops[0][1]*255), Math.round(stops[0][2]*255), Math.round(stops[0][3]*255)];
	if (t >= 1) return [Math.round(stops[7][1]*255), Math.round(stops[7][2]*255), Math.round(stops[7][3]*255)];

	let lo = stops[0], hi = stops[stops.length - 1];
	for (let i = 0; i < stops.length - 1; i++) {
		if (t >= stops[i][0] && t <= stops[i + 1][0]) {
			lo = stops[i];
			hi = stops[i + 1];
			break;
		}
	}
	const f = (t - lo[0]) / (hi[0] - lo[0] || 1);
	return [
		Math.round((lo[1] + f * (hi[1] - lo[1])) * 255),
		Math.round((lo[2] + f * (hi[2] - lo[2])) * 255),
		Math.round((lo[3] + f * (hi[3] - lo[3])) * 255)
	];
}

function magmaColor(t) {
	const [r, g, b] = getMagmaRGB(t);
	return `rgb(${r},${g},${b})`;
}

function drawLabels(ctx, w, h, plotW, plotH, offsetX, offsetY, duration) {
	const freqLabels = [200, 400, 600, 800];
	const freqYPositions = freqLabels.map(f => offsetY + plotH - (f / 8000) * plotH);

	ctx.fillStyle = '#999';
	ctx.font = '10px monospace';
	ctx.textAlign = 'right';
	ctx.textBaseline = 'middle';
	for (let i = 0; i < freqLabels.length; i++) {
		if (freqYPositions[i] >= offsetY && freqYPositions[i] <= offsetY + plotH) {
			ctx.fillText(`${freqLabels[i]}`, offsetX - 4, freqYPositions[i]);
			ctx.strokeStyle = 'rgba(255,255,255,0.08)';
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(offsetX, freqYPositions[i]);
			ctx.lineTo(offsetX + plotW, freqYPositions[i]);
			ctx.stroke();
		}
	}

	ctx.textAlign = 'center';
	ctx.textBaseline = 'top';
	ctx.fillStyle = '#999';
	ctx.fillText('Hz', offsetX - 4, offsetY);
	if (duration > 0) {
		for (let t = 0; t <= duration; t += Math.ceil(duration / 5) || 1) {
			const x = offsetX + (t / duration) * plotW;
			ctx.fillText(`${t}s`, x, offsetY + plotH + 3);
		}
	}
}

function renderSpectrogramCanvas(magnitudes, numFrames) {
	const canvas = document.createElement('canvas');
	canvas.width = SPECTROGRAM_WIDTH;
	canvas.height = SPECTROGRAM_HEIGHT;
	const ctx = canvas.getContext('2d');

	const vMin = -8;
	const vMax = 0;

	ctx.fillStyle = '#0a0a14';
	ctx.fillRect(0, 0, SPECTROGRAM_WIDTH, SPECTROGRAM_HEIGHT);

	// Create a small data canvas for the heatmap
	const dataCanvas = document.createElement('canvas');
	dataCanvas.width = numFrames;
	dataCanvas.height = MEL_BANDS;
	const dataCtx = dataCanvas.getContext('2d');
	const imgData = dataCtx.createImageData(numFrames, MEL_BANDS);

	for (let frame = 0; frame < numFrames; frame++) {
		for (let bin = 0; bin < MEL_BANDS; bin++) {
			const val = magnitudes[frame * MEL_BANDS + bin];
			const normalized = Math.max(0, Math.min(1, (val - vMin) / (vMax - vMin)));
			const [r, g, b] = getMagmaRGB(normalized);
			
			// ImageData is top-to-bottom, mel bands are bottom-to-top
			const y = MEL_BANDS - 1 - bin;
			const idx = (y * numFrames + frame) * 4;
			imgData.data[idx] = r;
			imgData.data[idx + 1] = g;
			imgData.data[idx + 2] = b;
			imgData.data[idx + 3] = 255;
		}
	}
	dataCtx.putImageData(imgData, 0, 0);

	// Scale up to main canvas
	ctx.imageSmoothingEnabled = false;
	ctx.drawImage(dataCanvas, LABEL_MARGIN_LEFT, 0, SPECTROGRAM_PLOT_W, SPECTROGRAM_PLOT_H);

	const duration = (numFrames * HOP_SIZE) / SAMPLE_RATE;
	drawLabels(ctx, SPECTROGRAM_WIDTH, SPECTROGRAM_HEIGHT, SPECTROGRAM_PLOT_W, SPECTROGRAM_PLOT_H, LABEL_MARGIN_LEFT, 0, duration);

	return new Promise((resolve) => {
		canvas.toBlob((blob) => resolve(blob), 'image/webp', 0.92);
	});
}

function renderSpectrogramOffscreen(magnitudes, numFrames) {
	const canvas = new OffscreenCanvas(SPECTROGRAM_WIDTH, SPECTROGRAM_HEIGHT);
	const ctx = canvas.getContext('2d');

	const vMin = -8;
	const vMax = 0;

	ctx.fillStyle = '#0a0a14';
	ctx.fillRect(0, 0, SPECTROGRAM_WIDTH, SPECTROGRAM_HEIGHT);

	// Create a small data canvas for the heatmap
	const dataCanvas = new OffscreenCanvas(numFrames, MEL_BANDS);
	const dataCtx = dataCanvas.getContext('2d');
	const imgData = dataCtx.createImageData(numFrames, MEL_BANDS);

	for (let frame = 0; frame < numFrames; frame++) {
		for (let bin = 0; bin < MEL_BANDS; bin++) {
			const val = magnitudes[frame * MEL_BANDS + bin];
			const normalized = Math.max(0, Math.min(1, (val - vMin) / (vMax - vMin)));
			const [r, g, b] = getMagmaRGB(normalized);
			
			const y = MEL_BANDS - 1 - bin;
			const idx = (y * numFrames + frame) * 4;
			imgData.data[idx] = r;
			imgData.data[idx + 1] = g;
			imgData.data[idx + 2] = b;
			imgData.data[idx + 3] = 255;
		}
	}
	dataCtx.putImageData(imgData, 0, 0);

	// Scale up to main canvas
	ctx.imageSmoothingEnabled = false;
	ctx.drawImage(dataCanvas, LABEL_MARGIN_LEFT, 0, SPECTROGRAM_PLOT_W, SPECTROGRAM_PLOT_H);

	const duration = (numFrames * HOP_SIZE) / SAMPLE_RATE;
	drawLabels(ctx, SPECTROGRAM_WIDTH, SPECTROGRAM_HEIGHT, SPECTROGRAM_PLOT_W, SPECTROGRAM_PLOT_H, LABEL_MARGIN_LEFT, 0, duration);

	return canvas.convertToBlob({ type: 'image/webp', quality: 0.92 });
}

/**
 * Main entry: generate spectrogram PNG blob from audio blob
 * Falls back from OffscreenCanvas to regular Canvas for Safari compatibility
 */
export async function generateSpectrogram(audioBlob) {
	const samples = await decodeAudio(audioBlob);
	const { magnitudes, numFrames } = computeSpectrogram(samples);

	try {
		if (typeof OffscreenCanvas !== 'undefined') {
			return await renderSpectrogramOffscreen(magnitudes, numFrames);
		}
	} catch {}

	return await renderSpectrogramCanvas(magnitudes, numFrames);
}

export async function generateSpectrogramDataURL(audioBlob) {
	const pngBlob = await generateSpectrogram(audioBlob);
	if (!pngBlob) return null;
	return new Promise((resolve) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result);
		reader.onerror = () => resolve(null);
		reader.readAsDataURL(pngBlob);
	});
}