<script>
	import { onDestroy } from 'svelte';
	import { unlock, setVol, getVol, halt, isOn, start as startSynth } from '$utils/soundGenerator.js';
	import { categories, synths, R2_BASE } from '$lib/data/soothingTracks.js';
	import Icon from './Icon.svelte';

	let tab = $state('synth');
	let trackCat = $state(categories[0]?.id || '');

	let audio = $state(null);
	let playing = $state(false);
	let currentTrack = $state(null);
	let loop = $state(true);
	let vol = $state(typeof localStorage !== 'undefined' ? parseFloat(localStorage.getItem('roo-vol')) || 0.5 : 0.5);
	let progress = $state(0);
	let curTime = $state(0);
	let dur = $state(0);
	let tick = null;
	let synthOn = $state(false);
	let synthType = $state(null);

	$effect(() => { setVol(vol); });

	function fmt(t) { const m = Math.floor(t / 60), s = Math.floor(t % 60); return `${m}:${s.toString().padStart(2, '0')}`; }
	function setVolume(v) { vol = v; setVol(v); if (audio) audio.volume = v; try { localStorage.setItem('roo-vol', v); } catch {} }

	function kill() {
		halt(); if (audio) { audio.pause(); audio = null; }
		playing = false; currentTrack = null; progress = 0; curTime = 0; dur = 0;
		synthOn = false; synthType = null; if (tick) { clearInterval(tick); tick = null; }
	}

	function playTrack(t) {
		if (currentTrack?.name === t.name && playing) { kill(); return; }
		kill(); unlock();
		if (!t.url) { startSynthFallback(t, mapCatToSynth(t.categoryId)); return; }
		const a = new Audio(); a.src = t.url; a.loop = loop; a.volume = vol; a.preload = 'auto';
		let loaded = false;
		a.onloadedmetadata = () => { loaded = true; dur = a.duration; a.play().catch(() => {}); };
		a.onerror = () => { startSynthFallback(t, mapCatToSynth(t.categoryId)); };
		a.onplay = () => { playing = true; currentTrack = t; };
		a.onpause = () => { playing = false; };
		a.onended = () => { if (!a.loop) { playing = false; progress = 0; } };
		tick = setInterval(() => { if (audio && !audio.paused) { curTime = audio.currentTime; progress = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0; } }, 200);
		audio = a; a.play().catch(() => { if (!loaded) startSynthFallback(t, mapCatToSynth(t.categoryId)); });
	}

	function startSynthFallback(t, type) {
		const s = startSynth(type);
		if (s) { synthOn = true; synthType = s.type; currentTrack = t; playing = true; }
		tick = setInterval(() => { if (!isOn()) kill(); }, 500);
	}

	function playSynth(s) {
		kill(); unlock();
		const r = startSynth(s.id);
		if (r) { synthOn = true; synthType = r.type; playing = true; currentTrack = { name: s.name, categoryName: 'Synth' }; }
		tick = setInterval(() => { if (!isOn()) kill(); }, 500);
	}

	function mapCatToSynth(catId) {
		const m = { lullabies: 'lullaby', nature: 'rain', noise: 'whitenoise', heartbeat: 'heartbeat', shush: 'shush' };
		return m[catId] || 'whitenoise';
	}

	const catTracks = $derived(categories.find(c => c.id === trackCat)?.tracks || []);
	const currentList = $derived(tab === 'synth' ? synths : catTracks);

	function next() { const idx = currentList.findIndex(t => t.name === currentTrack?.name); const n = currentList[(idx + 1) % currentList.length]; tab === 'synth' ? playSynth(n) : playTrack(n); }
	function prev() { const idx = currentList.findIndex(t => t.name === currentTrack?.name); const n = currentList[(idx - 1 + currentList.length) % currentList.length]; tab === 'synth' ? playSynth(n) : playTrack(n); }
	function toggleLoop() { loop = !loop; if (audio) audio.loop = loop; }

	onDestroy(() => { kill(); });
</script>

<div class="player">
	<nav class="tabs">
		<button class="tb" class:on={tab === 'tracks'} onclick={() => tab = 'tracks'}><Icon name="star" size={14} color="currentColor" /> Library</button>
		<button class="tb" class:on={tab === 'synth'} onclick={() => tab = 'synth'}><Icon name="bolt" size={14} color="currentColor" /> Synth</button>
	</nav>

	{#if tab === 'tracks'}
		{#if !R2_BASE}
			<div class="notice"><Icon name="info-circle" size={14} color="var(--gold)" /> Set PUBLIC_R2_BASE for audio files. Synth fallback active.</div>
		{/if}
		<nav class="cats">
			{#each categories as cat}
				<button class="cat" class:on={trackCat === cat.id} onclick={() => trackCat = cat.id}>{cat.name}</button>
			{/each}
		</nav>
		<div class="grid">
			{#each catTracks as t, i}
				<button class="tile" class:active={currentTrack?.name === t.name && playing} onclick={() => playTrack(t)}>
					<div class="tile-name">{t.name}</div>
					<div class="tile-artist">{t.artist}</div>
					<div class="tile-play">
						{#if currentTrack?.name === t.name && playing}
							<div class="eq"><div></div><div></div><div></div></div>
						{:else}
							<Icon name="play" size={13} color="currentColor" />
						{/if}
					</div>
				</button>
			{/each}
		</div>
	{:else}
		<div class="grid">
			{#each synths as s}
				<button class="tile" class:active={synthType === s.id && playing} onclick={() => playSynth(s)} style="--tc:{s.color}">
					<Icon name={s.icon} size={18} color={s.color} />
					<div class="tile-name">{s.name}</div>
					<div class="tile-state">
						{#if synthType === s.id && playing}
							<div class="eq"><div></div><div></div><div></div></div>
						{:else}
							<Icon name="play" size={12} color="currentColor" />
						{/if}
					</div>
				</button>
			{/each}
		</div>
	{/if}

	{#if playing && currentTrack}
		<div class="ctrl animate-slide">
			<div class="ctrl-top">
				<span class="np">{currentTrack.name}</span>
				<span class="time">{fmt(curTime)}{dur > 0 ? ' / ' + fmt(dur) : ''}</span>
			</div>
			{#if audio}
				<div class="bar" onclick={e => { if (!audio) return; const r = e.currentTarget.getBoundingClientRect(); audio.currentTime = ((e.clientX - r.left) / r.width) * audio.duration; }} role="slider" tabindex="0">
					<div class="fill" style="width:{progress}%"></div>
				</div>
			{/if}
			<div class="ctrl-row">
				<button class="cb" class:on={loop} onclick={toggleLoop}><Icon name="refresh" size={11} color={loop?'var(--teal)':'var(--text-dim)'} /> Loop</button>
				<div class="cc">
					<button class="cb skip" onclick={prev}><Icon name="arrow-right" size={14} color="currentColor" style="transform:rotate(180deg)" /></button>
					<button class="cb stop" onclick={kill}><Icon name="stop" size={16} color="var(--red)" /></button>
					<button class="cb skip" onclick={next}><Icon name="arrow-right" size={14} color="currentColor" /></button>
				</div>
				<div class="vol"><Icon name="mic" size={10} color="var(--text-dim)" /><input type="range" min="0" max="100" value={vol*100} oninput={e => setVolume(e.target.value/100)} class="vs" /></div>
			</div>
		</div>
	{/if}
</div>

<style>
	.player{display:flex;flex-direction:column;gap:10px}
	.tabs{display:flex;gap:6px}
	.tb{flex:1;display:flex;align-items:center;justify-content:center;gap:5px;padding:9px;border-radius:var(--radius-sm);font-size:.72rem;font-weight:700;color:var(--text-soft);border:1px solid var(--card-border);background:var(--card-bg);cursor:pointer;transition:all .15s}
	.tb:hover{border-color:var(--pink)}
	.tb.on{background:var(--teal-soft);border-color:var(--teal);color:var(--teal)}

	.notice{display:flex;align-items:center;gap:5px;padding:8px 10px;background:var(--gold-soft);border:1px solid rgba(245,166,35,.2);border-radius:var(--radius-sm);font-size:.6rem;color:var(--gold);font-weight:600}

	.cats{display:flex;gap:4px;overflow-x:auto;scrollbar-width:none}.cats::-webkit-scrollbar{display:none}
	.cat{padding:6px 12px;border-radius:100px;font-size:.65rem;font-weight:700;color:var(--text-soft);border:1px solid var(--card-border);background:var(--card-bg);cursor:pointer;white-space:nowrap;transition:all .15s;flex-shrink:0}
	.cat:hover{border-color:var(--pink)}.cat.on{background:var(--pink-soft);border-color:var(--pink);color:var(--pink)}

	.grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}

	.tile{background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--radius);padding:12px 10px;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;transition:all .15s;text-align:center;position:relative;overflow:hidden}
	.tile:hover{border-color:var(--pink)}
	.tile.active{border-color:var(--teal);background:var(--teal-soft)}
	.tile-name{font-size:.72rem;font-weight:700;color:var(--text);line-height:1.2}
	.tile-artist{font-size:.58rem;color:var(--text-dim)}
	.tile-play{margin-top:2px;color:var(--text-dim)}
	.tile-state{color:var(--text-dim)}

	.eq{display:flex;align-items:flex-end;gap:2px;height:12px}.eq div{width:3px;border-radius:1px;background:var(--teal);animation:eqm 1s ease-in-out infinite}.eq div:nth-child(2){animation-delay:.15s}.eq div:nth-child(3){animation-delay:.3s}@keyframes eqm{0%,100%{height:4px}50%{height:11px}}

	.ctrl{background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--radius);padding:10px 12px;display:flex;flex-direction:column;gap:6px}
	.ctrl-top{display:flex;align-items:center;justify-content:space-between}
	.np{font-size:.72rem;font-weight:700;color:var(--text)}
	.time{font-size:.55rem;color:var(--text-dim);font-family:'Fraunces',serif}
	.bar{height:3px;background:var(--card-border);border-radius:2px;cursor:pointer}.fill{height:100%;background:linear-gradient(90deg,var(--pink),var(--gold));border-radius:2px;transition:width .2s linear}
	.ctrl-row{display:flex;align-items:center;justify-content:space-between;gap:4px}
	.cc{display:flex;align-items:center;gap:2px}
	.cb{display:flex;align-items:center;gap:3px;padding:4px 8px;border-radius:100px;font-size:.6rem;font-weight:700;color:var(--text-soft);border:1px solid var(--card-border);background:var(--card-bg);cursor:pointer;transition:all .15s}
	.cb:hover{border-color:var(--pink)}.cb.on{border-color:var(--teal);color:var(--teal);background:var(--teal-soft)}
	.skip{border:none;background:none;padding:3px 5px}.skip:disabled{opacity:.3}
	.stop{border-color:rgba(248,113,113,.15);background:rgba(248,113,113,.05);padding:5px 10px}.stop:hover{border-color:var(--red);background:rgba(248,113,113,.1)}
	.vol{display:flex;align-items:center;gap:3px}.vs{width:44px;height:3px;-webkit-appearance:none;appearance:none;background:var(--card-border);border-radius:2px;outline:none;cursor:pointer}.vs::-webkit-slider-thumb{width:10px;height:10px;border-radius:50%;background:var(--text-soft);-webkit-appearance:none;cursor:pointer}
</style>
