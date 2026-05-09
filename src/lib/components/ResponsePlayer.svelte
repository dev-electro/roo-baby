<script>
	import { appState } from '$state/appState.svelte.js';
	import { playResponse, stopResponse, unlock as ensureAudioResumed } from '$utils/soundGenerator.js';
	import { speak, stopSpeak } from '$utils/ttsEngine.js';
	import Icon from './Icon.svelte';
	import { onDestroy, onMount } from 'svelte';

	let { result } = $props();

	/** @type {Record<string, string>} */
	const MSGS = {
		HUNGER: 'Shh little one… food is on the way.',
		PAIN: 'It\'s okay baby… I\'m right here.',
		TIRED: 'Sleep now… the world can wait.',
		DISCOMFORT: 'Let\'s get comfortable.',
		BURPING: 'Good baby… let it out.',
		UNKNOWN: 'Shh… everything is okay.'
	};

	let playingState = $state({ snd: false, tts: false });
	let ttsSupported = $state(true);
	let checkInterval;

	onMount(() => {
		ttsSupported = 'speechSynthesis' in window;
		checkInterval = setInterval(() => {
			playingState = {
				snd: appState.isPlayingResponse,
				tts: appState.isSpeaking
			};
		}, 200);
	});

	onDestroy(() => {
		clearInterval(checkInterval);
	});

	const SOUNDS = [
		{ id:'whitenoise', lbl:'White', icon:'radio' },
		{ id:'pinknoise', lbl:'Pink', icon:'wind' },
		{ id:'brownnoise', lbl:'Brown', icon:'cloud-rain' },
		{ id:'lullaby', lbl:'Lullaby', icon:'music' }
	];

	function toggleSnd(id) {
		ensureAudioResumed();
		if (playingState.snd && appState.currentResponseSound === id) stopResponse();
		else playResponse(id);
	}

	function toggleTts() {
		if (playingState.tts) stopSpeak();
		else speak(MSGS[result?.category] || MSGS.UNKNOWN);
	}
</script>

<div class="rp-card animate-in">
	<div class="rp-head">
		<h3 class="rp-title">Soothing Suggestions</h3>
		{#if playingState.snd || playingState.tts}
			<div class="eq-mini">
				<span></span><span></span><span></span>
			</div>
		{/if}
	</div>

	<div class="rp-grid">
		{#each SOUNDS as s}
			<button
				class="snd-btn"
				class:active={playingState.snd && appState.currentResponseSound === s.id}
				onclick={() => toggleSnd(s.id)}
			>
				<Icon name={s.icon} size={20} color="currentColor" />
				<span class="snd-lbl">{s.lbl}</span>
				{#if playingState.snd && appState.currentResponseSound === s.id}
					<div class="act-dot"></div>
				{/if}
			</button>
		{/each}

		{#if ttsSupported && result?.category !== 'INVALID' && MSGS[result?.category]}
			<button
				class="snd-btn tts-btn"
				class:active={playingState.tts}
				onclick={toggleTts}
			>
				<Icon name="message-circle" size={20} color="currentColor" />
				<span class="snd-lbl">Voice</span>
				{#if playingState.tts}
					<div class="act-dot"></div>
				{/if}
			</button>
		{/if}
	</div>
</div>

<style>
	.rp-card {
		background:var(--surface); border:1px solid var(--border); border-radius:var(--r-md);
		padding:20px; display:flex; flex-direction:column; gap:16px;
		box-shadow:var(--shadow-card);
	}
	.rp-head { display:flex; justify-content:space-between; align-items:center; }
	.rp-title { font-size:1.05rem; font-weight:700; color:var(--text); margin:0; }

	.rp-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(100px, 1fr)); gap:10px; }

	.snd-btn {
		display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px;
		padding:16px 12px; border-radius:var(--r-sm); background:var(--surface-2); border:1px solid var(--border);
		color:var(--text-soft); font-weight:600; font-size:0.85rem; transition:all 0.2s; position:relative;
	}
	.snd-btn:hover { background:var(--border-soft); color:var(--text); }
	.snd-btn.active { background:var(--primary-soft); border-color:var(--primary); color:var(--primary); }

	.tts-btn { grid-column:1 / -1; flex-direction:row; padding:12px; }

	.act-dot { position:absolute; top:8px; right:8px; width:6px; height:6px; border-radius:50%; background:var(--primary); animation:pulse-glow 1.5s infinite; }

	.eq-mini { display:flex; align-items:center; gap:3px; height:12px; }
	.eq-mini span { display:block; width:3px; background:var(--primary); border-radius:2px; animation:eq .8s ease-in-out infinite alternate; }
	.eq-mini span:nth-child(2) { animation-delay:.2s; }
	.eq-mini span:nth-child(3) { animation-delay:.4s; }
</style>
