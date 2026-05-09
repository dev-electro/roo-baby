<script>
	import { start, halt, setVol, getVol, unlock } from '$utils/soundGenerator.js';
	import { categories as R2_CATEGORIES, synths as SYNTH_TRACKS } from '$lib/data/soothingTracks.js';
	import Icon from './Icon.svelte';

	// ── Synth definitions (match soundGenerator CREATORS) ──
	/** @type {Array<{id:string,name:string,desc:string,icon:string,color:string}>} */
	const SYNTHS = SYNTH_TRACKS.length ? SYNTH_TRACKS : [
		{ id:'whitenoise', name:'White Noise',  desc:'Mimics the womb',           icon:'wind',  color:'var(--teal)' },
		{ id:'pinknoise',  name:'Pink Noise',   desc:'Warmer, more calming',       icon:'wave',  color:'var(--sky)' },
		{ id:'brownnoise', name:'Brown Noise',  desc:'Deep rumble',                icon:'wave',  color:'var(--amber)' },
		{ id:'rain',       name:'Gentle Rain',  desc:'Peaceful rainfall',          icon:'drop',  color:'var(--sky)' },
		{ id:'ocean',      name:'Ocean Waves',  desc:'Rolling wave cycles',        icon:'wave',  color:'var(--indigo)' },
		{ id:'heartbeat',  name:'Heartbeat',    desc:'Womb comfort rhythm',        icon:'heart', color:'var(--rose)' },
		{ id:'lullaby',    name:'Lullaby',      desc:'Soft melody tone',           icon:'music', color:'var(--amber)' },
		{ id:'shush',      name:'Shush',        desc:'Rhythmic shushing',          icon:'volume','color':'var(--accent)' },
		{ id:'womb',       name:'Womb',         desc:'Prenatal soundscape',        icon:'baby',  color:'var(--rose)' },
		{ id:'fan',        name:'Fan',          desc:'Box fan hum',                icon:'wind',  color:'var(--text-3)' },
		{ id:'binaural',   name:'Binaural',     desc:'Delta waves (use headphones)',icon:'wave', color:'var(--indigo)' },
		{ id:'thunder',    name:'Thunder',      desc:'Distant storm ambience',     icon:'bolt',  color:'var(--amber)' },
	];

	// ── Active tab: 'synth' or 'music' ──
	let tab = $state('synth');

	// ── Synth state ──
	let synthPlaying  = /** @type {string|null} */ ($state(null));

	// ── R2 Music state ──
	let r2Cat         = $state(R2_CATEGORIES[0]?.id ?? '');
	let r2Playing     = /** @type {string|null} */ ($state(null));
	let r2Audio       = /** @type {HTMLAudioElement|null} */ (null);
	let r2Loading     = $state(false);
	let r2Error       = $state('');
	let r2Loop        = $state(true);
	let r2Progress    = $state(0);
	let r2Duration    = $state(0);

	// ── Shared volume ──
	let vol = $state(getVol());

	// ── R2 available? ──
	const r2Available = R2_CATEGORIES.some(c => c.tracks.some(t => t.url));

	// ────────────────────────────────────────────
	// Synth controls
	// ────────────────────────────────────────────
	/** @param {string} id */
	function playSynth(id) {
		if (synthPlaying === id) { stopSynth(); return; }
		stopR2();
		unlock();
		start(id);
		synthPlaying = id;
	}
	function stopSynth() { halt(); synthPlaying = null; }

	// ────────────────────────────────────────────
	// R2 controls
	// ────────────────────────────────────────────
	/** @param {{ name:string, url:string }} track */
	async function playR2(track) {
		if (!track.url) { r2Error = 'Track not available — run the download script first.'; return; }
		if (r2Playing === track.name) { stopR2(); return; }
		stopSynth();
		stopR2();
		r2Error = '';
		r2Loading = true;
		r2Audio = new Audio(track.url);
		r2Audio.volume = vol;
		r2Audio.loop = r2Loop;
		r2Audio.ontimeupdate = () => { r2Progress = r2Audio?.currentTime ?? 0; };
		r2Audio.onloadedmetadata = () => { r2Duration = r2Audio?.duration ?? 0; };
		r2Audio.onended = () => { r2Playing = null; r2Progress = 0; };
		r2Audio.onerror = () => { r2Error = 'Could not load track. Check R2 configuration.'; r2Loading = false; r2Playing = null; };
		try {
			await r2Audio.play();
			r2Playing = track.name;
		} catch {
			r2Error = 'Playback blocked — tap again to start.';
		} finally {
			r2Loading = false;
		}
	}

	function stopR2() {
		if (r2Audio) { r2Audio.pause(); r2Audio.src = ''; r2Audio = null; }
		r2Playing = null; r2Progress = 0;
	}

	function seekR2(/** @type {Event} */ e) {
		const v = /** @type {HTMLInputElement} */(e.target).valueAsNumber;
		if (r2Audio) r2Audio.currentTime = v;
		r2Progress = v;
	}

	function toggleLoop() {
		r2Loop = !r2Loop;
		if (r2Audio) r2Audio.loop = r2Loop;
	}

	// ────────────────────────────────────────────
	// Volume (shared)
	// ────────────────────────────────────────────
	function changeVol(/** @type {Event} */ e) {
		vol = /** @type {HTMLInputElement} */(e.target).valueAsNumber;
		setVol(vol);
		if (r2Audio) r2Audio.volume = vol;
	}

	// Fmt time
	/** @param {number} s */ function fmt(s) {
		if (!isFinite(s)) return '0:00';
		return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
	}

	let activeCat = $derived(R2_CATEGORIES.find(c => c.id === r2Cat));

	$effect(() => () => { stopSynth(); stopR2(); });
</script>

<div class="sp">

	<!-- ── Tab switcher ── -->
	<div class="sp-tabs">
		<button
			class="sp-tab"
			class:on={tab === 'synth'}
			onclick={() => tab = 'synth'}
		>
			<Icon name="wave" size={14} color="currentColor" />
			Synthesizer
			<span class="sp-tab-count">{SYNTHS.length}</span>
		</button>
		<button
			class="sp-tab"
			class:on={tab === 'music'}
			onclick={() => tab = 'music'}
			disabled={!r2Available}
			title={!r2Available ? 'Set PUBLIC_R2_BASE to enable real music' : undefined}
		>
			<Icon name="music" size={14} color="currentColor" />
			Real Music
			{#if !r2Available}
				<span class="sp-tab-lock">🔒</span>
			{:else}
				<span class="sp-tab-count">{R2_CATEGORIES.reduce((a,c) => a + c.tracks.length, 0)}</span>
			{/if}
		</button>
	</div>

	<!-- ═══════════════════════════════════════
	     SYNTH TAB
	     ═══════════════════════════════════════ -->
	{#if tab === 'synth'}
	<div class="synth-grid">
		{#each SYNTHS as s (s.id)}
			{@const on = synthPlaying === s.id}
			<button
				class="st"
				class:on
				style="--sc:{s.color}"
				onclick={() => playSynth(s.id)}
				title={s.desc}
			>
				<!-- EQ animation when playing -->
				{#if on}
					<div class="st-eq">
						<div></div><div style="animation-delay:.15s"></div><div style="animation-delay:.3s"></div>
					</div>
				{/if}
				<div class="st-icon">
					<Icon name={s.icon} size={18} color={on ? s.color : 'var(--text-3)'} />
				</div>
				<span class="st-name">{s.name}</span>
				<span class="st-desc">{s.desc}</span>
			</button>
		{/each}
	</div>

	{#if synthPlaying === 'binaural'}
		<div class="binaural-tip">
			<Icon name="info" size={13} color="var(--indigo)" />
			Use headphones — binaural beats require stereo separation
		</div>
	{/if}

	<!-- ═══════════════════════════════════════
	     MUSIC TAB
	     ═══════════════════════════════════════ -->
	{:else}
	{#if !r2Available}
		<!-- R2 not configured -->
		<div class="r2-empty">
			<div class="r2-empty-icon">🎵</div>
			<p class="r2-empty-title">Real Music coming soon</p>
			<p class="r2-empty-desc">
				Upload tracks to Cloudflare R2 and set <code>PUBLIC_R2_BASE</code> to unlock lullabies, nature sounds, and more.
			</p>
			<div class="r2-empty-cmd"><code>node scripts/download-audio.mjs</code></div>
		</div>
	{:else}

	<!-- Category selector -->
	<div class="r2-cats">
		{#each R2_CATEGORIES as cat}
			<button
				class="r2-cat"
				class:on={r2Cat === cat.id}
				onclick={() => r2Cat = cat.id}
			>
				<Icon name={cat.icon} size={13} color="currentColor" />
				{cat.name}
			</button>
		{/each}
	</div>

	<!-- Track list -->
	{#if activeCat}
		{#if activeCat.desc}
			<p class="r2-cat-desc">{activeCat.desc}</p>
		{/if}
		<div class="r2-tracks">
			{#each activeCat.tracks as track (track.name)}
				{@const on = r2Playing === track.name}
				<button
					class="r2-track"
					class:on
					class:nourl={!track.url}
					onclick={() => playR2(track)}
					disabled={!track.url}
				>
					<div class="r2-track-icon">
						{#if r2Loading && on}
							<div class="r2-spinner"></div>
						{:else if on}
							<Icon name="pause" size={16} color="var(--accent)" />
						{:else}
							<Icon name="play" size={16} color="var(--text-3)" />
						{/if}
					</div>
					<div class="r2-track-info">
						<span class="r2-track-name">{track.name}</span>
						<span class="r2-track-artist">{track.artist}</span>
					</div>
					{#if on && r2Duration > 0}
						<span class="r2-track-time">{fmt(r2Progress)} / {fmt(r2Duration)}</span>
					{/if}
					{#if !track.url}
						<span class="r2-track-unavail">Not uploaded</span>
					{/if}
				</button>
			{/each}
		</div>

		<!-- Now-playing bar for R2 -->
		{#if r2Playing}
			<div class="r2-npb animate-up">
				<div class="r2-npb-info">
					<span class="r2-npb-name">{r2Playing}</span>
					<div class="r2-npb-wave">
						{#each Array(8) as _,i}
							<div class="r2-npb-bar" style="animation-delay:{i*.09}s"></div>
						{/each}
					</div>
				</div>
				<div class="r2-npb-controls">
					<button
						class="r2-ctrl-btn"
						class:on={r2Loop}
						onclick={toggleLoop}
						title="Loop"
					>
						<Icon name="repeat" size={14} color={r2Loop ? 'var(--accent)' : 'var(--text-3)'} />
					</button>
					<button class="r2-ctrl-stop" onclick={stopR2}>
						<Icon name="stop" size={13} color="currentColor" />
					</button>
				</div>
			</div>

			{#if r2Duration > 0}
				<input
					type="range" min="0" max={r2Duration} step="0.5" value={r2Progress}
					oninput={seekR2}
					class="r2-seek" aria-label="Seek"
				/>
			{/if}
		{/if}

		{#if r2Error}
			<div class="r2-err">
				<Icon name="warning" size={13} color="var(--rose)" /> {r2Error}
			</div>
		{/if}
	{/if}
	{/if}
	{/if}

	<!-- ── Volume row (always visible) ── -->
	<div class="vol-row">
		<Icon name="volume" size={14} color="var(--text-3)" />
		<input
			type="range" min="0" max="1" step="0.01" value={vol}
			oninput={changeVol}
			class="vol-slider"
			aria-label="Volume"
		/>
		<span class="vol-pct">{Math.round(vol * 100)}%</span>
	</div>
</div>

<style>
	.sp { display:flex; flex-direction:column; gap:12px; }

	/* ── Tabs ── */
	.sp-tabs {
		display:grid; grid-template-columns:1fr 1fr;
		gap:4px; padding:4px;
		background:var(--surface-2); border:1px solid var(--border);
		border-radius:var(--r-lg);
	}
	.sp-tab {
		display:flex; align-items:center; justify-content:center; gap:6px;
		padding:10px 8px; border-radius:calc(var(--r-lg) - 3px); min-height:44px;
		font-size:.75rem; font-weight:800; color:var(--text-3);
		transition:all .15s;
	}
	.sp-tab.on  { background:var(--surface); color:var(--text); box-shadow:var(--shadow-sm); border:1px solid var(--border); }
	.sp-tab:hover:not(.on):not(:disabled) { background:var(--surface-3); color:var(--text-2); }
	.sp-tab:disabled { opacity:.4; cursor:not-allowed; }
	.sp-tab-count {
		padding:2px 6px; border-radius:var(--r-pill);
		background:var(--accent-muted); color:var(--accent); border:1px solid var(--accent-border);
		font-size:.55rem; font-weight:800;
	}
	.sp-tab-lock { font-size:.8rem; }

	/* ── Synth Grid ── */
	.synth-grid {
		display:grid; grid-template-columns:repeat(3,1fr); gap:6px;
	}
	@media(min-width:480px) { .synth-grid { grid-template-columns:repeat(4,1fr); } }
	@media(min-width:640px) { .synth-grid { grid-template-columns:repeat(6,1fr); } }

	.st {
		display:flex; flex-direction:column; align-items:center; gap:4px;
		padding:14px 6px 10px; border-radius:var(--r-lg);
		background:var(--surface-2); border:1px solid var(--border);
		position:relative; overflow:hidden; cursor:pointer; min-height:96px;
		transition:border-color .15s, background .15s;
	}
	.st:hover   { border-color:rgba(255,255,255,.1); background:var(--surface-3); }
	.st.on {
		background:color-mix(in srgb, var(--sc) 8%, var(--surface));
		border-color:color-mix(in srgb, var(--sc) 30%, transparent);
	}

	/* EQ bars in top-right */
	.st-eq {
		position:absolute; top:6px; right:6px;
		display:flex; align-items:flex-end; gap:1.5px; height:10px;
	}
	.st-eq div { width:2px; border-radius:1px; background:var(--sc,var(--accent)); animation:eq .7s ease-in-out infinite; }

	.st-icon { margin-bottom:2px; }
	.st-name { font-size:.62rem; font-weight:800; color:var(--text); text-align:center; line-height:1.2; }
	.st-desc { font-size:.48rem; color:var(--text-3); text-align:center; line-height:1.3; }

	.binaural-tip {
		display:flex; align-items:center; gap:6px;
		font-size:.7rem; color:var(--indigo); font-weight:700;
		padding:8px 12px; border-radius:var(--r-md);
		background:var(--indigo-bg); border:1px solid var(--indigo-border);
	}

	/* ── R2 empty state ── */
	.r2-empty {
		display:flex; flex-direction:column; align-items:center; gap:10px;
		padding:32px 20px; text-align:center;
	}
	.r2-empty-icon  { font-size:2.4rem; }
	.r2-empty-title { font-size:1rem; font-weight:800; color:var(--text); }
	.r2-empty-desc  { font-size:.78rem; color:var(--text-2); line-height:1.65; max-width:280px; }
	.r2-empty-cmd {
		padding:8px 16px; border-radius:var(--r-md);
		background:var(--surface-2); border:1px solid var(--border);
		font-size:.7rem; color:var(--accent);
	}
	.r2-empty-cmd code { font-family:monospace; }

	/* ── R2 category pills ── */
	.r2-cats { display:flex; flex-wrap:wrap; gap:6px; }
	.r2-cat {
		display:flex; align-items:center; gap:5px;
		padding:6px 12px; border-radius:var(--r-pill); min-height:36px;
		font-size:.72rem; font-weight:800; color:var(--text-2);
		border:1px solid var(--border); background:var(--surface-2);
		transition:all .12s;
	}
	.r2-cat.on  { background:var(--accent-muted); color:var(--accent); border-color:var(--accent-border); }
	.r2-cat:hover:not(.on) { background:var(--surface-3); color:var(--text); }

	.r2-cat-desc { font-size:.72rem; color:var(--text-3); }

	/* ── R2 Track list ── */
	.r2-tracks { display:flex; flex-direction:column; gap:4px; }
	.r2-track {
		display:flex; align-items:center; gap:12px;
		padding:12px 14px; border-radius:var(--r-md); min-height:56px;
		background:var(--surface-2); border:1px solid var(--border);
		text-align:left; cursor:pointer; transition:all .12s;
	}
	.r2-track:hover:not(.nourl) { border-color:var(--accent-border); background:var(--surface-3); }
	.r2-track.on { background:var(--accent-muted); border-color:var(--accent-border); }
	.r2-track.nourl { opacity:.5; cursor:not-allowed; }

	.r2-track-icon {
		width:36px; height:36px; border-radius:var(--r-sm); flex-shrink:0;
		background:var(--surface-3); display:flex; align-items:center; justify-content:center;
	}
	.r2-track.on .r2-track-icon { background:var(--surface); }

	.r2-spinner {
		width:16px; height:16px;
		border:2px solid var(--border); border-top-color:var(--accent);
		border-radius:50%; animation:spin .7s linear infinite;
	}

	.r2-track-info { flex:1; min-width:0; }
	.r2-track-name   { display:block; font-size:.85rem; font-weight:800; color:var(--text); }
	.r2-track-artist { display:block; font-size:.65rem; color:var(--text-3); margin-top:2px; }
	.r2-track-time   { font-size:.65rem; color:var(--text-2); flex-shrink:0; font-variant-numeric:tabular-nums; }
	.r2-track-unavail{ font-size:.6rem; color:var(--text-3); flex-shrink:0; }

	/* ── R2 Now-playing bar ── */
	.r2-npb {
		display:flex; align-items:center; justify-content:space-between; gap:12px;
		padding:12px 14px;
		background:var(--accent-muted); border:1px solid var(--accent-border);
		border-radius:var(--r-md);
	}
	.r2-npb-info { display:flex; align-items:center; gap:10px; flex:1; }
	.r2-npb-name { font-size:.82rem; font-weight:800; color:var(--accent); }
	.r2-npb-wave { display:flex; align-items:flex-end; gap:2px; height:12px; }
	.r2-npb-bar  {
		width:2.5px; border-radius:1px; background:var(--accent); opacity:.7;
		animation:wave .8s ease-in-out infinite; transform-origin:bottom; min-height:2px;
	}
	.r2-npb-controls { display:flex; align-items:center; gap:6px; flex-shrink:0; }
	.r2-ctrl-btn {
		width:32px; height:32px; border-radius:var(--r-sm);
		display:flex; align-items:center; justify-content:center;
		transition:background .12s;
	}
	.r2-ctrl-btn:hover, .r2-ctrl-btn.on { background:var(--surface-2); }
	.r2-ctrl-stop {
		width:32px; height:32px; border-radius:var(--r-sm);
		display:flex; align-items:center; justify-content:center;
		background:var(--error-bg); color:var(--error); border:1px solid var(--error-border);
	}

	/* Seek bar */
	.r2-seek {
		-webkit-appearance:none; appearance:none; width:100%; height:4px;
		border-radius:2px; background:var(--border); cursor:pointer;
	}
	.r2-seek::-webkit-slider-thumb {
		-webkit-appearance:none; width:14px; height:14px;
		border-radius:50%; background:var(--accent);
	}
	.r2-seek::-moz-range-thumb { width:14px; height:14px; border-radius:50%; background:var(--accent); border:none; }

	/* Error */
	.r2-err {
		display:flex; align-items:center; gap:6px;
		font-size:.72rem; color:var(--rose); font-weight:700;
		padding:8px 12px; border-radius:var(--r-md);
		background:var(--rose-bg); border:1px solid var(--rose-border);
	}

	/* ── Volume ── */
	.vol-row { display:flex; align-items:center; gap:8px; padding-top:4px; border-top:1px solid var(--border); }
	.vol-slider {
		flex:1; -webkit-appearance:none; appearance:none; height:4px;
		border-radius:2px; background:var(--border); cursor:pointer;
	}
	.vol-slider::-webkit-slider-thumb {
		-webkit-appearance:none; width:16px; height:16px;
		border-radius:50%; background:var(--accent);
	}
	.vol-slider::-moz-range-thumb { width:16px; height:16px; border-radius:50%; background:var(--accent); border:none; }
	.vol-pct { font-size:.65rem; font-weight:800; color:var(--text-3); width:30px; text-align:right; flex-shrink:0; }
</style>
