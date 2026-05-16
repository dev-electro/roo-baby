<script>
	import { start, halt, setVol, getVol, unlock } from '$utils/soundGenerator.js';
	import { categories as R2_CATEGORIES, synths as SYNTH_TRACKS } from '$lib/data/soothingTracks.js';
	import Icon from './Icon.svelte';

	/** @typedef {{ id: string, name: string, icon: string, color: string, cat: string, desc?: string, src?: string }} Track */

	const SYNTHS = /** @type {Track[]} */ (SYNTH_TRACKS.map(t => ({
		...t,
		cat: 'synth'
	})));

	const R2_TRACKS = /** @type {Track[]} */ (R2_CATEGORIES.flatMap(c => 
		c.tracks.map(t => ({
			id: t.name.toLowerCase().replace(/ /g, '-'),
			name: t.name,
			icon: c.icon,
			color: 'var(--accent)',
			cat: 'r2',
			src: t.url,
			desc: t.artist
		}))
	));

	const ALL = /** @type {Track[]} */ ([...SYNTHS, ...R2_TRACKS]);

	let activeCat   = $state('synth');
	let playing     = /** @type {string|null} */ ($state(null));
	let playingType = /** @type {'synth'|'r2'|null} */ ($state(null));
	let vol         = $state(getVol());
	let loop        = $state(true);
	let r2Audio     = /** @type {HTMLAudioElement|null} */ (null);
	
	let r2Progress  = $state(0);
	let r2Duration  = $state(0);

	/** @param {Track} t */
	function play(t) {
		if (playing === t.id) { stopAll(); return; }
		stopAll();
		playing = t.id;
		if (t.cat === 'synth') {
			playingType = 'synth';
			unlock(); start(t.id);
		} else {
			playingType = 'r2';
			r2Audio = new Audio(t.src);
			r2Audio.loop = loop;
			r2Audio.volume = vol;
			r2Audio.ontimeupdate = () => { r2Progress = r2Audio?.currentTime ?? 0; };
			r2Audio.onloadedmetadata = () => { r2Duration = r2Audio?.duration ?? 0; };
			r2Audio.play().catch(() => { playing = null; });
			r2Audio.onended = () => { playing = null; r2Progress = 0; };
		}
	}

	function stopAll() {
		if (playingType === 'synth') halt();
		if (playingType === 'r2' && r2Audio) { r2Audio.pause(); r2Audio.src = ''; r2Audio = null; }
		playing = null; playingType = null;
		r2Progress = 0;
	}

	/** @param {Event} e */
	function changeVol(e) {
		vol = /** @type {HTMLInputElement} */(e.target).valueAsNumber;
		setVol(vol);
		if (r2Audio) r2Audio.volume = vol;
	}

	function toggleLoop() {
		loop = !loop;
		if (r2Audio) r2Audio.loop = loop;
	}

	function seekR2(/** @type {Event} */ e) {
		const v = /** @type {HTMLInputElement} */(e.target).valueAsNumber;
		if (r2Audio) r2Audio.currentTime = v;
		r2Progress = v;
	}

	/** @param {number} s */ function fmt(s) {
		if (!isFinite(s)) return '0:00';
		return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
	}

	let visibleTracks = $derived(ALL.filter(t => t.cat === activeCat));
	let playingTrack  = $derived(ALL.find(t => t.id === playing) ?? null);

	$effect(() => () => { stopAll(); });
</script>

<div class="sp">

	<!-- Category tabs -->
	{#if R2_TRACKS.length > 0}
		<div class="cats">
			{#each [{ id:'synth', label:'Synthesized', icon:'wave' }, { id:'r2', label:'Audio Files', icon:'music' }] as c}
				<button class="cat-tab" class:on={activeCat === c.id} onclick={() => activeCat = c.id}>
					<Icon name={c.icon} size={13} color="currentColor" />
					{c.label}
				</button>
			{/each}
		</div>
	{/if}

	<!-- Sound grid -->
	<div class="grid">
		{#each visibleTracks as t (t.id)}
			<button
				class="tile"
				class:active={playing === t.id}
				onclick={() => play(t)}
				title={t.desc ?? t.name}
			>
				<div class="tile-icon">
					<Icon name={t.icon} size={20} color={playing === t.id ? t.color : 'var(--text-2)'} />
				</div>
				<span class="tile-name">{t.name}</span>
				{#if t.desc}
					<span class="tile-desc">{t.desc}</span>
				{/if}
				{#if playing === t.id}
					<div class="tile-eq" style="--ec:{t.color}" aria-hidden="true">
						<div></div><div style="animation-delay:.15s"></div><div style="animation-delay:.3s"></div>
					</div>
				{/if}
			</button>
		{/each}
	</div>

	<!-- Now-playing bar -->
	{#if playingTrack}
		<div class="npb animate-up">
			<div class="npb-top">
				<div class="npb-icon">
					<Icon name={playingTrack.icon} size={18} color={playingTrack.color} />
				</div>
				<div class="npb-info">
					<span class="npb-name">{playingTrack.name}</span>
					<div class="npb-wave">
						{#each Array(10) as _, i}
							<div class="npb-bar" style="animation-delay:{i * .08}s"></div>
						{/each}
					</div>
				</div>
				<div class="npb-actions">
					{#if playingTrack.cat === 'r2'}
						<button
							class="npb-ico"
							class:active={loop}
							onclick={toggleLoop}
							title={loop ? 'Looping' : 'Loop off'}
						>
							<Icon name="repeat" size={14} color={loop ? 'var(--accent)' : 'var(--text-3)'} />
						</button>
					{/if}
					<button class="npb-stop" onclick={stopAll}>
						<Icon name="stop" size={13} color="currentColor" />
					</button>
				</div>
			</div>
			
			{#if playingTrack.cat === 'r2' && r2Duration > 0}
				<div class="npb-seek-row">
					<span class="npb-time">{fmt(r2Progress)}</span>
					<input
						type="range" min="0" max={r2Duration} step="0.5" value={r2Progress}
						oninput={seekR2}
						class="npb-seek" aria-label="Seek"
					/>
					<span class="npb-time">{fmt(r2Duration)}</span>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Volume row -->
	<div class="vol-row">
		<Icon name="volume" size={14} color="var(--text-3)" />
		<input
			type="range" min="0" max="1" step="0.01" value={vol}
			oninput={changeVol}
			class="vol-slider"
			aria-label="Volume"
		/>
		<span class="vol-val">{Math.round(vol * 100)}%</span>
	</div>

	{#if playing === 'binaural'}
		<p class="binaural-tip">
			<Icon name="info" size={12} color="var(--info)" />
			Use headphones for binaural beats effect
		</p>
	{/if}
</div>

<style>
	.sp { display: flex; flex-direction: column; gap: 12px; }

	/* Category tabs */
	.cats { display: flex; gap: 4px; }
	.cat-tab {
		display: flex; align-items: center; justify-content: center; gap: 6px; flex: 1;
		padding: 8px 12px; border-radius: var(--r-md);
		font-size: .75rem; font-weight: 800; letter-spacing: .02em;
		border: 1px solid var(--border); color: var(--text-2);
		background: var(--surface-2); transition: all .15s; cursor: pointer;
	}
	.cat-tab.on   { background: var(--accent-muted); border-color: var(--accent-border); color: var(--accent); }
	.cat-tab:hover:not(.on) { background: var(--surface-3); color: var(--text); }

	/* Grid */
	.grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 6px;
	}
	@media(min-width: 480px) { .grid { grid-template-columns: repeat(4, 1fr); } }
	@media(min-width: 680px) { .grid { grid-template-columns: repeat(6, 1fr); } }

	/* Tile */
	.tile {
		display: flex; flex-direction: column; align-items: center; gap: 4px;
		padding: 12px 6px 8px;
		background: var(--surface-2); border: 1px solid var(--border);
		border-radius: var(--r-md); position: relative; overflow: hidden;
		cursor: pointer; min-height: 90px;
		transition: border-color .15s, background .15s;
	}
	.tile:hover   { border-color: var(--accent-border); background: var(--surface-3); }
	.tile.active  {
		border-color: color-mix(in srgb, var(--accent) 30%, transparent);
		background: color-mix(in srgb, var(--accent) 8%, var(--surface));
	}

	.tile-icon { margin-bottom: 2px; }
	.tile-name { font-size: .65rem; font-weight: 800; color: var(--text); text-align: center; line-height: 1.2; }
	.tile-desc { font-size: .5rem; color: var(--text-3); text-align: center; line-height: 1.3; }

	/* EQ bars */
	.tile-eq {
		position: absolute; top: 5px; right: 5px;
		display: flex; align-items: flex-end; gap: 1.5px; height: 10px;
	}
	.tile-eq div {
		width: 2px; border-radius: 1px; background: var(--ec, var(--accent));
		animation: eq .7s ease-in-out infinite;
	}

	/* Now-playing bar */
	.npb {
		display: flex; flex-direction: column; gap: 10px;
		padding: 10px 14px;
		background: var(--surface-2); border: 1px solid var(--accent-border);
		border-radius: var(--r-md);
	}
	.npb-top {
		display: flex; align-items: center; gap: 10px;
	}
	.npb-icon {
		width: 36px; height: 36px; border-radius: var(--r-sm);
		background: var(--surface); border: 1px solid var(--border);
		display: flex; align-items: center; justify-content: center; flex-shrink: 0;
	}
	.npb-info   { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
	.npb-name   { font-size: .78rem; font-weight: 800; color: var(--text); }
	.npb-wave   { display: flex; align-items: flex-end; gap: 2px; height: 12px; }
	.npb-bar    {
		width: 2.5px; border-radius: 1px;
		background: var(--accent); opacity: .7;
		animation: wave .8s ease-in-out infinite;
		transform-origin: bottom; min-height: 2px;
	}
	.npb-actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
	.npb-ico {
		width: 30px; height: 30px; border-radius: var(--r-sm);
		display: flex; align-items: center; justify-content: center;
		color: var(--text-3); transition: background .12s;
	}
	.npb-ico:hover, .npb-ico.active { background: var(--surface-3); color: var(--accent); }
	.npb-stop {
		width: 30px; height: 30px; border-radius: var(--r-sm);
		display: flex; align-items: center; justify-content: center;
		background: var(--error-bg); color: var(--error); border: 1px solid var(--error-border);
		transition: background .12s;
	}
	.npb-stop:hover { background: var(--error-border); }

	/* Seek bar */
	.npb-seek-row {
		display: flex; align-items: center; gap: 8px;
	}
	.npb-time { font-size: .65rem; color: var(--text-3); font-variant-numeric: tabular-nums; flex-shrink: 0; }
	.npb-seek {
		-webkit-appearance: none; appearance: none; width: 100%; height: 4px;
		border-radius: 2px; background: var(--border); cursor: pointer; flex: 1;
	}
	.npb-seek::-webkit-slider-thumb {
		-webkit-appearance: none; width: 14px; height: 14px;
		border-radius: 50%; background: var(--accent);
	}
	.npb-seek::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%; background: var(--accent); border: none; }

	/* Volume */
	.vol-row { display: flex; align-items: center; gap: 8px; }
	.vol-slider {
		flex: 1; -webkit-appearance: none; appearance: none; height: 4px;
		border-radius: 2px; background: var(--border); cursor: pointer;
	}
	.vol-slider::-webkit-slider-thumb {
		-webkit-appearance: none; width: 14px; height: 14px;
		border-radius: 50%; background: var(--text-2); cursor: pointer;
	}
	.vol-slider::-moz-range-thumb {
		width: 14px; height: 14px; border-radius: 50%; background: var(--text-2); border: none;
	}
	.vol-val { font-size: .62rem; font-weight: 800; color: var(--text-3); width: 28px; text-align: right; flex-shrink: 0; }

	.binaural-tip {
		display: flex; align-items: center; gap: 5px;
		font-size: .68rem; color: var(--info); font-weight: 700;
		padding: 6px 10px; border-radius: var(--r-md);
		background: var(--info-bg); border: 1px solid var(--info-border);
	}
</style>
