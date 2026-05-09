<script>
	import { onDestroy } from 'svelte';
	import { unlock, setVol, getVol, halt, isOn, start as startSynth } from '$utils/soundGenerator.js';
	import { categories, synths, R2_BASE } from '$lib/data/soothingTracks.js';
	import Icon from './Icon.svelte';

	let tab = $state('synth'); // 'tracks' | 'synth'
	let trackCat = $state(categories[0]?.id || '');

	// Track player
	let audio = $state(null);
	let playing = $state(false);
	let currentTrack = $state(null);
	let loop = $state(true);
	let vol = $state(typeof localStorage !== 'undefined' ? parseFloat(localStorage.getItem('roo-vol')) || 0.5 : 0.5);
	let progress = $state(0);
	let curTime = $state(0);
	let dur = $state(0);
	let tick = null;

	// Synth player
	let synthOn = $state(false);
	let synthType = $state(null);

	$effect(() => { setVol(vol); });

	function fmt(t) {
		const m = Math.floor(t / 60), s = Math.floor(t % 60);
		return `${m}:${s.toString().padStart(2, '0')}`;
	}

	function setVolume(v) {
		vol = v; setVol(v);
		if (audio) audio.volume = v;
		try { localStorage.setItem('roo-vol', v); } catch {}
	}

	function kill() {
		halt();
		if (audio) { audio.pause(); audio.currentTime = 0; audio = null; }
		playing = false; currentTrack = null; progress = 0; curTime = 0; dur = 0;
		synthOn = false; synthType = null;
		if (tick) { clearInterval(tick); tick = null; }
	}

	function playTrack(t) {
		if (currentTrack?.name === t.name && playing) { kill(); return; }
		kill();
		unlock();

		// If no R2 URL, try synth fallback
		if (!t.url) {
			synthType = t.categoryId;
			const s = startSynth(mapCatToSynth(t.categoryId));
			if (s) { synthOn = true; synthType = s.type; currentTrack = t; playing = true; }
			tick = setInterval(() => { if (!isOn()) { kill(); } }, 500);
			return;
		}

		const a = new Audio();
		a.src = t.url; a.loop = loop; a.volume = vol; a.preload = 'auto';

		let loaded = false;
		a.onloadedmetadata = () => { loaded = true; dur = a.duration; a.play().catch(() => {}); };
		a.onerror = () => {
			// Fallback to synth on error
			synthType = t.categoryId;
			const s = startSynth(mapCatToSynth(t.categoryId));
			if (s) { synthOn = true; synthType = s.type; currentTrack = t; playing = true; audio = null; }
		};
		a.onplay = () => { playing = true; currentTrack = t; };
		a.onpause = () => { playing = false; };
		a.onended = () => { if (!a.loop) { playing = false; progress = 0; } };

		tick = setInterval(() => {
			if (audio && !audio.paused) { curTime = audio.currentTime; progress = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0; }
		}, 200);

		audio = a;
		a.play().catch(() => {
			if (!loaded) { synthType = t.categoryId; const s = startSynth(mapCatToSynth(t.categoryId)); if (s) { synthOn = true; synthType = s.type; currentTrack = t; playing = true; audio = null; } }
		});
	}

	function playSynth(s) {
		kill(); unlock();
		const r = startSynth(s.id);
		if (r) { synthOn = true; synthType = r.type; playing = true; currentTrack = { name: s.name, artist: 'Synthesized', categoryName: 'Synth' }; }
		tick = setInterval(() => { if (!isOn()) { kill(); } }, 500);
	}

	function mapCatToSynth(catId) {
		const m = { lullabies: 'lullaby', nature: 'rain', noise: 'whitenoise', heartbeat: 'heartbeat', shush: 'shush' };
		return m[catId] || 'whitenoise';
	}

	function next() {
		const tracks = tab === 'synth' ? synths : (categories.find(c => c.id === trackCat)?.tracks || []);
		if (tracks.length < 2) return;
		const idx = tracks.findIndex(t => t.name === currentTrack?.name);
		const nextT = tracks[(idx + 1) % tracks.length];
		tab === 'synth' ? playSynth(nextT) : playTrack(nextT);
	}
	function prev() {
		const tracks = tab === 'synth' ? synths : (categories.find(c => c.id === trackCat)?.tracks || []);
		if (tracks.length < 2) return;
		const idx = tracks.findIndex(t => t.name === currentTrack?.name);
		const prevT = tracks[(idx - 1 + tracks.length) % tracks.length];
		tab === 'synth' ? playSynth(prevT) : playTrack(prevT);
	}

	function toggleLoop() { loop = !loop; if (audio) audio.loop = loop; }

	onDestroy(() => { kill(); });
</script>

<div class="player">
	<!-- Top-level tabs: Tracks vs Synth -->
	<nav class="tabs">
		<button class="tb" class:on={tab === 'tracks'} onclick={() => tab = 'tracks'}>
			<Icon name="star" size={15} color="currentColor" /> Library
		</button>
		<button class="tb" class:on={tab === 'synth'} onclick={() => tab = 'synth'}>
			<Icon name="bolt" size={15} color="currentColor" /> Synth
		</button>
	</nav>

	{#if tab === 'tracks'}
		{#if !R2_BASE}
			<div class="notice">
				<Icon name="info-circle" size={16} color="var(--text-dim)" />
				<span>Set PUBLIC_R2_BASE env var for audio files. Using synth fallback.</span>
			</div>
		{/if}
		<!-- Category sub-tabs -->
		<nav class="cats">
			{#each categories as cat}
				<button class="cat" class:on={trackCat === cat.id} onclick={() => trackCat = cat.id}>
					<Icon name={cat.icon} size={14} color="currentColor" /> {cat.name}
				</button>
			{/each}
		</nav>
		<!-- Tracks -->
		<div class="list">
			{#each categories.find(c => c.id === trackCat)?.tracks || [] as t, i}
				<button class="item" class:active={currentTrack?.name === t.name && playing} onclick={() => playTrack(t)}>
					<span class="num">{i + 1}</span>
					<div class="body"><div class="name">{t.name}</div><div class="artist">{t.artist}</div></div>
					<div class="state">
						{#if currentTrack?.name === t.name && playing}
							<div class="eq"><div class="b"></div><div class="b" style="animation-delay:.15s"></div><div class="b" style="animation-delay:.3s"></div></div>
						{:else}
							<Icon name="play" size={14} color="var(--text-dim)" />
						{/if}
					</div>
				</button>
			{/each}
		</div>
	{:else}
		<!-- Synth tab -->
		<div class="list">
			{#each synths as s}
				<button class="item" class:active={synthType === s.id && playing} onclick={() => playSynth(s)}>
					<div class="synth-icon" style="color:{s.color}"><Icon name={s.icon} size={20} color="currentColor" /></div>
					<div class="body"><div class="name">{s.name}</div><div class="artist">{s.desc}</div></div>
					<div class="state">
						{#if synthType === s.id && playing}
							<div class="eq"><div class="b"></div><div class="b" style="animation-delay:.15s"></div><div class="b" style="animation-delay:.3s"></div></div>
						{:else}
							<Icon name="play" size={14} color="var(--text-dim)" />
						{/if}
					</div>
				</button>
			{/each}
		</div>
	{/if}

	<!-- Player controls (shown when playing) -->
	{#if playing && currentTrack}
		<div class="ctrl animate-slide">
			<div class="ctrl-top">
				<div class="np"><span class="npl">{currentTrack.artist}</span><span class="npn">{currentTrack.name}</span></div>
				<div class="time">{fmt(curTime)}{dur > 0 ? ' / ' + fmt(dur) : ''}</div>
			</div>
			{#if audio}
				<div class="bar" onclick={e => { if (!audio) return; const r = e.currentTarget.getBoundingClientRect(); audio.currentTime = ((e.clientX - r.left) / r.width) * audio.duration; }} role="slider" tabindex="0">
					<div class="fill" style="width:{progress}%"></div>
				</div>
			{/if}
			<div class="ctrl-row">
				<div class="cl">
					<button class="cb" class:on={loop} onclick={toggleLoop}><Icon name="refresh" size={12} color={loop?'var(--teal)':'var(--text-dim)'} /> <span class="clb">Loop</span></button>
				</div>
				<div class="cc">
					<button class="cb skip" onclick={prev}><Icon name="arrow-right" size={14} color="currentColor" style="transform:rotate(180deg)" /></button>
					<button class="cb stop" onclick={kill}><Icon name="stop" size={16} color="var(--red)" /></button>
					<button class="cb skip" onclick={next}><Icon name="arrow-right" size={14} color="currentColor" /></button>
				</div>
				<div class="cr">
					<div class="vol"><Icon name="mic" size={10} color="var(--text-dim)" /><input type="range" min="0" max="100" value={vol*100} oninput={e => setVolume(e.target.value/100)} class="vs" /></div>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.player{display:flex;flex-direction:column;gap:12px}
	.tabs,.cats{display:flex;gap:5px;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch}
	.tabs::-webkit-scrollbar,.cats::-webkit-scrollbar{display:none}
	.tb,.cat{display:flex;align-items:center;gap:5px;padding:7px 14px;border-radius:100px;font-size:.72rem;font-weight:700;color:var(--text-soft);border:1px solid var(--card-border);background:var(--card-bg);cursor:pointer;white-space:nowrap;transition:all .15s;flex-shrink:0}
	.tb:hover,.cat:hover{border-color:var(--pink)}
	.tb.on{background:var(--teal-soft);border-color:var(--teal);color:var(--teal)}
	.cat.on{background:var(--pink-soft);border-color:var(--pink);color:var(--pink)}

	.notice{display:flex;align-items:center;gap:6px;padding:8px 12px;background:var(--gold-soft);border:1px solid var(--gold);border-radius:var(--radius-sm);font-size:.65rem;color:var(--gold);font-weight:600}

	.list{display:flex;flex-direction:column;gap:5px}
	.item{background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--radius);padding:10px 12px;display:flex;align-items:center;gap:10px;cursor:pointer;transition:all .15s;text-align:left;width:100%}
	.item:hover{border-color:var(--pink)}
	.item.active{border-color:var(--teal);background:var(--teal-soft)}
	.num{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.6rem;font-weight:800;color:var(--text-dim);background:rgba(128,128,128,.06);flex-shrink:0}
	.synth-icon{width:36px;height:36px;border-radius:var(--radius-sm);display:flex;align-items:center;justify-content:center;background:rgba(128,128,128,.04);flex-shrink:0}
	.body{flex:1;min-width:0}.name{font-size:.82rem;font-weight:700;color:var(--text)}.artist{font-size:.62rem;color:var(--text-dim);margin-top:1px}
	.state{flex-shrink:0}
	.eq{display:flex;align-items:flex-end;gap:2px;height:14px}.b{width:3px;border-radius:1px;background:var(--teal);animation:eq 1s ease-in-out infinite}@keyframes eq{0%,100%{height:4px}50%{height:12px}}

	.ctrl{background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--radius-xl);padding:12px 14px;display:flex;flex-direction:column;gap:8px}
	.ctrl-top{display:flex;align-items:center;justify-content:space-between}
	.np{display:flex;flex-direction:column}.npl{font-size:.54rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--text-dim)}.npn{font-size:.78rem;font-weight:700;color:var(--text)}
	.time{font-size:.58rem;color:var(--text-dim);font-family:'Fraunces',serif}
	.bar{height:3px;background:var(--card-border);border-radius:2px;cursor:pointer;overflow:visible}.fill{height:100%;background:linear-gradient(90deg,var(--pink),var(--gold));border-radius:2px;transition:width .2s linear}
	.ctrl-row{display:flex;align-items:center;justify-content:space-between}
	.cl,.cc,.cr{display:flex;align-items:center;gap:4px}
	.cb{display:flex;align-items:center;gap:4px;padding:5px 8px;border-radius:100px;font-size:.62rem;font-weight:700;color:var(--text-soft);border:1px solid var(--card-border);background:var(--card-bg);cursor:pointer;transition:all .15s}
	.cb:hover{border-color:var(--pink)}.cb.on{border-color:var(--teal);color:var(--teal);background:var(--teal-soft)}.clb{font-size:.6rem}
	.skip{border:none;background:none;padding:4px 6px}.skip:disabled{opacity:.3}
	.stop{border-color:rgba(248,113,113,.15);background:rgba(248,113,113,.05);padding:6px 12px}.stop:hover{border-color:var(--red);background:rgba(248,113,113,.1)}
	.vol{display:flex;align-items:center;gap:3px}.vs{width:50px;height:3px;-webkit-appearance:none;appearance:none;background:var(--card-border);border-radius:2px;outline:none;cursor:pointer}
	.vs::-webkit-slider-thumb{width:10px;height:10px;border-radius:50%;background:var(--text-soft);-webkit-appearance:none;cursor:pointer}
</style>
