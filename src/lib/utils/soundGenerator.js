/**
 * Web Audio API sound generator for soothing baby sounds.
 * Handles AudioContext resume on user gesture for mobile.
 */

let audioCtx = null;
let activeNodes = [];
let activeIntervals = [];
let autoStopTimer = null;

function getAudioContext() {
	if (!audioCtx) {
		audioCtx = new (window.AudioContext || window.webkitAudioContext)();
	}
	return audioCtx;
}

export function ensureAudioResumed() {
	const ctx = getAudioContext();
	if (ctx.state === 'suspended') {
		ctx.resume().catch(() => {});
	}
}

function trackNode(node) {
	activeNodes.push(node);
}

function trackInterval(id) {
	activeIntervals.push(id);
}

export function stopAllSounds() {
	activeNodes.forEach(node => {
		try { node.stop(); } catch {}
		try { node.disconnect(); } catch {}
	});
	activeIntervals.forEach(id => clearInterval(id));
	activeNodes = [];
	activeIntervals = [];
	if (autoStopTimer) {
		clearTimeout(autoStopTimer);
		autoStopTimer = null;
	}
}

function scheduleAutoStop(durationMs) {
	if (autoStopTimer) clearTimeout(autoStopTimer);
	autoStopTimer = setTimeout(stopAllSounds, durationMs);
}

export function playHeartbeat() {
	ensureAudioResumed();
	stopAllSounds();
	const ctx = audioCtx;

	function beat() {
		const t = ctx.currentTime;
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();

		osc.connect(gain);
		gain.connect(ctx.destination);

		osc.type = 'sine';
		osc.frequency.setValueAtTime(70, t);

		gain.gain.setValueAtTime(0, t);
		gain.gain.linearRampToValueAtTime(0.35, t + 0.04);
		gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
		gain.gain.linearRampToValueAtTime(0.25, t + 0.26);
		gain.gain.exponentialRampToValueAtTime(0.001, t + 0.40);

		osc.start(t);
		osc.stop(t + 0.45);
		trackNode(osc);
	}

	beat();
	const interval = setInterval(beat, 1000);
	trackInterval(interval);
	scheduleAutoStop(25000);
}

export function playWhiteNoise(durationSeconds = 20) {
	ensureAudioResumed();
	stopAllSounds();
	const ctx = audioCtx;
	const duration = Math.min(durationSeconds, 60);
	const bufferSize = ctx.sampleRate * duration;
	const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
	const data = buffer.getChannelData(0);

	for (let i = 0; i < bufferSize; i++) {
		data[i] = (Math.random() * 2 - 1) * 0.12;
	}

	const source = ctx.createBufferSource();
	const gain = ctx.createGain();
	const filter = ctx.createBiquadFilter();

	filter.type = 'lowpass';
	filter.frequency.value = 800;
	filter.Q.value = 0.7;

	source.buffer = buffer;
	source.connect(filter);
	filter.connect(gain);
	gain.connect(ctx.destination);

	const t = ctx.currentTime;
	gain.gain.setValueAtTime(0, t);
	gain.gain.linearRampToValueAtTime(0.35, t + 1.5);
	gain.gain.setValueAtTime(0.35, t + duration - 2);
	gain.gain.linearRampToValueAtTime(0, t + duration);

	source.start();
	source.stop(t + duration);
	trackNode(source);
	scheduleAutoStop((duration + 1) * 1000);
}

export function playShush(durationSeconds = 15) {
	ensureAudioResumed();
	stopAllSounds();
	const ctx = audioCtx;
	const duration = Math.min(durationSeconds, 60);
	const bufferSize = ctx.sampleRate * duration;
	const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
	const data = buffer.getChannelData(0);

	for (let i = 0; i < bufferSize; i++) {
		data[i] = (Math.random() * 2 - 1) * 0.18;
	}

	const source = ctx.createBufferSource();
	const gain = ctx.createGain();
	const filter = ctx.createBiquadFilter();

	filter.type = 'bandpass';
	filter.frequency.value = 2500;
	filter.Q.value = 0.8;

	source.buffer = buffer;
	source.connect(filter);
	filter.connect(gain);
	gain.connect(ctx.destination);

	const t = ctx.currentTime;
	const cycles = Math.floor(duration / 0.6);
	for (let i = 0; i < cycles; i++) {
		const start = t + i * 0.6;
		gain.gain.setValueAtTime(0, start);
		gain.gain.linearRampToValueAtTime(0.25, start + 0.08);
		gain.gain.linearRampToValueAtTime(0, start + 0.45);
	}

	source.start();
	source.stop(t + duration);
	trackNode(source);
	scheduleAutoStop((duration + 1) * 1000);
}

export function playLullaby() {
	ensureAudioResumed();
	stopAllSounds();
	const ctx = audioCtx;
	const notes = [261.6, 293.7, 329.6, 349.2, 392.0, 349.2, 329.6, 293.7, 261.6];
	const durations = [0.7, 0.7, 0.7, 0.7, 1.0, 0.7, 0.7, 0.7, 1.2];

	let timeOffset = 0;
	notes.forEach((freq, i) => {
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();

		osc.connect(gain);
		gain.connect(ctx.destination);

		osc.type = 'sine';
		osc.frequency.value = freq;

		const t = ctx.currentTime + timeOffset;
		const dur = durations[i];

		gain.gain.setValueAtTime(0, t);
		gain.gain.linearRampToValueAtTime(0.18, t + 0.12);
		gain.gain.setValueAtTime(0.18, t + dur - 0.2);
		gain.gain.linearRampToValueAtTime(0, t + dur);

		osc.start(t);
		osc.stop(t + dur + 0.1);
		trackNode(osc);

		timeOffset += dur;
	});
	const totalMs = (timeOffset + 1) * 1000;
	scheduleAutoStop(totalMs);
}

export function playResponseSound(soundName) {
	switch (soundName) {
		case 'heartbeat': playHeartbeat(); break;
		case 'whitenoise': playWhiteNoise(20); break;
		case 'lullaby': playLullaby(); break;
		case 'shush': playShush(15); break;
		default: playWhiteNoise(20);
	}
}