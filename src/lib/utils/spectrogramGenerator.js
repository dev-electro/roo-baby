/**
 * Real-time Mel Spectrogram Generator — ROO Baby Cry Analyzer
 *
 * Pipeline:
 *  1. Decode audio blob → mono PCM via Web Audio API
 *  2. Resample to SAMPLE_RATE (16 kHz) via OfflineAudioContext
 *  3. Per-frame: Hann window → in-place Cooley-Tukey FFT → power spectrum
 *  4. Apply 128-band Mel filterbank (80 Hz – 8 000 Hz)
 *  5. Log10 power + per-spectrogram PCEN-style contrast normalisation
 *  6. Magma colormap → ImageData → OffscreenCanvas / regular Canvas
 *  7. Axis labels with correct Hz scale
 */

// ─── Constants ────────────────────────────────────────────────────────────────
const SAMPLE_RATE   = 16_000;   // resample target
const FFT_SIZE      = 2_048;    // power of 2, gives 23 Hz/bin at 16 kHz
const HOP_SIZE      = 160;      // 10 ms hop (160 samples @ 16 kHz)
const MEL_BANDS     = 128;      // standard mel bank size
const F_MIN         = 80;       // Hz, skip hum / DC
const F_MAX         = 8_000;    // Hz, Nyquist @ 16 kHz
const IMG_W         = 1024;     // output canvas width
const IMG_H         = 512;      // output canvas height
const PAD_LEFT      = 52;       // px for frequency axis labels
const PAD_BOTTOM    = 26;       // px for time axis labels
const PLOT_W        = IMG_W - PAD_LEFT;
const PLOT_H        = IMG_H - PAD_BOTTOM;

// ─── Mel scale helpers ────────────────────────────────────────────────────────
const hzToMel  = hz  => 2595 * Math.log10(1 + hz / 700);
const melToHz  = mel => 700  * (10 ** (mel / 2595) - 1);

// ─── Hann window (cached) ─────────────────────────────────────────────────────
const HANN = new Float32Array(FFT_SIZE);
for (let i = 0; i < FFT_SIZE; i++) {
	HANN[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (FFT_SIZE - 1)));
}

// ─── Pre-compute Mel filterbank weights (one-time cost) ──────────────────────
function buildMelFilterbank() {
	const numBins = FFT_SIZE / 2 + 1;
	const melMin  = hzToMel(F_MIN);
	const melMax  = hzToMel(F_MAX);

	// MEL_BANDS + 2 centre points equally spaced in mel
	const melPts = new Float32Array(MEL_BANDS + 2);
	for (let i = 0; i < MEL_BANDS + 2; i++) {
		melPts[i] = melMin + (melMax - melMin) * i / (MEL_BANDS + 1);
	}

	// Convert centre points back to FFT bin indices
	const binPts = new Float32Array(MEL_BANDS + 2);
	for (let i = 0; i < MEL_BANDS + 2; i++) {
		binPts[i] = melToHz(melPts[i]) / (SAMPLE_RATE / 2) * (numBins - 1);
	}

	// Sparse weights: for each mel band, [startBin, endBin, Float32Array of weights]
	/** @type {Array<{start: number, end: number, w: Float32Array}>} */
	const filters = [];
	for (let band = 0; band < MEL_BANDS; band++) {
		const fL = binPts[band];
		const fC = binPts[band + 1];
		const fR = binPts[band + 2];
		const start = Math.max(0, Math.floor(fL));
		const end   = Math.min(numBins - 1, Math.ceil(fR));
		const len   = end - start + 1;
		const w     = new Float32Array(len);
		for (let j = 0; j < len; j++) {
			const k = start + j;
			if (k >= fL && k <= fC) w[j] = (k - fL) / (fC - fL + 1e-10);
			else if (k > fC && k <= fR) w[j] = (fR - k) / (fR - fC + 1e-10);
		}
		filters.push({ start, end, w });
	}
	return filters;
}

const MEL_FILTERS = buildMelFilterbank();

// ─── Cooley-Tukey in-place radix-2 FFT ───────────────────────────────────────
function fftInPlace(re, im) {
	const N = re.length;
	// Bit-reverse permutation
	for (let i = 1, j = 0; i < N; i++) {
		let bit = N >> 1;
		for (; j & bit; bit >>= 1) j ^= bit;
		j ^= bit;
		if (i < j) {
			[re[i], re[j]] = [re[j], re[i]];
			[im[i], im[j]] = [im[j], im[i]];
		}
	}
	// Butterfly stages
	for (let len = 2; len <= N; len <<= 1) {
		const ang = -2 * Math.PI / len;
		const wRe = Math.cos(ang);
		const wIm = Math.sin(ang);
		for (let i = 0; i < N; i += len) {
			let curRe = 1, curIm = 0;
			for (let j = 0; j < len / 2; j++) {
				const uRe = re[i + j];
				const uIm = im[i + j];
				const vRe = re[i + j + len/2] * curRe - im[i + j + len/2] * curIm;
				const vIm = re[i + j + len/2] * curIm + im[i + j + len/2] * curRe;
				re[i + j]         = uRe + vRe;
				im[i + j]         = uIm + vIm;
				re[i + j + len/2] = uRe - vRe;
				im[i + j + len/2] = uIm - vIm;
				const nextRe = curRe * wRe - curIm * wIm;
				curIm = curRe * wIm + curIm * wRe;
				curRe = nextRe;
			}
		}
	}
}

// ─── Audio decode + resample ──────────────────────────────────────────────────
async function decodeAndResample(blob) {
	const arrayBuffer = await blob.arrayBuffer();
	// Decode at native rate first
	const tmp = new AudioContext();
	let nativeBuf;
	try {
		nativeBuf = await tmp.decodeAudioData(arrayBuffer);
	} finally {
		await tmp.close();
	}

	const duration  = nativeBuf.duration;
	const targetLen = Math.ceil(SAMPLE_RATE * duration);

	// OfflineAudioContext handles resampling natively
	const offline = new OfflineAudioContext(1, targetLen, SAMPLE_RATE);
	const src = offline.createBufferSource();

	// Downmix to mono if stereo
	if (nativeBuf.numberOfChannels >= 2) {
		const mono = offline.createBuffer(1, nativeBuf.length, nativeBuf.sampleRate);
		const L = nativeBuf.getChannelData(0);
		const R = nativeBuf.getChannelData(1);
		const M = mono.getChannelData(0);
		for (let i = 0; i < L.length; i++) M[i] = (L[i] + R[i]) * 0.5;
		src.buffer = mono;
	} else {
		src.buffer = nativeBuf;
	}

	src.connect(offline.destination);
	src.start();
	const resampled = await offline.startRendering();
	return resampled.getChannelData(0);
}

// ─── Core spectrogram computation ────────────────────────────────────────────
/**
 * @param {Float32Array} samples
 * @returns {{ logMel: Float32Array, numFrames: number, duration: number }}
 */
function computeMelSpectrogram(samples) {
	const duration  = samples.length / SAMPLE_RATE;
	const numFrames = Math.max(1, Math.floor((samples.length - FFT_SIZE) / HOP_SIZE) + 1);

	const re  = new Float32Array(FFT_SIZE);
	const im  = new Float32Array(FFT_SIZE);
	const logMel = new Float32Array(numFrames * MEL_BANDS);

	for (let frame = 0; frame < numFrames; frame++) {
		const offset = frame * HOP_SIZE;

		// Apply Hann window
		re.fill(0); im.fill(0);
		for (let i = 0; i < FFT_SIZE; i++) {
			re[i] = (offset + i < samples.length ? samples[offset + i] : 0) * HANN[i];
		}

		// In-place FFT
		fftInPlace(re, im);

		// Power spectrum (first N/2+1 bins)
		const numBins = FFT_SIZE / 2 + 1;
		// reuse re array as power — avoids extra allocation
		for (let k = 0; k < numBins; k++) {
			re[k] = re[k] * re[k] + im[k] * im[k];
		}

		// Apply Mel filterbank + log10
		const base = frame * MEL_BANDS;
		for (let band = 0; band < MEL_BANDS; band++) {
			const { start, w } = MEL_FILTERS[band];
			let energy = 0;
			for (let j = 0; j < w.length; j++) energy += re[start + j] * w[j];
			logMel[base + band] = Math.log10(energy + 1e-10);
		}
	}

	return { logMel, numFrames, duration };
}

// ─── Per-spectrogram contrast normalisation ───────────────────────────────────
/**
 * Find 5th and 99th percentile across all values, then normalise to [0,1].
 * Much better than fixed vMin/vMax — works regardless of recording volume.
 */
function normaliseLogMel(logMel) {
	const sorted = Float32Array.from(logMel).sort();
	const lo = sorted[Math.floor(sorted.length * 0.05)];
	const hi = sorted[Math.floor(sorted.length * 0.99)];
	const range = hi - lo || 1;

	const out = new Float32Array(logMel.length);
	for (let i = 0; i < logMel.length; i++) {
		out[i] = Math.max(0, Math.min(1, (logMel[i] - lo) / range));
	}
	return out;
}

// ─── Magma colormap (accurate 8-stop) ────────────────────────────────────────
const MAGMA_STOPS = [
	[0.00, 0.001462, 0.000466, 0.013866],
	[0.14, 0.116712, 0.063536, 0.394390],
	[0.29, 0.417642, 0.074508, 0.497960],
	[0.43, 0.643456, 0.243240, 0.396021],
	[0.57, 0.859614, 0.478729, 0.188367],
	[0.71, 0.976156, 0.753234, 0.094190],
	[0.86, 0.987836, 0.975715, 0.361183],
	[1.00, 0.987053, 0.991438, 0.749504],
];

/**
 * @param {number} t  normalised value in [0, 1]
 * @returns {[number, number, number]}  RGB 0-255
 */
function magma(t) {
	if (t <= 0) return [Math.round(MAGMA_STOPS[0][1]*255), Math.round(MAGMA_STOPS[0][2]*255), Math.round(MAGMA_STOPS[0][3]*255)];
	if (t >= 1) return [Math.round(MAGMA_STOPS[7][1]*255), Math.round(MAGMA_STOPS[7][2]*255), Math.round(MAGMA_STOPS[7][3]*255)];
	for (let i = 0; i < MAGMA_STOPS.length - 1; i++) {
		const lo = MAGMA_STOPS[i], hi = MAGMA_STOPS[i + 1];
		if (t >= lo[0] && t <= hi[0]) {
			const f = (t - lo[0]) / (hi[0] - lo[0]);
			return [
				Math.round((lo[1] + f * (hi[1] - lo[1])) * 255),
				Math.round((lo[2] + f * (hi[2] - lo[2])) * 255),
				Math.round((lo[3] + f * (hi[3] - lo[3])) * 255),
			];
		}
	}
	return [255, 255, 255];
}

// ─── Axis labels ──────────────────────────────────────────────────────────────
/**
 * Draw frequency (Y) and time (X) labels onto the 2D context.
 * Frequency positions are computed via the inverse mel transform so they
 * correctly align with the mel-scaled Y axis.
 */
function drawAxes(ctx, numFrames, duration) {
	ctx.font = '11px ui-monospace, monospace';
	ctx.fillStyle = 'rgba(180,180,200,0.85)';
	ctx.strokeStyle = 'rgba(255,255,255,0.07)';
	ctx.lineWidth = 1;

	// --- Y axis: frequency (mel scale) ---
	// Labels at perceptually meaningful Hz values
	const freqTicks = [100, 250, 500, 1_000, 2_000, 4_000, 8_000];
	const melMin = hzToMel(F_MIN);
	const melMax = hzToMel(F_MAX);

	for (const hz of freqTicks) {
		if (hz < F_MIN || hz > F_MAX) continue;
		// Position on mel axis (0 = bottom, 1 = top)
		const melPos = (hzToMel(hz) - melMin) / (melMax - melMin);
		// In canvas Y: top=0, bottom=PLOT_H
		const y = PLOT_H - melPos * PLOT_H;

		// Gridline
		ctx.beginPath();
		ctx.moveTo(PAD_LEFT, y);
		ctx.lineTo(IMG_W, y);
		ctx.stroke();

		// Label
		const label = hz >= 1000 ? `${hz / 1000}k` : `${hz}`;
		ctx.textAlign = 'right';
		ctx.textBaseline = 'middle';
		ctx.fillText(label, PAD_LEFT - 4, y);
	}

	// Hz unit label (vertical — use rotate trick)
	ctx.save();
	ctx.translate(12, PLOT_H / 2);
	ctx.rotate(-Math.PI / 2);
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillStyle = 'rgba(140,140,160,0.9)';
	ctx.fillText('Hz', 0, 0);
	ctx.restore();

	// --- X axis: time ---
	const stepSec = duration <= 5 ? 1 : duration <= 15 ? 2 : 5;
	ctx.textAlign  = 'center';
	ctx.textBaseline = 'top';
	ctx.fillStyle   = 'rgba(180,180,200,0.85)';

	for (let t = 0; t <= duration; t += stepSec) {
		const x = PAD_LEFT + (t / duration) * PLOT_W;
		ctx.fillText(`${t}s`, x, PLOT_H + 4);
	}

	// border
	ctx.strokeStyle = 'rgba(255,255,255,0.15)';
	ctx.lineWidth   = 1;
	ctx.strokeRect(PAD_LEFT, 0, PLOT_W, PLOT_H);
}

// ─── Render to ImageData (shared by OffscreenCanvas and regular Canvas) ───────
/**
 * @param {Float32Array} norm      normalised magnitudes [0,1] shape [numFrames × MEL_BANDS]
 * @param {number}       numFrames
 * @param {number}       duration  seconds
 * @returns {ImageData}  ready to putImageData into a PLOT_W × PLOT_H canvas
 */
function buildImageData(norm, numFrames) {
	// We render into PLOT_W × PLOT_H pixels
	// Each pixel column maps to a time frame, each row to a mel band
	const imgData = new ImageData(PLOT_W, PLOT_H);

	for (let px = 0; px < PLOT_W; px++) {
		// Which frame does this pixel column correspond to?
		const frame = Math.min(numFrames - 1, Math.floor(px / PLOT_W * numFrames));

		for (let py = 0; py < PLOT_H; py++) {
			// py=0 is top (high freq), py=PLOT_H-1 is bottom (low freq)
			const band = Math.min(MEL_BANDS - 1, Math.floor((1 - py / PLOT_H) * MEL_BANDS));
			const val  = norm[frame * MEL_BANDS + band];
			const [r, g, b] = magma(val);
			const idx = (py * PLOT_W + px) * 4;
			imgData.data[idx]     = r;
			imgData.data[idx + 1] = g;
			imgData.data[idx + 2] = b;
			imgData.data[idx + 3] = 255;
		}
	}
	return imgData;
}

// ─── Canvas renderers ─────────────────────────────────────────────────────────
function renderOnCanvas(norm, numFrames, duration) {
	const canvas = document.createElement('canvas');
	canvas.width  = IMG_W;
	canvas.height = IMG_H;
	const ctx = canvas.getContext('2d', { alpha: false });

	// Background
	ctx.fillStyle = '#07070f';
	ctx.fillRect(0, 0, IMG_W, IMG_H);

	// Heatmap into an ImageData of size PLOT_W × PLOT_H then stamp at (PAD_LEFT, 0)
	const imgData = buildImageData(norm, numFrames);
	ctx.putImageData(imgData, PAD_LEFT, 0);

	drawAxes(ctx, numFrames, duration);

	return new Promise(res => canvas.toBlob(res, 'image/webp', 0.92));
}

function renderOffscreen(norm, numFrames, duration) {
	const canvas = new OffscreenCanvas(IMG_W, IMG_H);
	const ctx    = canvas.getContext('2d', { alpha: false });

	ctx.fillStyle = '#07070f';
	ctx.fillRect(0, 0, IMG_W, IMG_H);

	const imgData = buildImageData(norm, numFrames);
	ctx.putImageData(imgData, PAD_LEFT, 0);

	drawAxes(ctx, numFrames, duration);

	return canvas.convertToBlob({ type: 'image/webp', quality: 0.92 });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generate a mel spectrogram WebP Blob from an audio Blob.
 * This is the spectrogram sent to the AI model AND shown to the user.
 *
 * @param {Blob} audioBlob
 * @returns {Promise<Blob>} WebP image blob
 */
export async function generateSpectrogram(audioBlob) {
	const samples = await decodeAndResample(audioBlob);
	const { logMel, numFrames, duration } = computeMelSpectrogram(samples);
	const norm = normaliseLogMel(logMel);

	try {
		if (typeof OffscreenCanvas !== 'undefined') {
			return await renderOffscreen(norm, numFrames, duration);
		}
	} catch (_) {
		// OffscreenCanvas failed (e.g. Safari with strict settings) — fall through
	}
	return renderOnCanvas(norm, numFrames, duration);
}

/**
 * Generate spectrogram and return as a data: URL string.
 * Useful for img src binding.
 *
 * @param {Blob} audioBlob
 * @returns {Promise<string|null>}
 */
export async function generateSpectrogramDataURL(audioBlob) {
	const blob = await generateSpectrogram(audioBlob);
	if (!blob) return null;
	return new Promise(res => {
		const reader = new FileReader();
		reader.onload  = () => res(/** @type {string} */(reader.result));
		reader.onerror = () => res(null);
		reader.readAsDataURL(blob);
	});
}