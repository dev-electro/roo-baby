<script>
	import { appState } from '$state/appState.svelte.js';
	import { analyze } from '$utils/apiClient.js';
	import { extractAudioFeatures } from '$utils/audioFeatures.js';
	import { playResponse, unlock as ensureAudioResumed } from '$utils/soundGenerator.js';
	import { speak, unlockSpeech } from '$utils/ttsEngine.js';
	import { saveToHistory } from '$utils/historyStore.js';
	import { analyzeCry as trackAnalyze, analyzeError as trackError } from '$utils/analytics.js';
	import Icon from './Icon.svelte';

	const MSGS = {
		HUNGER:'Shh little one… food is on the way.',
		PAIN:'It\'s okay baby… I\'m right here.',
		TIRED:'Sleep now… the world can wait.',
		DISCOMFORT:'Let\'s get comfortable.',
		BURPING:'Good baby… let it out.',
		UNKNOWN:'Shh… everything is okay.',
		INVALID:'Hey! ROO is designed for babies only. Try it on your little one!',
	};

	// What's missing for the disabled hint
	const hint = $derived(() => {
		if (appState.isAnalyzing) return null;
		if (appState.currentMode === 'audio' && !appState.audioBlob) return '🎙️ Record a cry first';
		if (appState.currentMode === 'image' && !appState.imageBlob) return '📸 Capture baby\'s face first';
		if (appState.currentMode === 'both') {
			if (!appState.audioBlob && !appState.imageBlob) return '🎙️ Record + 📸 capture face';
			if (!appState.audioBlob) return '🎙️ Record a cry first';
			if (!appState.imageBlob) return '📸 Capture baby\'s face first';
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

			if (feat?.isProblematic) {
				let reason, action;
				if      (feat.isSilent)          { reason = 'No cry detected — recording is mostly silence. Hold the phone near your baby.'; action = 'Re-record your baby\'s cry closer to the microphone.'; }
				else if (feat.isClipping)         { reason = 'Audio is distorted — microphone signal too loud. Move phone slightly away.'; action = 'Re-record at a moderate distance.'; }
				else if (feat.isTooShort)         { reason = 'Recording too short to analyze. Need at least 1 second.'; action = 'Hold the record button longer.'; }
				else if (feat.isNoise)            { reason = 'Detected ambient noise (static/fan) instead of a cry.'; action = 'Move to a quieter room and try again.'; }
				else if (feat.isMusicLike)        { reason = 'This sounds like music or TV, not a baby cry.'; action = 'Turn off background audio and re-record.'; }
				else if (feat.hasMultipleSources) { reason = 'Multiple overlapping sounds detected — analysis unreliable.'; action = 'Record in a quieter environment with only your baby.'; }
				else if (feat.isOutsideCryRange)  { reason = 'Dominant frequency outside baby cry range (200–1000 Hz).'; action = 'Ensure you\'re recording your baby\'s cry, not other sounds.'; }
				else                              { reason = 'Audio quality too low for reliable analysis.'; action = 'Re-record in a quiet environment.'; }

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
			appState.setError(err.message || 'Analysis failed');
			trackError(appState.currentMode, err.message);
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
			<span class="shimmer-overlay"></span>
			<Icon name="loader" size={20} color="currentColor" />
			Analyzing…
		{:else if processing}
			<Icon name="loader" size={20} color="currentColor" style="animation:spin .8s linear infinite" />
			Preparing…
		{:else if appState.isReady}
			<Icon name="search" size={20} color="currentColor" />
			Understand This Cry
		{:else}
			Waiting for input…
		{/if}

		{#if appState.isReady && !appState.isAnalyzing && !processing}
			<span class="ping-ring"></span>
		{/if}
	</button>

	{#if hint() && !appState.isAnalyzing}
		<p class="btn-hint">{hint()}</p>
	{/if}
</div>

<style>
	.wrap { display:flex; flex-direction:column; align-items:center; gap:8px; width:100%; }

	.btn {
		width:100%; padding:20px;
		border-radius:var(--r-lg);
		font-size:1.05rem; font-weight:800; letter-spacing:.01em;
		color:var(--text-dim); background:var(--surface); border:1px solid var(--border);
		position:relative; overflow:hidden;
		transition:all .25s cubic-bezier(.34,1.56,.64,1);
		display:flex; align-items:center; justify-content:center; gap:10px;
	}

	.btn.ready {
		background:linear-gradient(135deg, var(--lavender), var(--indigo));
		color:#fff; border:none;
		box-shadow:0 8px 28px var(--lav-glow);
		cursor:pointer;
	}
	.btn.ready:hover:not(:disabled) {
		transform:translateY(-2px);
		box-shadow:0 14px 36px var(--lav-glow);
	}
	.btn.ready:active:not(:disabled) { transform:translateY(0); }

	.btn:disabled:not(.ready) { opacity:.55; cursor:not-allowed; }
	.btn.busy { opacity:.7; cursor:wait; border-color:var(--lavender); }

	/* Shimmer on analyzing */
	.shimmer-overlay {
		position:absolute; inset:0;
		background:linear-gradient(90deg, transparent, rgba(255,255,255,.12), transparent);
		background-size:200% 100%;
		animation:shimmer 1.6s ease-in-out infinite;
	}

	/* Ping ring when ready */
	.ping-ring {
		position:absolute; inset:-4px; border-radius:inherit;
		border:2px solid rgba(255,255,255,.3);
		animation:ping 2s ease-out infinite;
		pointer-events:none;
	}

	.btn-hint {
		font-size:.75rem; color:var(--text-dim); font-weight:600; text-align:center;
	}
</style>
