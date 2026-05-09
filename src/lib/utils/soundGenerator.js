/**
 * Standalone Web Audio synthesizer v2
 * New synths: binaural, womb, fan, thunder
 * Improved: rain (droplets), ocean (proper wave), lullaby (harmonics), shush (rhythmic), heartbeat (+womb undertone)
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

export function unlock() { const c = ctx(); if (c.state === 'suspended') c.resume(); }
export function setVol(v) { ctx(); master.gain.setTargetAtTime(Math.max(0, Math.min(1, v)), ac.currentTime, 0.05); }
export function getVol() { return master?.gain.value ?? 0.5; }
export function isOn()   { return current !== null; }
export function which()  { return current?.type ?? null; }
export function halt()   { if (current) { current.stop(); current = null; } }

/* ── Helpers ── */
function noiseBuf(sec, fill) {
	const c = ctx(); const len = c.sampleRate * sec;
	const b = c.createBuffer(1, len, c.sampleRate); fill(b.getChannelData(0), len); return b;
}
function noiseSrc(buf, loop, cfg = {}) {
	const c = ctx();
	const s = c.createBufferSource(); s.buffer = buf; s.loop = loop;
	const g = c.createGain(); const f = c.createBiquadFilter();
	if (cfg.ft) { f.type = cfg.ft; f.frequency.value = cfg.fq || 1000; f.Q.value = cfg.q || 0.5; }
	s.connect(f); f.connect(g); g.connect(master);
	const t = c.currentTime;
	g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(cfg.gn || 0.25, t + (cfg.fi || 0.8));
	return { s, g, f, stop() { try { s.stop(); } catch {} } };
}

/* ── White Noise ── */
function mkWhite() {
	const buf = noiseBuf(8, (d, n) => { for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * 0.12; });
	const { s, g, f, stop } = noiseSrc(buf, true, { ft:'lowpass', fq:900, q:0.7, gn:0.25, fi:1 });
	s.start(); return { type:'whitenoise', stop };
}

/* ── Pink Noise ── */
function mkPink() {
	const buf = noiseBuf(8, (d, n) => {
		let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
		for (let i=0;i<n;i++) {
			const w=Math.random()*2-1;
			b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759;
			b2=0.969*b2+w*0.153852;   b3=0.8665*b3+w*0.3104856;
			b4=0.55*b4+w*0.5329522;   b5=-0.7616*b5-w*0.016898;
			d[i]=(b0+b1+b2+b3+b4+b5+b6+w*0.5362)*0.07; b6=w*0.115926;
		}
	});
	const { s, g, f, stop } = noiseSrc(buf, true, { ft:'lowpass', fq:500, q:0.5, gn:0.2, fi:1 });
	s.start(); return { type:'pinknoise', stop };
}

/* ── Brown Noise ── */
function mkBrown() {
	const buf = noiseBuf(8, (d, n) => {
		let last=0;
		for (let i=0;i<n;i++) { const w=Math.random()*2-1; d[i]=(last+0.02*w)/1.02; last=d[i]; d[i]*=2.5; }
	});
	const { s, g, f, stop } = noiseSrc(buf, true, { ft:'lowpass', fq:250, q:0.3, gn:0.18, fi:1.5 });
	s.start(); return { type:'brownnoise', stop };
}

/* ── Rain (improved: background drizzle + droplet spikes) ── */
function mkRain() {
	const c = ctx();
	// Background drizzle
	const bgBuf = noiseBuf(6, (d, n) => { for (let i=0;i<n;i++) d[i]=(Math.random()*2-1)*0.08; });
	const { s: bgS, g: bgG, f: bgF, stop: bgStop } = noiseSrc(bgBuf, true, { ft:'highpass', fq:600, q:0.3, gn:0.18, fi:0.8 });
	bgS.start();
	// Droplet overlay
	const dpBuf = noiseBuf(4, (d, n) => {
		for (let i=0;i<n;i++) { d[i]=(Math.random()*2-1)*0.06; if (Math.random()>0.93) d[i]+=(Math.random()*2-1)*0.35; }
	});
	const dpS = c.createBufferSource(); dpS.buffer=dpBuf; dpS.loop=true;
	const dpG = c.createGain(); dpG.gain.value=0.12;
	const dpF = c.createBiquadFilter(); dpF.type='highpass'; dpF.frequency.value=2000;
	dpS.connect(dpF); dpF.connect(dpG); dpG.connect(master); dpS.start();
	return { type:'rain', stop() { bgStop(); try{dpS.stop()}catch{} } };
}

/* ── Ocean (improved: 3-phase wave envelope) ── */
function mkOcean() {
	const c = ctx(), sr = c.sampleRate;
	const buf = noiseBuf(12, (d, n) => {
		for (let i=0;i<n;i++) {
			const t = i/sr, wavePh = t % 6;
			let env;
			if      (wavePh < 2)   env = wavePh / 2;                  // approach
			else if (wavePh < 2.8) env = 1 - (wavePh-2)/1.5;          // crash peak
			else                   env = Math.max(0, 0.3 - (wavePh-2.8)*0.08); // retreat
			d[i] = (Math.random()*2-1) * (0.06 + env * 0.28);
		}
	});
	const { s, g, f, stop } = noiseSrc(buf, true, { ft:'lowpass', fq:1200, q:0.4, gn:0.28, fi:1 });
	s.start(); return { type:'ocean', stop };
}

/* ── Heartbeat (improved: womb rumble underneath) ── */
function mkHeartbeat() {
	ctx(); const nodes = []; let timer, stopped=false;
	// Womb undertone
	const wBuf = noiseBuf(4, (d,n) => { let l=0; for(let i=0;i<n;i++){const w=Math.random()*2-1;d[i]=(l+0.02*w)/1.02;l=d[i];d[i]*=1.5} });
	const wS = ac.createBufferSource(); wS.buffer=wBuf; wS.loop=true;
	const wG = ac.createGain(); wG.gain.value=0.06;
	const wF = ac.createBiquadFilter(); wF.type='lowpass'; wF.frequency.value=80;
	wS.connect(wF); wF.connect(wG); wG.connect(master); wS.start(); nodes.push(wS,wG,wF);
	function beat() {
		if (stopped) return;
		const c=ctx(), t=c.currentTime;
		const o1=c.createOscillator(), g1=c.createGain();
		o1.type='sine'; o1.frequency.setValueAtTime(70,t);
		o1.connect(g1); g1.connect(master);
		g1.gain.setValueAtTime(0,t); g1.gain.linearRampToValueAtTime(0.32,t+0.04);
		g1.gain.exponentialRampToValueAtTime(0.001,t+0.18);
		g1.gain.linearRampToValueAtTime(0.24,t+0.27);
		g1.gain.exponentialRampToValueAtTime(0.001,t+0.42);
		o1.start(t); o1.stop(t+0.48); nodes.push(o1,g1);
		const o2=c.createOscillator(), g2=c.createGain();
		o2.type='sine'; o2.frequency.setValueAtTime(52,t+0.15);
		o2.connect(g2); g2.connect(master);
		g2.gain.setValueAtTime(0,t+0.15); g2.gain.linearRampToValueAtTime(0.2,t+0.18);
		g2.gain.exponentialRampToValueAtTime(0.001,t+0.33);
		o2.start(t+0.15); o2.stop(t+0.38); nodes.push(o2,g2);
	}
	beat();
	timer = setInterval(beat, 1000);
	return { type:'heartbeat', stop() { stopped=true; clearInterval(timer); nodes.forEach(n=>{try{n.stop();n.disconnect()}catch{}}); } };
}

/* ── Lullaby (improved: 2-voice with 5th harmony) ── */
function mkLullaby() {
	ctx();
	const mel  = [261.6, 293.7, 329.6, 349.2, 392.0, 349.2, 329.6, 293.7, 261.6];
	const harm = [392.0, 440.0, 493.9, 523.3, 587.3, 523.3, 493.9, 440.0, 392.0]; // 5th above
	const dur  = [0.7, 0.7, 0.7, 0.7, 1.0, 0.7, 0.7, 0.7, 1.2];
	const total = dur.reduce((a,b)=>a+b,0) + 0.5;
	const nodes=[]; let timer, stopped=false;
	function melody(base) {
		if (stopped) return;
		const c=ctx(); let off=0;
		mel.forEach((f,i)=>{
			// Main voice
			const o=c.createOscillator(), g=c.createGain();
			o.type='sine'; o.frequency.value=f; o.connect(g); g.connect(master);
			const t=base+off, d=dur[i];
			g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.14,t+0.12);
			g.gain.setValueAtTime(0.14,t+d-0.2); g.gain.linearRampToValueAtTime(0,t+d);
			o.start(t); o.stop(t+d+0.1); nodes.push(o,g);
			// Harmony voice (quieter)
			const o2=c.createOscillator(), g2=c.createGain();
			o2.type='sine'; o2.frequency.value=harm[i]; o2.connect(g2); g2.connect(master);
			g2.gain.setValueAtTime(0,t); g2.gain.linearRampToValueAtTime(0.06,t+0.12);
			g2.gain.setValueAtTime(0.06,t+d-0.2); g2.gain.linearRampToValueAtTime(0,t+d);
			o2.start(t); o2.stop(t+d+0.1); nodes.push(o2,g2);
			off+=d;
		});
	}
	melody(ctx().currentTime);
	timer=setInterval(()=>melody(ctx().currentTime), total*1000);
	return { type:'lullaby', stop() { stopped=true; clearInterval(timer); nodes.forEach(n=>{try{n.stop();n.disconnect()}catch{}}); } };
}

/* ── Shush (improved: longer cycles with pitch rise/fall) ── */
function mkShush() {
	const c=ctx(); const stopped={v:false};
	const buf=noiseBuf(6, (d,n)=>{for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*0.18});
	const s=c.createBufferSource(); s.buffer=buf; s.loop=true;
	const g=c.createGain();
	const f=c.createBiquadFilter(); f.type='bandpass'; f.frequency.value=2800; f.Q.value=1.2;
	s.connect(f); f.connect(g); g.connect(master); s.start();
	// Rhythmic gain envelope
	const t=c.currentTime;
	for(let i=0;i<20;i++) {
		const st=t+i*0.8;
		g.gain.setValueAtTime(0,st);
		g.gain.linearRampToValueAtTime(0.22,st+0.08);
		g.gain.setValueAtTime(0.20,st+0.45);
		g.gain.linearRampToValueAtTime(0,st+0.7);
		// Pitch sweep
		f.frequency.setValueAtTime(2600,st);
		f.frequency.linearRampToValueAtTime(3200,st+0.25);
		f.frequency.linearRampToValueAtTime(2800,st+0.7);
	}
	return { type:'shush', stop(){ try{s.stop()}catch{} } };
}

/* ── NEW: Womb (muffled brown noise + slow breathing LFO) ── */
function mkWomb() {
	const c=ctx(), sr=c.sampleRate;
	const buf=noiseBuf(8,(d,n)=>{let l=0;for(let i=0;i<n;i++){const w=Math.random()*2-1;d[i]=(l+0.02*w)/1.02;l=d[i];d[i]*=2.2}});
	const s=c.createBufferSource(); s.buffer=buf; s.loop=true;
	const fLow=c.createBiquadFilter(); fLow.type='lowpass'; fLow.frequency.value=80;
	const g=c.createGain(); g.gain.value=0;
	// LFO: breathing ~0.4Hz
	const lfo=c.createOscillator(); lfo.frequency.value=0.35; lfo.type='sine';
	const lfoG=c.createGain(); lfoG.gain.value=0.12;
	lfo.connect(lfoG); lfoG.connect(g.gain);
	s.connect(fLow); fLow.connect(g); g.connect(master);
	const t=c.currentTime;
	g.gain.setValueAtTime(0.14,t);
	s.start(); lfo.start();
	return { type:'womb', stop(){ try{s.stop();lfo.stop()}catch{} } };
}

/* ── NEW: Fan (band-pass at 120Hz + harmonics) ── */
function mkFan() {
	const c=ctx();
	const buf=noiseBuf(6,(d,n)=>{for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*0.15});
	const s=c.createBufferSource(); s.buffer=buf; s.loop=true;
	const g=c.createGain(); g.gain.value=0;
	// Stack resonant filters at fan harmonics
	const filters=[120,240,480].map(freq=>{
		const f=c.createBiquadFilter(); f.type='bandpass'; f.frequency.value=freq; f.Q.value=4; return f;
	});
	const merge=c.createGain(); merge.gain.value=1;
	s.connect(filters[0]); filters[0].connect(merge);
	s.connect(filters[1]); filters[1].connect(merge);
	s.connect(filters[2]); filters[2].connect(merge);
	merge.connect(g); g.connect(master);
	const t=c.currentTime;
	g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.2,t+1.5);
	s.start();
	return { type:'fan', stop(){ try{s.stop()}catch{} } };
}

/* ── NEW: Binaural (40Hz delta wave via stereo panning) ── */
function mkBinaural() {
	const c=ctx();
	const nodes=[];
	// Left ear: 200Hz, right ear: 240Hz → perceived beat: 40Hz (delta)
	[[200,'left'],[240,'right']].forEach(([freq,side])=>{
		const o=c.createOscillator(); o.type='sine'; o.frequency.value=freq;
		const p=c.createStereoPanner(); p.pan.value=side==='left'?-1:1;
		const g=c.createGain(); g.gain.value=0;
		o.connect(p); p.connect(g); g.connect(master);
		const t=c.currentTime;
		g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.15,t+2);
		o.start(); nodes.push(o,p,g);
	});
	return { type:'binaural', stop(){ nodes.forEach(n=>{try{n.stop();n.disconnect()}catch{}}) } };
}

/* ── NEW: Thunder (distant boom loop) ── */
function mkThunder() {
	const c=ctx(); let timer,stopped=false;
	function boom() {
		if(stopped)return;
		const buf=noiseBuf(2,(d,n)=>{let l=0;for(let i=0;i<n;i++){const w=Math.random()*2-1;d[i]=(l+0.015*w)/1.015;l=d[i];d[i]*=3}});
		const s=c.createBufferSource(); s.buffer=buf;
		const g=c.createGain(); const f=c.createBiquadFilter();
		f.type='lowpass'; f.frequency.value=160; f.Q.value=0.5;
		s.connect(f); f.connect(g); g.connect(master);
		const t=c.currentTime;
		g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(0.35,t+0.1);
		g.gain.exponentialRampToValueAtTime(0.001,t+1.8);
		s.start(t); s.stop(t+2);
		// Rain ambience between thunder
		const rb=noiseBuf(4,(d,n)=>{for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*0.06});
		const rs=c.createBufferSource(); rs.buffer=rb; rs.loop=true;
		const rg=c.createGain(); rg.gain.value=0.08;
		const rf=c.createBiquadFilter(); rf.type='highpass'; rf.frequency.value=600;
		rs.connect(rf); rf.connect(rg); rg.connect(master); rs.start();
		setTimeout(()=>{try{rs.stop()}catch{}},15000);
	}
	boom();
	timer=setInterval(boom, 14000+Math.random()*8000);
	return { type:'thunder', stop(){ stopped=true; clearInterval(timer); } };
}

/* ── Public API ── */
const CREATORS = {
	whitenoise:mkWhite, pinknoise:mkPink, brownnoise:mkBrown,
	rain:mkRain, ocean:mkOcean, heartbeat:mkHeartbeat,
	lullaby:mkLullaby, shush:mkShush,
	womb:mkWomb, fan:mkFan, binaural:mkBinaural, thunder:mkThunder,
};

export function start(type) { unlock(); halt(); const fn=CREATORS[type]; if(!fn)return null; current=fn(); return current; }

export function playResponse(name) {
	switch(name) {
		case 'heartbeat': { const s=start('heartbeat'); if(s)setTimeout(()=>s.stop(),12000); break; }
		case 'whitenoise':{ const s=start('whitenoise'); if(s)setTimeout(()=>s.stop(),20000); break; }
		case 'lullaby':   { const s=start('lullaby');    if(s)setTimeout(()=>s.stop(),15000); break; }
		case 'shush':     { const s=start('shush');      if(s)setTimeout(()=>s.stop(),10000); break; }
		case 'womb':      { const s=start('womb');       if(s)setTimeout(()=>s.stop(),18000); break; }
		default:          { const s=start('whitenoise'); if(s)setTimeout(()=>s.stop(),15000); }
	}
}

// Aliases
export const ensureAudioResumed=unlock, stopAllSounds=halt, setVolume=setVol, getVolume=getVol, isPlaying=isOn, playResponseSound=playResponse;
