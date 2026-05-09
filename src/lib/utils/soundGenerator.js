/**
 * Standalone Web Audio synthesizer. Zero external dependencies.
 * Generates all sounds in real-time — no audio files needed.
 *
 * Pattern from generative.fm: each sound is a self-contained unit
 * with play() returning { stop() }.
 */

let ac = null;
let master = null;
let current = null;

function ctx() {
	if (!ac) {
		ac = new (window.AudioContext || window.webkitAudioContext)();
		master = ac.createGain();
		master.gain.value = 0.5;
		master.connect(ac.destination);
	}
	return ac;
}

/** Must be called from a user gesture on mobile */
export function unlock() {
	const c = ctx();
	if (c.state === 'suspended') c.resume();
}

export function setVol(v) {
	ctx();
	master.gain.setTargetAtTime(Math.max(0, Math.min(1, v)), ac.currentTime, 0.05);
}
export function getVol() { return master?.gain.value ?? 0.5; }
export function isOn() { return current !== null; }
export function which() { return current?.type ?? null; }
export function halt() {
	if (current) { current.stop(); current = null; }
}

/* ── helper: noise buffer ── */
function noiseBuf(sec, fill) {
	const c = ctx();
	const len = c.sampleRate * sec;
	const b = c.createBuffer(1, len, c.sampleRate);
	fill(b.getChannelData(0), len);
	return b;
}

function noiseSrc(buf, loop, cfg = {}) {
	const c = ctx();
	const s = c.createBufferSource(); s.buffer = buf; s.loop = loop;
	const g = c.createGain();
	const f = c.createBiquadFilter();
	if (cfg.ft) { f.type = cfg.ft; f.frequency.value = cfg.fq || 1000; f.Q.value = cfg.q || 0.5; }
	s.connect(f); f.connect(g); g.connect(master);
	const t = c.currentTime;
	g.gain.setValueAtTime(0, t);
	g.gain.linearRampToValueAtTime(cfg.gn || 0.25, t + (cfg.fi || 0.8));
	return { s, g, f, stop() { try { s.stop(); } catch {} } };
}

/* ── White Noise ── */
function mkWhite() {
	const buf = noiseBuf(8, (d, n) => { for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * 0.12; });
	const { s, g, f, stop } = noiseSrc(buf, true, { ft: 'lowpass', fq: 800, q: 0.7, gn: 0.25, fi: 1 });
	s.start();
	return { type: 'whitenoise', stop };
}

/* ── Pink Noise ── */
function mkPink() {
	const buf = noiseBuf(8, (d, n) => {
		let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
		for (let i = 0; i < n; i++) {
			const w = Math.random() * 2 - 1;
			b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759;
			b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856;
			b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
			d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.07; b6 = w * 0.115926;
		}
	});
	const { s, g, f, stop } = noiseSrc(buf, true, { ft: 'lowpass', fq: 500, q: 0.5, gn: 0.2, fi: 1 });
	s.start();
	return { type: 'pinknoise', stop };
}

/* ── Brown Noise ── */
function mkBrown() {
	const buf = noiseBuf(8, (d, n) => {
		let last = 0;
		for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; d[i] = (last + 0.02 * w) / 1.02; last = d[i]; d[i] *= 2.5; }
	});
	const { s, g, f, stop } = noiseSrc(buf, true, { ft: 'lowpass', fq: 250, q: 0.3, gn: 0.18, fi: 1.5 });
	s.start();
	return { type: 'brownnoise', stop };
}

/* ── Rain ── */
function mkRain() {
	const buf = noiseBuf(6, (d, n) => {
		for (let i = 0; i < n; i++) { d[i] = (Math.random() * 2 - 1) * 0.1; if (Math.random() > 0.7) d[i] += (Math.random() * 2 - 1) * 0.2; }
	});
	const { s, g, f, stop } = noiseSrc(buf, true, { ft: 'highpass', fq: 600, q: 0.3, gn: 0.22, fi: 0.6 });
	s.start();
	return { type: 'rain', stop };
}

/* ── Ocean ── */
function mkOcean() {
	const buf = noiseBuf(8, (d, n) => {
		const sr = ctx().sampleRate;
		for (let i = 0; i < n; i++) {
			const ph = (i / sr) % 4;
			const env = Math.sin(ph * Math.PI / 4) * Math.max(0, 1 - ph / 2);
			d[i] = (Math.random() * 2 - 1) * 0.08 + env * (Math.random() * 2 - 1) * 0.5;
		}
	});
	const { s, g, f, stop } = noiseSrc(buf, true, { ft: 'lowpass', fq: 1200, q: 0.4, gn: 0.3, fi: 0.8 });
	s.start();
	return { type: 'ocean', stop };
}

/* ── Heartbeat ── */
function mkHeartbeat() {
	ctx();
	const nodes = [];
	let timer, stopped = false;

	function beat() {
		if (stopped) return;
		const c = ctx(), t = c.currentTime;
		// lub
		const o1 = c.createOscillator(), g1 = c.createGain();
		o1.type = 'sine'; o1.frequency.setValueAtTime(70, t);
		o1.connect(g1); g1.connect(master);
		g1.gain.setValueAtTime(0, t); g1.gain.linearRampToValueAtTime(0.3, t + 0.04);
		g1.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
		g1.gain.linearRampToValueAtTime(0.22, t + 0.26);
		g1.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
		o1.start(t); o1.stop(t + 0.45); nodes.push(o1, g1);
		// dub
		const o2 = c.createOscillator(), g2 = c.createGain();
		o2.type = 'sine'; o2.frequency.setValueAtTime(55, t + 0.14);
		o2.connect(g2); g2.connect(master);
		g2.gain.setValueAtTime(0, t + 0.14); g2.gain.linearRampToValueAtTime(0.18, t + 0.17);
		g2.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
		o2.start(t + 0.14); o2.stop(t + 0.35); nodes.push(o2, g2);
	}
	beat();
	timer = setInterval(beat, 1000);
	return {
		type: 'heartbeat',
		stop() {
			stopped = true;
			clearInterval(timer);
			nodes.forEach(n => { try { n.stop(); n.disconnect(); } catch {} });
		}
	};
}

/* ── Lullaby ── */
function mkLullaby() {
	ctx();
	const mel = [261.6, 293.7, 329.6, 349.2, 392.0, 349.2, 329.6, 293.7, 261.6];
	const dur = [0.7, 0.7, 0.7, 0.7, 1.0, 0.7, 0.7, 0.7, 1.2];
	const total = dur.reduce((a, b) => a + b, 0) + 0.3;
	const nodes = [];
	let timer, stopped = false;

	function melody(base) {
		if (stopped) return;
		const c = ctx();
		let off = 0;
		mel.forEach((f, i) => {
			const o = c.createOscillator(), g = c.createGain();
			o.type = 'sine'; o.frequency.value = f;
			o.connect(g); g.connect(master);
			const t = base + off, d = dur[i];
			g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.14, t + 0.12);
			g.gain.setValueAtTime(0.14, t + d - 0.2); g.gain.linearRampToValueAtTime(0, t + d);
			o.start(t); o.stop(t + d + 0.1); nodes.push(o, g);
			off += d;
		});
	}
	melody(ctx().currentTime);
	timer = setInterval(() => melody(ctx().currentTime), total * 1000);
	return {
		type: 'lullaby',
		stop() {
			stopped = true;
			clearInterval(timer);
			nodes.forEach(n => { try { n.stop(); n.disconnect(); } catch {} });
		}
	};
}

/* ── Shush ── */
function mkShush() {
	const buf = noiseBuf(4, (d, n) => { for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * 0.18; });
	const c = ctx();
	const s = c.createBufferSource(); s.buffer = buf; s.loop = true;
	const g = c.createGain();
	const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2800; f.Q.value = 1.2;
	s.connect(f); f.connect(g); g.connect(master);
	const t = c.currentTime;
	for (let i = 0; i < Math.floor(4 / 0.5); i++) {
		const st = t + i * 0.5;
		g.gain.setValueAtTime(0, st); g.gain.linearRampToValueAtTime(0.22, st + 0.06);
		g.gain.setValueAtTime(0, st + 0.38);
	}
	s.start();
	return { type: 'shush', stop() { try { s.stop(); } catch {} } };
}

/* ── Public API ── */

const CREATORS = { whitenoise: mkWhite, pinknoise: mkPink, brownnoise: mkBrown, rain: mkRain, ocean: mkOcean, heartbeat: mkHeartbeat, lullaby: mkLullaby, shush: mkShush };

/** Start a synth sound. Returns { type, stop() }. Call stop() to end. */
export function start(type) {
	unlock();
	halt();
	const fn = CREATORS[type];
	if (!fn) return null;
	current = fn();
	return current;
}

/** Play a one-shot response sound (non-looping) */
export function playResponse(name) {
	switch (name) {
		case 'heartbeat': { const s = start('heartbeat'); if (s) setTimeout(() => s.stop(), 12000); break; }
		case 'whitenoise': { const s = start('whitenoise'); if (s) setTimeout(() => s.stop(), 20000); break; }
		case 'lullaby': { const s = start('lullaby'); if (s) setTimeout(() => s.stop(), 15000); break; }
		case 'shush': { const s = start('shush'); if (s) setTimeout(() => s.stop(), 10000); break; }
		default: { const s = start('whitenoise'); if (s) setTimeout(() => s.stop(), 15000); }
	}
}

// Backward compat aliases
export const ensureAudioResumed = unlock;
export const stopAllSounds = halt;
export const setVolume = setVol;
export const getVolume = getVol;
export const isPlaying = isOn;
export const playResponseSound = playResponse;
