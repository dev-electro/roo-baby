<script>
	import { appState } from '$state/appState.svelte.js';
	import { analyze } from '$utils/apiClient.js';
	import { extractAudioFeatures } from '$utils/audioFeatures.js';
	import { playResponse, unlock as ensureAudioResumed } from '$utils/soundGenerator.js';
	import { speak, unlockSpeech } from '$utils/ttsEngine.js';
	import { saveToHistory } from '$utils/historyStore.js';
	import { analyzeCry as trackAnalyze, analyzeError as trackError } from '$utils/analytics.js';
	import Icon from './Icon.svelte';

	/** @type {Record<string, string>} */
	const MSGS = {
		HUNGER:'Shh little one… food is on the way.',
		PAIN:'It\'s okay baby… I\'m right here.',
		TIRED:'Sleep now… the world can wait.',
		DISCOMFORT:'Let\'s get comfortable.',
		BURPING:'Good baby… let it out.',
		UNKNOWN:'Shh… everything is okay.',
		INVALID:'Hey! ROO is designed for babies only. Try it on your little one!',
	};

	let hint = $derived(() => {
		if (appState.isAnalyzing) return null;
		if (appState.currentMode === 'audio' && !appState.audioBlob) return 'Record audio to start';
		if (appState.currentMode === 'image' && !appState.imageBlob) return 'Capture photo to start';
		if (appState.currentMode === 'both') {
			if (!appState.audioBlob && !appState.imageBlob) return 'Record audio & capture photo';
			if (!appState.audioBlob) return 'Record audio to start';
			if (!appState.imageBlob) return 'Capture photo to start';
		}
		return null;
	});

	let processing = $derived(appState.isConvertingAudio || appState.isGeneratingSpectrogram);

	async function run() {
		if (!appState.isReady || appState.isAnalyzing) return;
		appState.isAnalyzing = true;
		appState.clearError();
		appState.result = null;
		unlockSpeech();
		ensureAudioResumed();
		const rid = appState.resetId;
		try {
			let feat = null;
			if (appState.audioBlob) {
				try { feat = await extractAudioFeatures(appState.audioBlob); } catch {}
			}
			if (appState.resetId !== rid) return;

			if (feat && feat.isProblematic) {
				let reason, action;
				if      (feat.isSilent)          { reason = 'No cry detected — recording is mostly silence.'; action = 'Hold phone closer to baby.'; }
				else if (feat.isClipping)         { reason = 'Audio is distorted — signal too loud.'; action = 'Move phone slightly away.'; }
				else if (feat.isTooShort)         { reason = 'Recording too short.'; action = 'Need at least 1 second.'; }
				else if (feat.isNoise)            { reason = 'Detected ambient noise instead of cry.'; action = 'Move to a quieter room.'; }
				else if (feat.isMusicLike)        { reason = 'Sounds like music or TV.'; action = 'Turn off background audio.'; }
				else if (feat.hasMultipleSources) { reason = 'Multiple overlapping sounds detected.'; action = 'Record in a quieter environment.'; }
				else if (feat.isOutsideCryRange)  { reason = 'Frequency outside baby cry range.'; action = 'Ensure recording your baby.'; }
				else                              { reason = 'Audio quality too low.'; action = 'Re-record quietly.'; }

				appState.result = { category:'UNKNOWN', confidence:0, severity:'NONE', reasoning:reason, parent_action:action, response_sound:'whitenoise', pre_cry:false, pre_cry_message:null, is_adult:false, adult_message:null, _isEdgeCase:true };
				saveToHistory(appState.result);
				return;
			}

			const data = await analyze({
				mode:         appState.currentMode,
				audio:        appState.audioBlob,
				image:        appState.imageBlob,
				spectrogram:  appState.spectrogramBlob,
				audioFeatures:feat,
				userNotes:    appState.userNotes,
			});
			if (appState.resetId !== rid) return;
			appState.result = data;
			saveToHistory(data);
			trackAnalyze(appState.currentMode, data.category, data.confidence);
			if (appState.autoPlaySounds && data.response_sound && data.category !== 'INVALID') {
				playResponse(data.response_sound);
			}
			if (appState.autoPlaySounds && data.category !== 'INVALID') {
				setTimeout(() => speak(MSGS[data.category] || MSGS.UNKNOWN), 1500);
			}
		} catch (err) {
			const e = /** @type {Error} */ (err);
			appState.setError(e.message || 'Analysis failed');
			trackError(appState.currentMode, e.message);
		} finally {
			appState.isAnalyzing = false;
		}
	}
</script>

<div class="wrap">
	<button
		class="btn"
		class:ready={appState.isReady}
		class:busy={processing}
		disabled={!appState.isReady || appState.isAnalyzing || processing}
		onclick={run}
	>
		{#if appState.isAnalyzing}
			<div class="shimmer-overlay"></div>
			<Icon name="loader" size={20} color="currentColor" style="animation:spin .8s linear infinite" />
			Analyzing...
		{:else if processing}
			<Icon name="loader" size={20} color="currentColor" style="animation:spin .8s linear infinite" />
			Preparing...
		{:else if appState.isReady}
			<Icon name="search" size={20} color="currentColor" />
			Analyze Cry
		{:else}
			<Icon name="search" size={20} color="currentColor" />
			Waiting for input
		{/if}
	</button>

	{#if hint() && !appState.isAnalyzing}
		<p class="btn-hint">{hint()}</p>
	{/if}
</div>

<style>
	.wrap { display:flex; flex-direction:column; align-items:center; gap:8px; width:100%; }

	.btn {
		width:100%; padding:18px;
		border-radius:var(--r-sm);
		font-size:1.05rem; font-weight:700; letter-spacing:-0.01em;
		color:var(--text-soft); background:var(--surface); border:1px solid var(--border);
		position:relative; overflow:hidden;
		transition:all .2s;
		display:flex; align-items:center; justify-content:center; gap:10px;
	}

	.btn.ready {
		background:var(--text); color:var(--surface); border-color:transparent;
		box-shadow:var(--shadow-elevated);
	}
	.btn.ready:hover:not(:disabled) {
		transform:translateY(-1px);
		box-shadow:0 8px 30px rgba(255,255,255,0.15); /* Light mode will need inverse if we want this, but shadow is fine */
	}
	[data-theme="light"] .btn.ready:hover:not(:disabled) { box-shadow:0 8px 30px rgba(0,0,0,0.15); }
	.btn.ready:active:not(:disabled) { transform:translateY(0); }

	.btn:disabled:not(.ready) { opacity:0.6; cursor:not-allowed; }
	.btn.busy { opacity:0.8; cursor:wait; border-color:var(--text-dim); }

	/* Subtle shimmer, no neon glow */
	.shimmer-overlay {
		position:absolute; inset:0;
		background:linear-gradient(90deg, transparent, rgba(255,255,255,.2), transparent);
		background-size:200% 100%;
		animation:shimmer 1.6s ease-in-out infinite;
	}
	[data-theme="light"] .shimmer-overlay { background:linear-gradient(90deg, transparent, rgba(0,0,0,.1), transparent); }

	.btn-hint {
		font-size:0.8rem; color:var(--text-dim); font-weight:500; text-align:center;
	}
</style>
