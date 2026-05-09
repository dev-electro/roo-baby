/**
 * Web Audio API sound generator for soothing baby sounds.
 * Supports loop, volume control, and multiple sound types.
 */

let audioCtx = null;
let masterGain = null;
let activeSound = null; // { type, nodes, intervals, source }

function getCtx() {
	if (!audioCtx) {
		audioCtx = new (window.AudioContext || window.webkitAudioContext)();
		masterGain = audioCtx.createGain();
		masterGain.connect(audioCtx.destination);
		masterGain.gain.value = 0.5;
	}
	return audioCtx;
}

export function ensureAudioResumed() {
	const ctx = getCtx();
	if (ctx.state === 'suspended') ctx.resume().catch(() => {});
}

export function setVolume(level) {
	getCtx();
	if (masterGain) {
		masterGain.gain.setTargetAtTime(Math.max(0, Math.min(1, level)), audioCtx.currentTime, 0.1);
	}
}

export function getVolume() {
	return masterGain?.gain.value ?? 0.5;
}

export function isPlaying() {
	return activeSound !== null;
}

export function getActiveSoundType() {
	return activeSound?.type ?? null;
}

export function stopAllSounds() {
	if (activeSound) {
		activeSound.nodes.forEach(n => {
			try { n.stop(); } catch {}
			try { n.disconnect(); } catch {}
		});
		activeSound.intervals.forEach(id => clearInterval(id));
		activeSound = null;
	}
}

/* ── White Noise ── */
export function playWhiteNoise(loop = false) {
	ensureAudioResumed();
	stopAllSounds();
	const ctx = audioCtx;
	const bufferSize = loop ? ctx.sampleRate * 10 : ctx.sampleRate * 30;
	const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
	const data = buffer.getChannelData(0);
	for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.12;

	const source = ctx.createBufferSource();
	const gain = ctx.createGain();
	const filter = ctx.createBiquadFilter();
	filter.type = 'lowpass'; filter.frequency.value = 800; filter.Q.value = 0.7;
	source.buffer = buffer;
	source.loop = loop;
	source.connect(filter); filter.connect(gain); gain.connect(masterGain);

	const t = ctx.currentTime;
	gain.gain.setValueAtTime(0, t);
	gain.gain.linearRampToValueAtTime(0.35, t + 1);
	if (!loop) { gain.gain.setValueAtTime(0.35, t + bufferSize / ctx.sampleRate - 1.5); gain.gain.linearRampToValueAtTime(0, t + bufferSize / ctx.sampleRate); }

	source.start();
	if (!loop) source.stop(t + bufferSize / ctx.sampleRate + 0.1);
	activeSound = { type: 'whitenoise', nodes: [source, gain, filter], intervals: [], source };
}

/* ── Pink Noise ── */
export function playPinkNoise(loop = false) {
	ensureAudioResumed();
	stopAllSounds();
	const ctx = audioCtx;
	const duration = loop ? 10 : 30;
	const bufferSize = ctx.sampleRate * duration;
	const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
	const data = buffer.getChannelData(0);
	let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
	for (let i=0;i<bufferSize;i++) {
		const white = Math.random()*2-1;
		b0=0.99886*b0+white*0.0555179;b1=0.99332*b1+white*0.0750759;b2=0.969*b2+white*0.153852;
		b3=0.8665*b3+white*0.3104856;b4=0.55*b4+white*0.5329522;b5=-0.7616*b5-white*0.016898;
		data[i]=(b0+b1+b2+b3+b4+b5+b6+white*0.5362)*0.06;b6=white*0.115926;
	}
	const source = ctx.createBufferSource();
	const gain = ctx.createGain();
	const filter = ctx.createBiquadFilter();
	filter.type = 'lowpass'; filter.frequency.value = 600; filter.Q.value = 0.5;
	source.buffer = buffer; source.loop = loop;
	source.connect(filter); filter.connect(gain); gain.connect(masterGain);

	const t=ctx.currentTime;
	gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(0.3,t+1);
	if(!loop){gain.gain.setValueAtTime(0.3,t+duration-1.5);gain.gain.linearRampToValueAtTime(0,t+duration);}
	source.start();if(!loop)source.stop(t+duration+0.1);
	activeSound={type:'pinknoise',nodes:[source,gain,filter],intervals:[],source};
}

/* ── Brown Noise ── */
export function playBrownNoise(loop = false) {
	ensureAudioResumed();
	stopAllSounds();
	const ctx = audioCtx;
	const duration = loop ? 10 : 30;
	const bufferSize = ctx.sampleRate * duration;
	const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
	const data = buffer.getChannelData(0);
	let lastOut=0;
	for(let i=0;i<bufferSize;i++) {
		const white=Math.random()*2-1;
		data[i]=(lastOut+(0.02*white))/1.02;lastOut=data[i];data[i]*=2.5;
	}
	const source=ctx.createBufferSource();
	const gain=ctx.createGain();
	const filter=ctx.createBiquadFilter();
	filter.type='lowpass';filter.frequency.value=300;filter.Q.value=0.3;
	source.buffer=buffer;source.loop=loop;
	source.connect(filter);filter.connect(gain);gain.connect(masterGain);

	const t=ctx.currentTime;
	gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(0.25,t+1.5);
	if(!loop){gain.gain.setValueAtTime(0.25,t+duration-2);gain.gain.linearRampToValueAtTime(0,t+duration);}
	source.start();if(!loop)source.stop(t+duration+0.1);
	activeSound={type:'brownnoise',nodes:[source,gain,filter],intervals:[],source};
}

/* ── Heartbeat ── */
export function playHeartbeat(loop = false) {
	ensureAudioResumed();
	stopAllSounds();
	const ctx=audioCtx;
	const nodes=[],intervals=[];
	function beat() {
		const t=ctx.currentTime;
		const osc1=ctx.createOscillator(),g1=ctx.createGain();
		osc1.connect(g1);g1.connect(masterGain);
		osc1.type='sine';osc1.frequency.setValueAtTime(70,t);
		g1.gain.setValueAtTime(0,t);g1.gain.linearRampToValueAtTime(0.35,t+0.04);g1.gain.exponentialRampToValueAtTime(0.001,t+0.18);g1.gain.linearRampToValueAtTime(0.25,t+0.26);g1.gain.exponentialRampToValueAtTime(0.001,t+0.4);
		osc1.start(t);osc1.stop(t+0.45);nodes.push(osc1);
		const osc2=ctx.createOscillator(),g2=ctx.createGain();
		osc2.connect(g2);g2.connect(masterGain);
		osc2.type='sine';osc2.frequency.setValueAtTime(55,t+0.14);
		g2.gain.setValueAtTime(0,t+0.14);g2.gain.linearRampToValueAtTime(0.2,t+0.17);g2.gain.exponentialRampToValueAtTime(0.001,t+0.3);
		osc2.start(t+0.14);osc2.stop(t+0.35);nodes.push(osc2);
	}
	beat();
	const id=setInterval(beat,1000);
	intervals.push(id);
	if(!loop){const stopId=setTimeout(()=>stopAllSounds(),25000);intervals.push(stopId);}
	activeSound={type:'heartbeat',nodes,intervals,source:null};
}

/* ── Lullaby ── */
export function playLullaby(loop = false) {
	ensureAudioResumed();
	stopAllSounds();
	const ctx=audioCtx;
	const notes=[261.6,293.7,329.6,349.2,392.0,349.2,329.6,293.7,261.6];
	const durs=[0.7,0.7,0.7,0.7,1.0,0.7,0.7,0.7,1.2];
	const totalDur=notes.reduce((a,b,i)=>a+durs[i],0)+1;
	const nodes=[],intervals=[];

	function playMelody(baseTime) {
		let tOff=0;
		notes.forEach((freq,i)=>{
			const osc=ctx.createOscillator(),gain=ctx.createGain();
			osc.connect(gain);gain.connect(masterGain);
			osc.type='sine';osc.frequency.value=freq;
			const t=baseTime+tOff,dur=durs[i];
			gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(0.16,t+0.12);gain.gain.setValueAtTime(0.16,t+dur-0.2);gain.gain.linearRampToValueAtTime(0,t+dur);
			osc.start(t);osc.stop(t+dur+0.1);nodes.push(osc);
			tOff+=dur;
		});
	}
	playMelody(ctx.currentTime);
	if(loop) {
		const id=setInterval(()=>playMelody(ctx.currentTime),totalDur*1000);
		intervals.push(id);
	} else {
		const id=setTimeout(()=>stopAllSounds(),totalDur*1000+500);
		intervals.push(id);
	}
	activeSound={type:'lullaby',nodes,intervals,source:null};
}

/* ── Shush ── */
export function playShush(loop = false) {
	ensureAudioResumed();
	stopAllSounds();
	const ctx=audioCtx;
	const duration=loop?5:15;
	const bufferSize=ctx.sampleRate*duration;
	const buffer=ctx.createBuffer(1,bufferSize,ctx.sampleRate);
	const data=buffer.getChannelData(0);
	for(let i=0;i<bufferSize;i++)data[i]=(Math.random()*2-1)*0.18;

	const source=ctx.createBufferSource();
	const gain=ctx.createGain();
	const filter=ctx.createBiquadFilter();
	filter.type='bandpass';filter.frequency.value=2500;filter.Q.value=0.8;
	source.buffer=buffer;source.loop=loop;
	source.connect(filter);filter.connect(gain);gain.connect(masterGain);

	const t=ctx.currentTime;
	const cycles=Math.floor(duration/0.6);
	for(let i=0;i<cycles;i++){
		const s=t+i*0.6;
		gain.gain.setValueAtTime(0,s);gain.gain.linearRampToValueAtTime(0.25,s+0.08);gain.gain.linearRampToValueAtTime(0,s+0.45);
	}
	source.start();if(!loop)source.stop(t+duration+0.1);
	activeSound={type:'shush',nodes:[source,gain,filter],intervals:[],source};
}

/* ── Rain ── */
export function playRain(loop = false) {
	ensureAudioResumed();
	stopAllSounds();
	const ctx=audioCtx;
	const duration=loop?5:30;
	const bufferSize=ctx.sampleRate*duration;
	const buffer=ctx.createBuffer(1,bufferSize,ctx.sampleRate);
	const data=buffer.getChannelData(0);
	for(let i=0;i<bufferSize;i++){
		data[i]=(Math.random()*2-1)*0.1;
		if(Math.random()>0.7)data[i]+=(Math.random()*2-1)*0.15;
	}
	const source=ctx.createBufferSource();
	const gain=ctx.createGain();
	const filter=ctx.createBiquadFilter();
	filter.type='highpass';filter.frequency.value=800;filter.Q.value=0.3;
	source.buffer=buffer;source.loop=loop;
	source.connect(filter);filter.connect(gain);gain.connect(masterGain);

	const t=ctx.currentTime;
	gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(0.3,t+0.8);
	if(!loop){gain.gain.setValueAtTime(0.3,t+duration-1.5);gain.gain.linearRampToValueAtTime(0,t+duration);}
	source.start();if(!loop)source.stop(t+duration+0.1);
	activeSound={type:'rain',nodes:[source,gain,filter],intervals:[],source};
}

/* ── Ocean Waves ── */
export function playOcean(loop = false) {
	ensureAudioResumed();
	stopAllSounds();
	const ctx=audioCtx;
	const duration=loop?8:30;
	const bufferSize=ctx.sampleRate*duration;
	const buffer=ctx.createBuffer(1,bufferSize,ctx.sampleRate);
	const data=buffer.getChannelData(0);
	for(let i=0;i<bufferSize;i++){
		const phase=(i/ctx.sampleRate)%4;
		const envelope=Math.sin(phase*Math.PI/4)*Math.max(0,1-phase/2);
		data[i]=(Math.random()*2-1)*0.08+envelope*(Math.random()*2-1)*0.5;
	}
	const source=ctx.createBufferSource();
	const gain=ctx.createGain();
	const filter=ctx.createBiquadFilter();
	filter.type='lowpass';filter.frequency.value=1500;filter.Q.value=0.4;
	source.buffer=buffer;source.loop=loop;
	source.connect(filter);filter.connect(gain);gain.connect(masterGain);

	const t=ctx.currentTime;
	gain.gain.setValueAtTime(0,t);gain.gain.linearRampToValueAtTime(0.4,t+1);
	if(!loop){gain.gain.setValueAtTime(0.4,t+duration-2);gain.gain.linearRampToValueAtTime(0,t+duration);}
	source.start();if(!loop)source.stop(t+duration+0.1);
	activeSound={type:'ocean',nodes:[source,gain,filter],intervals:[],source};
}

/* ── Play by type name ── */
export function playResponseSound(soundName) {
	switch(soundName){
		case 'heartbeat': playHeartbeat(false); break;
		case 'whitenoise': playWhiteNoise(false); break;
		case 'lullaby': playLullaby(false); break;
		case 'shush': playShush(false); break;
		default: playWhiteNoise(false);
	}
}

const SOUND_MAP = { whitenoise:playWhiteNoise, pinknoise:playPinkNoise, brownnoise:playBrownNoise, heartbeat:playHeartbeat, lullaby:playLullaby, shush:playShush, rain:playRain, ocean:playOcean };
export function playByName(name, loop = false) {
	const fn = SOUND_MAP[name];
	if(fn) fn(loop);
}
