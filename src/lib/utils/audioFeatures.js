/**
 * Extract numeric audio features from a Blob for inclusion in the VLM prompt.
 * These complement the visual spectrogram with hard data the model can reason about.
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
		const dominantFreq = findDominantFrequency(data, sr);

		// RMS energy
		let sumSq = 0;
		for (let i = 0; i < data.length; i++) sumSq += data[i] * data[i];
		const rms = Math.sqrt(sumSq / data.length);

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
		for (let i = 0; i < data.length; i += frameSize) {
			let frameRms = 0;
			const end = Math.min(i + frameSize, data.length);
			for (let j = i; j < end; j++) frameRms += data[j] * data[j];
			frameRms = Math.sqrt(frameRms / (end - i));
			if (frameRms < silenceThreshold) silentFrames++;
			totalFrames++;
		}
		const silenceRatio = silentFrames / totalFrames;

		// Energy envelope: ratio of first half energy to second half (onset pattern)
		const mid = Math.floor(data.length / 2);
		let e1 = 0, e2 = 0;
		for (let i = 0; i < mid; i++) e1 += data[i] * data[i];
		for (let i = mid; i < data.length; i++) e2 += data[i] * data[i];
		const onsetRatio = e1 / (e1 + e2);

		// Peak frequency via simple FFT (top 3)
		const peakFreqs = findPeakFrequencies(data, sr, 3);

		return {
			duration: Math.round(duration * 100) / 100,
			dominantFreqHz: Math.round(dominantFreq),
			peakFreqHz: peakFreqs,
			rmsEnergy: Math.round(rms * 10000) / 10000,
			zeroCrossRate: Math.round(zcr * 10) / 10,
			silenceRatio: Math.round(silenceRatio * 100) / 100,
			onsetRatio: Math.round(onsetRatio * 100) / 100,
		};
	} finally {
		await audioCtx.close();
	}
}

function findDominantFrequency(data, sr) {
	// Autocorrelation method — robust for monophonic signals
	const minFreq = 80;
	const maxFreq = 1200;
	const minPeriod = Math.floor(sr / maxFreq);
	const maxPeriod = Math.floor(sr / minFreq);
	if (maxPeriod >= data.length) return 0;

	let bestCorr = -Infinity;
	let bestPeriod = minPeriod;
	const N = Math.min(data.length, sr); // analyze first second max

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
	return sr / bestPeriod;
}

function findPeakFrequencies(data, sr, n) {
	// Simple DFT to find top n frequency peaks
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

	// Find top n peaks (local maxima above 80Hz)
	const minBin = Math.floor(80 / (sr / N));
	const peaks = [];
	
	for (let i = minBin; i < magnitudes.length - 1; i++) {
		if (magnitudes[i] > magnitudes[i - 1] && magnitudes[i] > magnitudes[i + 1]) {
			peaks.push({ freq: Math.round(i * sr / N), mag: magnitudes[i] });
		}
	}
	
	peaks.sort((a, b) => b.mag - a.mag);
	return peaks.slice(0, n).map(p => p.freq);
}