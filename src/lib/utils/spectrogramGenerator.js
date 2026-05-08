/**
 * Generate mel spectrogram PNG from audio Blob using Web Audio API + Canvas.
 * Used to convert baby cry audio into a visual representation that VLMs can analyze.
 */

const SPECTROGRAM_WIDTH = 512;
const SPECTROGRAM_HEIGHT = 256;
const MEL_BANDS = 128;
const SAMPLE_RATE = 16000;
const FFT_SIZE = 2048;
const HOP_SIZE = 512;

/**
 * Decode audio blob to Float32Array at 16kHz mono
 */
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

/**
 * Compute STFT magnitude spectrogram
 */
function computeSpectrogram(samples) {
	const numFrames = Math.floor((samples.length - FFT_SIZE) / HOP_SIZE) + 1;
	const window = hannWindow(FFT_SIZE);
	const magnitudes = new Float32Array(numFrames * MEL_BANDS);

	for (let frame = 0; frame < numFrames; frame++) {
		const offset = frame * HOP_SIZE;
		const fftInput = new Float32Array(FFT_SIZE);
		for (let i = 0; i < FFT_SIZE; i++) {
			fftInput[i] = (offset + i < samples.length ? samples[offset + i] : 0) * window[i];
		}
		const spectrum = realFFT(fftInput);
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

function realFFT(input) {
	const N = input.length;
	const real = new Float32Array(N / 2 + 1);
	const imag = new Float32Array(N / 2 + 1);
	for (let k = 0; k <= N / 2; k++) {
		let re = 0, im = 0;
		for (let n = 0; n < N; n++) {
			const angle = 2 * Math.PI * k * n / N;
			re += input[n] * Math.cos(angle);
			im -= input[n] * Math.sin(angle);
		}
		real[k] = re;
		imag[k] = im;
	}
	const magnitudes = new Float32Array(N / 2 + 1);
	for (let k = 0; k <= N / 2; k++) {
		magnitudes[k] = Math.sqrt(real[k] * real[k] + imag[k] * imag[k]);
	}
	return magnitudes;
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

/**
 * Render spectrogram to a PNG Blob using OffscreenCanvas
 */
function renderSpectrogramPNG(magnitudes, numFrames) {
	const canvas = new OffscreenCanvas(SPECTROGRAM_WIDTH, SPECTROGRAM_HEIGHT);
	const ctx = canvas.getContext('2d');

	const vMin = -8;
	const vMax = 0;

	ctx.fillStyle = '#000';
	ctx.fillRect(0, 0, SPECTROGRAM_WIDTH, SPECTROGRAM_HEIGHT);

	const xScale = SPECTROGRAM_WIDTH / numFrames;
	const yScale = SPECTROGRAM_HEIGHT / MEL_BANDS;

	for (let frame = 0; frame < numFrames; frame++) {
		for (let bin = 0; bin < MEL_BANDS; bin++) {
			const val = magnitudes[frame * MEL_BANDS + bin];
			const normalized = Math.max(0, Math.min(1, (val - vMin) / (vMax - vMin)));
			ctx.fillStyle = magmaColor(normalized);
			ctx.fillRect(
				Math.floor(frame * xScale),
				SPECTROGRAM_HEIGHT - Math.floor((bin + 1) * yScale),
				Math.ceil(xScale) + 1,
				Math.ceil(yScale) + 1
			);
		}
	}

	return canvas.convertToBlob({ type: 'image/png' });
}

function magmaColor(t) {
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
	if (t <= 0) return `rgb(${Math.round(stops[0][1]*255)},${Math.round(stops[0][2]*255)},${Math.round(stops[0][3]*255)})`;
	if (t >= 1) return `rgb(${Math.round(stops[7][1]*255)},${Math.round(stops[7][2]*255)},${Math.round(stops[7][3]*255)})`;

	let lo = stops[0], hi = stops[stops.length - 1];
	for (let i = 0; i < stops.length - 1; i++) {
		if (t >= stops[i][0] && t <= stops[i + 1][0]) {
			lo = stops[i];
			hi = stops[i + 1];
			break;
		}
	}
	const f = (t - lo[0]) / (hi[0] - lo[0] || 1);
	const r = Math.round((lo[1] + f * (hi[1] - lo[1])) * 255);
	const g = Math.round((lo[2] + f * (hi[2] - lo[2])) * 255);
	const b = Math.round((lo[3] + f * (hi[3] - lo[3])) * 255);
	return `rgb(${r},${g},${b})`;
}

/**
 * Main entry: generate spectrogram PNG blob from audio blob
 * @param {Blob} audioBlob - Audio recording blob
 * @returns {Promise<Blob>} - Spectrogram PNG blob
 */
export async function generateSpectrogram(audioBlob) {
	const samples = await decodeAudio(audioBlob);
	const { magnitudes, numFrames } = computeSpectrogram(samples);
	return renderSpectrogramPNG(magnitudes, numFrames);
}

/**
 * Generate spectrogram as base64 data URL
 * @param {Blob} audioBlob
 * @returns {Promise<string>} - data:image/png;base64,...
 */
export async function generateSpectrogramDataURL(audioBlob) {
	const pngBlob = await generateSpectrogram(audioBlob);
	return new Promise((resolve) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result);
		reader.readAsDataURL(pngBlob);
	});
}