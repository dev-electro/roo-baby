<script>
	import { start, halt, setVol, getVol, isOn, which, unlock } from '$utils/soundGenerator.js';
	import Icon from './Icon.svelte';

	const CATS = [
		{ id:'synth', label:'Synthesized' },
		{ id:'r2',    label:'Audio Files' },
	];

	const SYNTHS = [
		{ id:'whitenoise', name:'White Noise',  icon:'wind',  color:'var(--mint)',    desc:'Constant broadband',    cat:'synth' },
		{ id:'pinknoise',  name:'Pink Noise',   icon:'wave',  color:'var(--lavender)',desc:'Warmer than white',     cat:'synth' },
		{ id:'brownnoise', name:'Brown Noise',  icon:'wave',  color:'#C4A882',        desc:'Deep rumble',           cat:'synth' },
		{ id:'rain',       name:'Rain',         icon:'drop',  color:'#60A5FA',        desc:'Gentle rainfall',       cat:'synth' },
		{ id:'ocean',      name:'Ocean',        icon:'wave',  color:'#34D399',        desc:'Wave rhythms',          cat:'synth' },
		{ id:'heartbeat',  name:'Heartbeat',    icon:'heart', color:'var(--blush)',   desc:'Familiar heartbeat',    cat:'synth' },
		{ id:'lullaby',    name:'Lullaby',      icon:'music', color:'var(--amber)',   desc:'Gentle melody',         cat:'synth' },
		{ id:'shush',      name:'Shush',        icon:'volume',color:'var(--indigo)', desc:'Rhythmic shushing',     cat:'synth' },
		{ id:'womb',       name:'Womb',         icon:'baby',  color:'#F9A8D4',        desc:'Prenatal comfort',      cat:'synth' },
		{ id:'fan',        name:'Fan',           icon:'wind',  color:'#94A3B8',        desc:'Box fan hum',           cat:'synth' },
		{ id:'binaural',   name:'Binaural',     icon:'wave',  color:'var(--indigo)', desc:'Delta wave (headphones)',cat:'synth' },
		{ id:'thunder',    name:'Thunder',      icon:'bolt',  color:'var(--amber)',   desc:'Distant storm',         cat:'synth' },
	];

	import { PUBLIC_R2_BASE } from '$env/static/public';
	const R2 = PUBLIC_R2_BASE || '';

	const R2_TRACKS = R2 ? [
		{ id:'brahms',     name:'Brahms Lullaby', icon:'music',  color:'var(--amber)',   cat:'r2', src:`${R2}/lullabies/brahms.mp3` },
		{ id:'twinkle',    name:'Twinkle Piano',  icon:'star',   color:'var(--lavender)',cat:'r2', src:`${R2}/lullabies/twinkle.mp3` },
		{ id:'ocean-r2',   name:'Ocean Waves',    icon:'wave',   color:'#34D399',        cat:'r2', src:`${R2}/nature/ocean-waves.mp3` },
		{ id:'rain-r2',    name:'Rain on Glass',  icon:'drop',   color:'#60A5FA',        cat:'r2', src:`${R2}/nature/rain-window.mp3` },
		{ id:'fire',       name:'Fireplace',      icon:'bolt',   color:'var(--amber)',   cat:'r2', src:`${R2}/nature/fireplace.mp3` },
		{ id:'crickets',   name:'Summer Night',   icon:'sparkles',color:'var(--mint)',   cat:'r2', src:`${R2}/nature/crickets.mp3` },
		{ id:'whitenoise-r2',name:'White Noise',  icon:'wind',   color:'var(--mint)',    cat:'r2', src:`${R2}/whitenoise/white-noise.mp3` },
		{ id:'pinknoise-r2', name:'Pink Noise',   icon:'wave',   color:'var(--lavender)',cat:'r2', src:`${R2}/whitenoise/pink-noise.mp3` },
		{ id:'womb-r2',    name:'Womb Sounds',    icon:'baby',   color:'#F9A8D4',        cat:'r2', src:`${R2}/heartbeat/womb-ambient.mp3` },
		{ id:'bowl',       name:'Singing Bowl',   icon:'sparkles',color:'var(--lavender)',cat:'r2', src:`${R2}/ambient/singing-bowl.mp3` },
	] : [];

	const ALL = [...SYNTHS, ...R2_TRACKS];

	let activeCat = $state('synth');
	let playing   = $state(null);
	let playingType = $state(null); // 'synth' | 'r2'
	let vol = $state(getVol());
	let loop = $state(true);

	// R2 audio element
	let r2Audio = null;

	function play(t) {
		if (playing === t.id) { stop(); return; }
		stop();
		playing = t.id;
		if (t.cat === 'synth') {
			playingType = 'synth';
			unlock(); start(t.id);
		} else {
			playingType = 'r2';
			r2Audio = new Audio(t.src);
			r2Audio.loop = loop;
			r2Audio.volume = vol;
			r2Audio.play().catch(() => { playing=null; });
			r2Audio.onended = () => { playing=null; };
		}
	}

	function stop() {
		if (playingType === 'synth') halt();
		if (playingType === 'r2' && r2Audio) { r2Audio.pause(); r2Audio.src=''; r2Audio=null; }
		playing = null; playingType = null;
	}

	function changeVol(e) {
		vol = +e.target.value;
		setVol(vol);
		if (r2Audio) r2Audio.volume = vol;
	}

	function toggleLoop() {
		loop = !loop;
		if (r2Audio) r2Audio.loop = loop;
	}

	let visibleTracks = $derived(ALL.filter(t => t.cat === activeCat));
	let playingTrack  = $derived(ALL.find(t => t.id === playing));

	$effect(() => { return () => { stop(); }; });
</script>

<div class="sp">
	<!-- Category tabs -->
	<div class="cats">
		{#each CATS.filter(c => c.id === 'synth' || R2_TRACKS.length) as c}
			<button class="cat" class:on={activeCat===c.id} onclick={() => activeCat=c.id}>
				{c.label}
			</button>
		{/each}
	</div>

	<!-- Grid -->
	<div class="grid">
		{#each visibleTracks as t}
			<button
				class="tile"
				class:active={playing===t.id}
				style="--tc:{t.color}; --ts:{t.color}18"
				onclick={() => play(t)}
			>
				<div class="tile-icon" style="color:{t.color}">
					<Icon name={t.icon} size={22} color="currentColor" />
				</div>
				<span class="tile-name">{t.name}</span>
				{#if t.desc}
					<span class="tile-desc">{t.desc}</span>
				{/if}
				{#if playing===t.id}
					<div class="tile-eq" aria-hidden="true">
						<div></div><div style="animation-delay:.15s"></div><div style="animation-delay:.3s"></div>
					</div>
				{/if}
			</button>
		{/each}
	</div>

	<!-- Now Playing bar -->
	{#if playingTrack}
		<div class="npb animate-up">
			<div class="npb-icon" style="color:{playingTrack.color}">
				<Icon name={playingTrack.icon} size={20} color="currentColor" />
			</div>
			<div class="npb-info">
				<span class="npb-name">{playingTrack.name}</span>
				<div class="npb-wave">
					{#each Array(8) as _,i}
						<div class="npb-bar" style="animation-delay:{i*.12}s"></div>
					{/each}
				</div>
			</div>
			<div class="npb-right">
				{#if playingTrack.cat === 'r2'}
					<button class="npb-ico" onclick={toggleLoop} title={loop?'Loop on':'Loop off'}>
						<Icon name="repeat" size={16} color={loop ? 'var(--lavender)' : 'var(--text-dim)'} />
					</button>
				{/if}
				<button class="npb-stop" onclick={stop}>
					<Icon name="stop" size={14} color="currentColor" />
				</button>
			</div>
		</div>
	{/if}

	<!-- Volume -->
	<div class="vol-row">
		<Icon name="volume" size={15} color="var(--text-dim)" />
		<input type="range" min="0" max="1" step="0.01" value={vol} oninput={changeVol} class="vol-slider" />
		<span class="vol-val">{Math.round(vol*100)}%</span>
	</div>

	{#if playing === 'binaural'}
		<p class="binaural-tip">🎧 Use headphones for binaural beats effect</p>
	{/if}
</div>

<style>
	.sp { display:flex; flex-direction:column; gap:14px; }

	/* Category tabs */
	.cats { display:flex; gap:6px; }
	.cat  {
		padding:6px 16px; border-radius:var(--r-pill);
		font-size:.7rem; font-weight:800; letter-spacing:.04em;
		border:1px solid var(--border); color:var(--text-soft);
		transition:all .18s; background:var(--surface);
	}
	.cat.on { background:var(--lav-soft); border-color:rgba(167,139,250,.35); color:var(--lavender); }
	.cat:hover:not(.on) { border-color:var(--border); color:var(--text); }

	/* Grid */
	.grid {
		display:grid; grid-template-columns:repeat(3,1fr); gap:8px;
	}
	@media(min-width:500px){ .grid { grid-template-columns:repeat(4,1fr); } }
	@media(min-width:720px){ .grid { grid-template-columns:repeat(6,1fr); } }

	/* Tile */
	.tile {
		display:flex; flex-direction:column; align-items:center; gap:5px;
		padding:14px 8px 10px;
		background:var(--surface-2); border:1px solid var(--border);
		border-radius:var(--r-md); position:relative; overflow:hidden;
		cursor:pointer; transition:all .2s; min-height:100px;
	}
	.tile:hover   { border-color:var(--tc); background:var(--ts); }
	.tile.active  { border-color:var(--tc); background:var(--ts); box-shadow:0 0 20px color-mix(in srgb,var(--tc) 30%,transparent); }

	.tile-icon { margin-bottom:2px; }
	.tile-name { font-size:.68rem; font-weight:800; color:var(--text); text-align:center; line-height:1.2; }
	.tile-desc { font-size:.54rem; color:var(--text-dim); text-align:center; line-height:1.3; }

	/* EQ in tile */
	.tile-eq { position:absolute; top:6px; right:6px; display:flex; align-items:flex-end; gap:1.5px; height:10px; }
	.tile-eq div { width:2px; border-radius:1px; background:var(--tc); animation:eq .8s ease-in-out infinite; }

	/* Now playing bar */
	.npb {
		display:flex; align-items:center; gap:10px;
		padding:12px 16px;
		background:var(--surface); border:1px solid var(--border);
		border-radius:var(--r-lg); overflow:hidden;
	}
	.npb-icon { width:40px; height:40px; border-radius:var(--r-sm); background:var(--lav-soft); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
	.npb-info { flex:1; min-width:0; display:flex; flex-direction:column; gap:5px; }
	.npb-name { font-size:.82rem; font-weight:800; color:var(--text); }
	.npb-wave { display:flex; align-items:flex-end; gap:2px; height:14px; }
	.npb-bar  { width:3px; border-radius:100px; background:linear-gradient(180deg, var(--lavender), var(--mint)); animation:wave .8s ease-in-out infinite; transform-origin:bottom; min-height:2px; }
	.npb-right { display:flex; align-items:center; gap:4px; flex-shrink:0; }
	.npb-ico  {
		width:32px; height:32px; border-radius:50%;
		display:flex; align-items:center; justify-content:center;
		transition:background .15s;
	}
	.npb-ico:hover { background:var(--surface-2); }
	.npb-stop {
		width:34px; height:34px; border-radius:50%;
		background:var(--blush-soft); border:1px solid rgba(253,164,175,.2);
		display:flex; align-items:center; justify-content:center;
		color:var(--blush); transition:background .15s;
	}
	.npb-stop:hover { background:rgba(253,164,175,.25); }

	/* Volume */
	.vol-row { display:flex; align-items:center; gap:10px; padding:0 4px; }
	.vol-slider {
		flex:1; -webkit-appearance:none; appearance:none; height:4px;
		border-radius:2px; background:var(--border); cursor:pointer;
		accent-color:var(--lavender);
	}
	.vol-slider::-webkit-slider-thumb { -webkit-appearance:none; width:16px; height:16px; border-radius:50%; background:var(--lavender); }
	.vol-slider::-moz-range-thumb { width:16px; height:16px; border-radius:50%; background:var(--lavender); border:none; }
	.vol-val { font-size:.62rem; font-weight:700; color:var(--text-dim); width:28px; text-align:right; flex-shrink:0; }

	.binaural-tip { font-size:.7rem; color:var(--indigo); text-align:center; font-weight:600; }
</style>
