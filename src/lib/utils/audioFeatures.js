/**
 * Extract numeric audio features from a Blob for inclusion in the VLM prompt.
 * These complement the visual spectrogram with hard data the model can reason about.
 *
 * Uses the same SAMPLE_RATE (16 kHz) and FFT approach as the spectrogram generator
 * so the numbers are consistent with what the AI sees visually.
 */

const SAMPLE_RATE = 16_000;
const FFT_SIZE    = 4_096;   // bigger FFT for better frequency resolution in features

// ─── Cooley-Tukey in-place radix-2 FFT (shared logic) ────────────────────────
function fftInPlace(re, im) {
	const N = re.length;
	for (let i = 1, j = 0; i < N; i++) {
		let bit = N >> 1;
		for (; j & bit; bit >>= 1) j ^= bit;
		j ^= bit;
		if (i < j) {
			[re[i], re[j]] = [re[j], re[i]];
			[im[i], im[j]] = [im[j], im[i]];
		}
	}
	for (let len = 2; len <= N; len <<= 1) {
		const ang  = -2 * Math.PI / len;
		const wRe  = Math.cos(ang);
		const wIm  = Math.sin(ang);
		for (let i = 0; i < N; i += len) {
			let cRe = 1, cIm = 0;
			for (let j = 0; j < len / 2; j++) {
				const uRe = re[i + j];
				const uIm = im[i + j];
				const vRe = re[i + j + len/2] * cRe - im[i + j + len/2] * cIm;
				const vIm = re[i + j + len/2] * cIm + im[i + j + len/2] * cRe;
				re[i + j]         = uRe + vRe;
				im[i + j]         = uIm + vIm;
				re[i + j + len/2] = uRe - vRe;
				im[i + j + len/2] = uIm - vIm;
				const nRe = cRe * wRe - cIm * wIm;
				cIm = cRe * wIm + cIm * wRe;
				cRe = nRe;
			}
		}
	}
}

// ─── Decode + resample to 16 kHz mono ────────────────────────────────────────
async function decodeAndResample(blob) {
	const buf = await blob.arrayBuffer();
	const tmp = new AudioContext();
	let native;
	try { native = await tmp.decodeAudioData(buf); }
	finally { await tmp.close(); }

	const targetLen = Math.ceil(SAMPLE_RATE * native.duration);
	const offline   = new OfflineAudioContext(1, targetLen, SAMPLE_RATE);
	const src       = offline.createBufferSource();

	if (native.numberOfChannels >= 2) {
		const mono = offline.createBuffer(1, native.length, native.sampleRate);
		const L = native.getChannelData(0);
		const R = native.getChannelData(1);
		const M = mono.getChannelData(0);
		for (let i = 0; i < L.length; i++) M[i] = (L[i] + R[i]) * 0.5;
		src.buffer = mono;
	} else {
		src.buffer = native;
	}
	src.connect(offline.destination);
	src.start();
	const rendered = await offline.startRendering();
	return { data: rendered.getChannelData(0), duration: native.duration, sr: SAMPLE_RATE };
}

// ─── Spectral features via real FFT ──────────────────────────────────────────
function spectralFeatures(data, sr) {
	const N = FFT_SIZE;
	const re = new Float32Array(N);
	const im = new Float32Array(N);

	// Hann-windowed segment from the middle of the recording (most representative)
	const start = Math.max(0, Math.floor((data.length - N) / 2));
	for (let i = 0; i < N; i++) {
		const hann = 0.5 * (1 - Math.cos(2 * Math.PI * i / (N - 1)));
		re[i] = (start + i < data.length ? data[start + i] : 0) * hann;
	}

	fftInPlace(re, im);

	const numBins = N / 2 + 1;
	const mag     = new Float32Array(numBins);
	for (let k = 0; k < numBins; k++) mag[k] = Math.sqrt(re[k] * re[k] + im[k] * im[k]);

	// Spectral centroid
	let totalMag = 0, weightedSum = 0;
	for (let k = 0; k < numBins; k++) {
		const hz = k * sr / N;
		totalMag    += mag[k];
		weightedSum += hz * mag[k];
	}
	const spectralCentroid = totalMag > 0 ? weightedSum / totalMag : 0;

	// Spectral spread (bandwidth)
	let spreadSum = 0;
	for (let k = 0; k < numBins; k++) {
		const hz   = k * sr / N;
		const diff = hz - spectralCentroid;
		spreadSum += mag[k] * diff * diff;
	}
	const spectralSpread = totalMag > 0 ? Math.sqrt(spreadSum / totalMag) : 0;

	// Dominant frequency: highest-magnitude bin above 80 Hz
	let bestMag = 0, bestFreq = 0;
	const minBin = Math.ceil(80 / (sr / N));
	for (let k = minBin; k < numBins; k++) {
		if (mag[k] > bestMag) { bestMag = mag[k]; bestFreq = k * sr / N; }
	}

	// Top-5 peak frequencies (local maxima above 100 Hz, non-adjacent)
	const peaks = [];
	const minPeakBin = Math.ceil(100 / (sr / N));
	for (let k = minPeakBin + 1; k < numBins - 1; k++) {
		if (mag[k] > mag[k - 1] && mag[k] > mag[k + 1] && mag[k] > totalMag / numBins * 2) {
			peaks.push({ freq: Math.round(k * sr / N), mag: mag[k] });
		}
	}
	peaks.sort((a, b) => b.mag - a.mag);
	const topPeaks = peaks.slice(0, 5);

	// Harmonic ratio: check if top peaks are integer multiples of fundamental
	let harmonicRatio = 0;
	if (topPeaks.length >= 2 && topPeaks[0].freq > 0) {
		const f0 = topPeaks[0].freq;
		let matches = 0;
		for (let i = 1; i < topPeaks.length; i++) {
			const ratio   = topPeaks[i].freq / f0;
			const nearest = Math.round(ratio);
			if (nearest >= 2 && nearest <= 6 && Math.abs(ratio - nearest) < 0.08) matches++;
		}
		harmonicRatio = matches / (topPeaks.length - 1);
	}

	// Cry peak ratio: fraction of top peaks in 200–1000 Hz baby cry band
	const cryPeaks = topPeaks.filter(p => p.freq >= 200 && p.freq <= 1000).length;
	const cryPeakRatio = topPeaks.length > 0 ? cryPeaks / topPeaks.length : 0;

	return {
		dominantFreq: Math.round(bestFreq),
		peakFreqs: topPeaks.map(p => p.freq),
		spectralCentroid,
		spectralSpread,
		harmonicRatio,
		cryPeakRatio,
	};
}

// ─── Dominant frequency via autocorrelation (pitch detection) ─────────────────
function dominantFreqAutocorr(data, sr) {
	const minFreq = 80, maxFreq = 1_200;
	const minPeriod = Math.floor(sr / maxFreq);
	const maxPeriod = Math.floor(sr / minFreq);
	if (maxPeriod >= data.length) return { freq: 0, corrStrength: 0 };

	// Use first 1-second window only
	const N = Math.min(data.length, sr);

	let bestCorr = -Infinity, bestPeriod = minPeriod;
	for (let period = minPeriod; period <= maxPeriod && period < N / 2; period++) {
		let corr = 0;
		const count = N - period;
		for (let i = 0; i < count; i++) corr += data[i] * data[i + period];
		corr /= count;
		if (corr > bestCorr) { bestCorr = corr; bestPeriod = period; }
	}

	// Zero-lag energy for normalisation
	let zeroLag = 0;
	for (let i = 0; i < N; i++) zeroLag += data[i] * data[i];
	zeroLag /= N;

	return { freq: sr / bestPeriod, corrStrength: zeroLag > 0 ? bestCorr / zeroLag : 0 };
}

// ─── Main export ──────────────────────────────────────────────────────────────
/**
 * Extract numeric features from an audio Blob.
 * Resamples to 16 kHz mono (same as spectrogram generator) for consistency.
 *
 * @param {Blob} blob
 */
export async function extractAudioFeatures(blob) {
	const { data, duration, sr } = await decodeAndResample(blob);

	// ── Time-domain stats ──────────────────────────────────────────────────────
	let sumSq = 0, maxAbs = 0, clippingSamples = 0;
	for (let i = 0; i < data.length; i++) {
		const abs = Math.abs(data[i]);
		sumSq += data[i] * data[i];
		if (abs > maxAbs) maxAbs = abs;
		if (abs > 0.98) clippingSamples++;
	}
	const rms           = Math.sqrt(sumSq / data.length);
	const clippingRatio = clippingSamples / data.length;

	// Zero crossing rate (pitch proxy)
	let crossings = 0;
	for (let i = 1; i < data.length; i++) {
		if ((data[i] >= 0) !== (data[i - 1] >= 0)) crossings++;
	}
	const zcr = crossings / duration;

	// Silence ratio (20 ms frames below threshold)
	const frameSize = Math.floor(sr * 0.02);
	let silentFrames = 0, totalFrames = 0;
	const frameEnergies = [];
	for (let i = 0; i < data.length; i += frameSize) {
		let frameRms = 0;
		const end = Math.min(i + frameSize, data.length);
		for (let j = i; j < end; j++) frameRms += data[j] * data[j];
		frameRms = Math.sqrt(frameRms / (end - i));
		frameEnergies.push(frameRms);
		if (frameRms < 0.01) silentFrames++;
		totalFrames++;
	}
	const silenceRatio = silentFrames / totalFrames;

	// Energy variability (uniform = noise, bursty = cry)
	let energyVariability = 0;
	if (frameEnergies.length > 1) {
		const meanE = frameEnergies.reduce((a, b) => a + b, 0) / frameEnergies.length;
		let eVar = 0;
		for (const e of frameEnergies) eVar += (e - meanE) ** 2;
		const stdDev = Math.sqrt(eVar / frameEnergies.length);
		energyVariability = meanE > 0 ? stdDev / meanE : 0;
	}

	// Onset ratio (first-half vs second-half energy)
	const mid = Math.floor(data.length / 2);
	let e1 = 0, e2 = 0;
	for (let i = 0; i < mid; i++) e1 += data[i] * data[i];
	for (let i = mid; i < data.length; i++) e2 += data[i] * data[i];
	const onsetRatio = (e1 + e2) > 0 ? e1 / (e1 + e2) : 0.5;

	// ── Spectral features via real FFT ─────────────────────────────────────────
	const spectral = spectralFeatures(data, sr);

	// ── Pitch via autocorrelation ──────────────────────────────────────────────
	const { freq: dominantFreq, corrStrength: autoCorrStrength } = dominantFreqAutocorr(data, sr);

	// Use autocorrelation freq if spectral centroid is unreliable (noisy)
	const finalDominantFreq = autoCorrStrength > 0.2 ? dominantFreq : spectral.dominantFreq;

	// ── Edge-case detection ────────────────────────────────────────────────────
	const isSilent   = silenceRatio > 0.85 || rms < 0.002;
	const isClipping = clippingRatio > 0.05 || maxAbs > 0.999;
	const isTooShort = duration < 0.4;
	const isNoise    = !isSilent && (
		(autoCorrStrength < 0.15 && rms > 0.002) ||
		(spectral.spectralSpread > 800 && rms < 0.01) ||
		(energyVariability < 0.3 && rms > 0.002 && silenceRatio < 0.6)
	);
	const isOutsideCryRange  = finalDominantFreq > 0 && (finalDominantFreq < 200 || finalDominantFreq > 1_000);
	const hasMultipleSources = spectral.peakFreqs.length >= 4 && spectral.cryPeakRatio < 0.5;
	const isMusicLike        = spectral.harmonicRatio > 0.6 && spectral.peakFreqs.length >= 3 && !isSilent;
	const isLowQualitySignal = autoCorrStrength < 0.2 || (isNoise && !isSilent);
	const isProblematic      = isSilent || isTooShort || isClipping || isNoise ||
	                           (isOutsideCryRange && !isSilent);

	return {
		duration:         Math.round(duration * 100) / 100,
		dominantFreqHz:   Math.round(finalDominantFreq),
		peakFreqHz:       spectral.peakFreqs.slice(0, 3),
		rmsEnergy:        Math.round(rms * 10_000) / 10_000,
		zeroCrossRate:    Math.round(zcr * 10) / 10,
		silenceRatio:     Math.round(silenceRatio * 100) / 100,
		onsetRatio:       Math.round(onsetRatio * 100) / 100,
		// Edge-case flags
		isSilent,
		isClipping,
		isTooShort,
		isNoise,
		isOutsideCryRange,
		hasMultipleSources,
		isMusicLike,
		isLowQualitySignal,
		isProblematic,
		// Extra metrics for AI
		autoCorrStrength: Math.round(autoCorrStrength * 100) / 100,
		clippingRatio:    Math.round(clippingRatio * 10_000) / 10_000,
		spectralCentroid: Math.round(spectral.spectralCentroid),
		cryPeakRatio:     Math.round(spectral.cryPeakRatio * 100) / 100,
	};
}
