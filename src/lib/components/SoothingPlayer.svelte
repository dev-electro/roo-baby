<script>
	import Icon from './Icon.svelte';
	import { unlock as ensureAudioResumed, playResponse, stopResponse } from '$utils/soundGenerator.js';
	import { appState } from '$state/appState.svelte.js';
	import { onMount, onDestroy } from 'svelte';

	// We have Synths and Nature tracks
	const SYNTHS = [
		{ id:'whitenoise',  name:'White Noise', icon:'radio' },
		{ id:'pinknoise',   name:'Pink Noise',  icon:'wind' },
		{ id:'brownnoise',  name:'Brown Noise', icon:'cloud-rain' },
		{ id:'heartbeat',   name:'Heartbeat',   icon:'heart' },
		{ id:'womb',        name:'Womb Sim',    icon:'circle' },
		{ id:'shush',       name:'Shusher',     icon:'mic' },
		{ id:'fan',         name:'Box Fan',     icon:'loader' },
		{ id:'thunder',     name:'Thunder',     icon:'cloud-lightning' },
		{ id:'binaural',    name:'Binaural',    icon:'headphones' },
		{ id:'lullaby',     name:'Lullaby',     icon:'music' }
	];

	// Remote R2 tracks
	const NATURE = [
		{ id:'nature_stream', name:'Forest Stream', url:'https://assets.roo-baby.com/stream.mp3' },
		{ id:'nature_rain',   name:'Gentle Rain',   url:'https://assets.roo-baby.com/rain.mp3' },
		{ id:'nature_ocean',  name:'Ocean Waves',   url:'https://assets.roo-baby.com/ocean.mp3' }
	];

	let tab = $state('synth');
	let vol = $state(80);
	
	let playingId = $state(null);
	let isPlaying = $state(false);
	
	// Remote audio handling
	let audioEl = null;

	let checkInterval;
	onMount(() => {
		checkInterval = setInterval(() => {
			if (appState.currentResponseSound && appState.isPlayingResponse) {
				playingId = appState.currentResponseSound;
				isPlaying = true;
			} else if (audioEl && !audioEl.paused) {
				isPlaying = true;
			} else {
				isPlaying = false;
				playingId = null;
			}
		}, 200);
	});
	onDestroy(() => {
		clearInterval(checkInterval);
		if (audioEl) { audioEl.pause(); audioEl = null; }
	});

	function toggleSynth(id) {
		ensureAudioResumed();
		if (audioEl) { audioEl.pause(); } // Stop remote if playing
		
		if (playingId === id && appState.isPlayingResponse) {
			stopResponse();
			playingId = null;
		} else {
			appState.currentResponseSound = id;
			playResponse(id);
			playingId = id;
		}
	}

	function toggleNature(track) {
		if (appState.isPlayingResponse) stopResponse();
		
		if (!audioEl) {
			audioEl = new Audio();
			audioEl.loop = true;
		}

		if (playingId === track.id && !audioEl.paused) {
			audioEl.pause();
			playingId = null;
		} else {
			audioEl.src = track.url;
			audioEl.volume = vol / 100;
			audioEl.play().catch(e => console.error("Audio block:", e));
			playingId = track.id;
		}
	}

	$effect(() => {
		// sync volume
		if (audioEl) audioEl.volume = vol / 100;
		// synth volume is global for now, handled via gain nodes internally if we add it to soundGen
	});
</script>

<div class="sp-wrap">
	<!-- Tab Bar -->
	<div class="sp-tabs">
		<button class="sp-tab" class:active={tab==='synth'} onclick={()=>tab='synth'}>Generator</button>
		<button class="sp-tab" class:active={tab==='nature'} onclick={()=>tab='nature'}>Premium Tracks</button>
	</div>

	<!-- Content -->
	<div class="sp-body">
		{#if tab === 'synth'}
			<div class="grid">
				{#each SYNTHS as s}
					<button class="t-btn" class:active={playingId === s.id} onclick={()=>toggleSynth(s.id)}>
						<div class="t-icon"><Icon name={s.icon} size={24} color="currentColor" /></div>
						<span class="t-lbl">{s.name}</span>
						{#if playingId === s.id}
							<div class="eq-mini"><span></span><span></span><span></span></div>
						{/if}
					</button>
				{/each}
			</div>
		{:else}
			<div class="list">
				{#each NATURE as n}
					<div class="l-item" class:active={playingId === n.id}>
						<div class="l-info">
							<div class="l-icon"><Icon name="music" size={20} color="currentColor"/></div>
							<span class="l-lbl">{n.name}</span>
						</div>
						<button class="play-btn" onclick={()=>toggleNature(n)}>
							<Icon name={playingId === n.id ? "stop" : "play"} size={16} color="currentColor" />
						</button>
					</div>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Controls -->
	<div class="sp-foot">
		<div class="vol-wrap">
			<Icon name="volume-2" size={18} color="var(--text-soft)" />
			<input type="range" class="vol-slider" min="0" max="100" bind:value={vol} />
		</div>
		{#if isPlaying}
			<button class="stop-all" onclick={() => { stopResponse(); if(audioEl) audioEl.pause(); }}>
				Stop
			</button>
		{/if}
	</div>
</div>

<style>
	.sp-wrap {
		background:var(--surface); border:1px solid var(--border); border-radius:var(--r-md);
		overflow:hidden; display:flex; flex-direction:column; box-shadow:var(--shadow-card);
	}
	
	.sp-tabs { display:flex; background:var(--surface-2); border-bottom:1px solid var(--border); }
	.sp-tab {
		flex:1; padding:16px; font-size:0.9rem; font-weight:600; color:var(--text-soft);
		border-bottom:2px solid transparent; transition:all .2s;
	}
	.sp-tab:hover { color:var(--text); }
	.sp-tab.active { color:var(--primary); border-bottom-color:var(--primary); background:var(--surface); }

	.sp-body { padding:20px; }

	/* Grid for synths */
	.grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(100px, 1fr)); gap:12px; }
	.t-btn {
		display:flex; flex-direction:column; align-items:center; gap:8px; padding:16px 8px;
		background:var(--surface-2); border:1px solid var(--border); border-radius:var(--r-sm);
		color:var(--text-soft); transition:all .2s; position:relative;
	}
	.t-btn:hover { background:var(--border-soft); color:var(--text); }
	.t-btn.active { background:var(--primary-soft); border-color:var(--primary); color:var(--primary); }
	.t-icon { margin-bottom:4px; }
	.t-lbl { font-size:0.8rem; font-weight:600; text-align:center; }

	/* List for nature */
	.list { display:flex; flex-direction:column; gap:8px; }
	.l-item {
		display:flex; justify-content:space-between; align-items:center; padding:12px 16px;
		background:var(--surface-2); border:1px solid var(--border); border-radius:var(--r-sm);
		transition:all .2s;
	}
	.l-item.active { background:var(--primary-soft); border-color:var(--primary); }
	.l-info { display:flex; align-items:center; gap:12px; color:var(--text); font-weight:600; font-size:0.95rem; }
	.l-icon { width:32px; height:32px; border-radius:50%; background:var(--surface); display:flex; align-items:center; justify-content:center; color:var(--primary); }
	.play-btn {
		width:36px; height:36px; border-radius:50%; background:var(--text); color:var(--surface);
		display:flex; align-items:center; justify-content:center; transition:transform .1s;
	}
	.play-btn:active { transform:scale(0.9); }

	.sp-foot {
		padding:16px 20px; border-top:1px solid var(--border); background:var(--surface-2);
		display:flex; justify-content:space-between; align-items:center; gap:16px;
	}
	.vol-wrap { display:flex; align-items:center; gap:12px; flex:1; max-width:200px; }
	.vol-slider {
		-webkit-appearance:none; appearance:none; width:100%; height:4px; border-radius:2px;
		background:var(--border); outline:none;
	}
	.vol-slider::-webkit-slider-thumb {
		-webkit-appearance:none; appearance:none; width:16px; height:16px; border-radius:50%;
		background:var(--text); cursor:pointer;
	}
	
	.stop-all {
		padding:8px 16px; border-radius:var(--r-xs); background:var(--blush-soft); color:var(--blush);
		font-size:0.85rem; font-weight:600; border:1px solid var(--blush);
	}

	.eq-mini { position:absolute; top:8px; right:8px; display:flex; gap:2px; height:10px; }
	.eq-mini span { display:block; width:2px; background:currentColor; border-radius:1px; animation:eq .8s ease-in-out infinite alternate; }
	.eq-mini span:nth-child(2) { animation-delay:.2s; }
	.eq-mini span:nth-child(3) { animation-delay:.4s; }
</style>
