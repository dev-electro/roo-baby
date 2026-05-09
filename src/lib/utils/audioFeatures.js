/**
 * Extract numeric audio features from a Blob for inclusion in the VLM prompt.
 * These complement the visual spectrogram with hard data the model can reason about.
 * Also detects edge cases: silence, noise, clipping, overlapping sounds, music.
 */

const SAMPLE_RATE = 16000;

export async function extractAudioFeatures(blob) {
	const arrayBuffer = await blob.arrayBuffer();
	const audioCtx = new AudioContext();
	try {
		const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
		const data = audioBuffer.getChannelData(0);
		const duration = audioBuffer.duration;
		const sr = audioBuffer.sampleRate;

		// Dominant frequency via autocorrelation
		const { freq: dominantFreq, corrStrength: autoCorrStrength } = findDominantFrequency(data, sr);

		// RMS energy
		let sumSq = 0;
		let maxAbs = 0;
		let clippingSamples = 0;
		for (let i = 0; i < data.length; i++) {
			const abs = Math.abs(data[i]);
			sumSq += data[i] * data[i];
			if (abs > maxAbs) maxAbs = abs;
			if (abs > 0.98) clippingSamples++;
		}
		const rms = Math.sqrt(sumSq / data.length);
		const clippingRatio = clippingSamples / data.length;

		// Zero crossing rate (proxy for pitch)
		let crossings = 0;
		for (let i = 1; i < data.length; i++) {
			if ((data[i] >= 0 && data[i - 1] < 0) || (data[i] < 0 && data[i - 1] >= 0)) {
				crossings++;
			}
		}
		const zcr = crossings / duration;

		// Silence ratio (frames below threshold)
		const frameSize = Math.floor(sr * 0.02); // 20ms frames
		let silentFrames = 0;
		let totalFrames = 0;
		const silenceThreshold = 0.01;
		const frameEnergies = [];
		for (let i = 0; i < data.length; i += frameSize) {
			let frameRms = 0;
			const end = Math.min(i + frameSize, data.length);
			for (let j = i; j < end; j++) frameRms += data[j] * data[j];
			frameRms = Math.sqrt(frameRms / (end - i));
			frameEnergies.push(frameRms);
			if (frameRms < silenceThreshold) silentFrames++;
			totalFrames++;
		}
		const silenceRatio = silentFrames / totalFrames;

		// Energy variability: is energy uniform (noise) or bursty (cry)?
		let energyVariability = 0;
		if (frameEnergies.length > 1) {
			const meanE = frameEnergies.reduce((a, b) => a + b, 0) / frameEnergies.length;
			let eVar = 0;
			for (const e of frameEnergies) eVar += (e - meanE) * (e - meanE);
			const stdDev = Math.sqrt(eVar / frameEnergies.length);
			energyVariability = meanE > 0 ? stdDev / meanE : 0;
		}

		// Energy envelope: ratio of first half energy to second half (onset pattern)
		const mid = Math.floor(data.length / 2);
		let e1 = 0, e2 = 0;
		for (let i = 0; i < mid; i++) e1 += data[i] * data[i];
		for (let i = mid; i < data.length; i++) e2 += data[i] * data[i];
		const onsetRatio = (e1 + e2) > 0 ? e1 / (e1 + e2) : 0.5;

		// Peak frequencies + spectral metrics via simple FFT
		const { peakFreqs, spectralCentroid, spectralSpread, harmonicRatio } = findPeakFrequencies(data, sr, 5);

		// Peak count in cry range (200-1000 Hz) vs total peaks
		const cryPeaks = peakFreqs.filter(f => f >= 200 && f <= 1000).length;
		const cryPeakRatio = peakFreqs.length > 0 ? cryPeaks / peakFreqs.length : 0;

		// EDGE CASE DETECTION -------------------------------------------

		// Silence: very quiet, mostly silent frames
		const isSilent = silenceRatio > 0.85 || rms < 0.002 || (dominantFreq < 50 && rms < 0.005);

		// Clipping: signal hits max amplitude repeatedly (mic overload)
		const isClipping = clippingRatio > 0.05 || maxAbs > 0.999;

		// Too short: no meaningful analysis possible
		const isTooShort = duration < 0.4;

		// Noise (static, fan, hum): weak autocorrelation, broad spectrum, uniform energy
		const isNoise = !isSilent && (
			(autoCorrStrength < 0.15 && rms > 0.002) ||
			(peakFreqs.length > 8 && spectralSpread > 800 && rms < 0.01) ||
			(energyVariability < 0.3 && rms > 0.002 && silenceRatio < 0.6)
		);

		// Not a cry: dominant frequency outside baby cry range (200-1000 Hz)
		const isOutsideCryRange = dominantFreq > 0 && (dominantFreq < 200 || dominantFreq > 1000);

		// Multiple sources: many distinct frequency bands (overlapping sounds)
		const hasMultipleSources = peakFreqs.length >= 4 && cryPeakRatio < 0.5;

		// Music-like: strong harmonic structure at integer multiples
		const isMusicLike = harmonicRatio > 0.6 && peakFreqs.length >= 3 && !isSilent;

		// Low confidence signal: weak autocorrelation + outside cry range + noise-like
		const isLowQualitySignal = autoCorrStrength < 0.2 || (isNoise && !isSilent);

		// Overall problematic detection
		const isProblematic = isSilent || isTooShort || isClipping || isNoise ||
			(isOutsideCryRange && !isSilent);

		return {
			duration: Math.round(duration * 100) / 100,
			dominantFreqHz: Math.round(dominantFreq),
			peakFreqHz: peakFreqs.slice(0, 3),
			rmsEnergy: Math.round(rms * 10000) / 10000,
			zeroCrossRate: Math.round(zcr * 10) / 10,
			silenceRatio: Math.round(silenceRatio * 100) / 100,
			onsetRatio: Math.round(onsetRatio * 100) / 100,
			// Edge case flags
			isSilent,
			isClipping,
			isTooShort,
			isNoise,
			isOutsideCryRange,
			hasMultipleSources,
			isMusicLike,
			isLowQualitySignal,
			isProblematic,
			// Additional metrics for the AI
			autoCorrStrength: Math.round(autoCorrStrength * 100) / 100,
			clippingRatio: Math.round(clippingRatio * 10000) / 10000,
			spectralCentroid: Math.round(spectralCentroid),
			cryPeakRatio: Math.round(cryPeakRatio * 100) / 100,
		};
	} finally {
		await audioCtx.close();
	}
}

function findDominantFrequency(data, sr) {
	const minFreq = 80;
	const maxFreq = 1200;
	const minPeriod = Math.floor(sr / maxFreq);
	const maxPeriod = Math.floor(sr / minFreq);
	if (maxPeriod >= data.length) return { freq: 0, corrStrength: 0 };

	let bestCorr = -Infinity;
	let bestPeriod = minPeriod;
	const N = Math.min(data.length, sr);

	for (let period = minPeriod; period <= maxPeriod && period < N / 2; period++) {
		let corr = 0;
		let count = 0;
		for (let i = 0; i < N - period; i++) {
			corr += data[i] * data[i + period];
			count++;
		}
		corr /= count;
		if (corr > bestCorr) {
			bestCorr = corr;
			bestPeriod = period;
		}
	}

	// Normalize correlation strength
	const zeroLag = (() => {
		let z = 0;
		for (let i = 0; i < N; i++) z += data[i] * data[i];
		return z / N;
	})();
	const corrStrength = zeroLag > 0 ? bestCorr / zeroLag : 0;

	return { freq: sr / bestPeriod, corrStrength };
}

function findPeakFrequencies(data, sr, n) {
	const N = Math.min(data.length, 4096);
	const magnitudes = new Float32Array(N / 2);

	// Apply Hann window
	const window = new Float32Array(N);
	for (let i = 0; i < N; i++) window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (N - 1)));

	for (let k = 0; k < N / 2; k++) {
		let re = 0, im = 0;
		for (let n = 0; n < N; n++) {
			const sample = data[n] * window[n];
			const angle = 2 * Math.PI * k * n / N;
			re += sample * Math.cos(angle);
			im -= sample * Math.sin(angle);
		}
		magnitudes[k] = Math.sqrt(re * re + im * im);
	}

	// Spectral centroid (brightness)
	let totalMag = 0;
	let weightedSum = 0;
	for (let i = 0; i < magnitudes.length; i++) {
		const freq = i * sr / N;
		totalMag += magnitudes[i];
		weightedSum += freq * magnitudes[i];
	}
	const spectralCentroid = totalMag > 0 ? weightedSum / totalMag : 0;

	// Spectral spread (bandwidth)
	let spreadSum = 0;
	for (let i = 0; i < magnitudes.length; i++) {
		const freq = i * sr / N;
		const diff = freq - spectralCentroid;
		spreadSum += magnitudes[i] * diff * diff;
	}
	const spectralSpread = totalMag > 0 ? Math.sqrt(spreadSum / totalMag) : 0;

	// Find top n peaks (local maxima above 80Hz)
	const minBin = Math.floor(80 / (sr / N));
	const peaks = [];

	for (let i = minBin; i < magnitudes.length - 1; i++) {
		if (magnitudes[i] > magnitudes[i - 1] && magnitudes[i] > magnitudes[i + 1]) {
			peaks.push({ freq: Math.round(i * sr / N), mag: magnitudes[i] });
		}
	}

	peaks.sort((a, b) => b.mag - a.mag);
	const topPeaks = peaks.slice(0, n);

	// Harmonic ratio: check if peaks are at integer multiples of the fundamental
	let harmonicRatio = 0;
	if (topPeaks.length >= 2) {
		const fundamental = topPeaks[0].freq;
		if (fundamental > 0) {
			let harmonicMatches = 0;
			for (let i = 1; i < topPeaks.length; i++) {
				const ratio = topPeaks[i].freq / fundamental;
				// Check if near integer multiple (within 8% tolerance)
				const nearest = Math.round(ratio);
				if (nearest >= 2 && nearest <= 6 && Math.abs(ratio - nearest) < 0.08) {
					harmonicMatches++;
				}
			}
			harmonicRatio = harmonicMatches / (topPeaks.length - 1);
		}
	}

	return {
		peakFreqs: topPeaks.map(p => p.freq),
		spectralCentroid,
		spectralSpread,
		harmonicRatio,
	};
}
