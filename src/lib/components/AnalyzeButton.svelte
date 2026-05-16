<script>
	import { appState } from '$state/appState.svelte.js';
	import { analyze } from '$utils/apiClient.js';
	import { extractAudioFeatures } from '$utils/audioFeatures.js';
	import { playResponse, unlock as ensureAudio } from '$utils/soundGenerator.js';
	import { speak, unlockSpeech } from '$utils/ttsEngine.js';
	import { saveToHistory } from '$utils/historyStore.js';
	import { trackAnalyze, trackError } from '$utils/analytics.js';
	import Icon from './Icon.svelte';

	const MSGS = {
		HUNGER:'Shh little one… food is on the way.',
		PAIN:'It\'s okay baby… I\'m right here.',
		TIRED:'Sleep now… the world can wait.',
		DISCOMFORT:'Let\'s get comfortable.',
		BURPING:'Good baby… let it out.',
		UNKNOWN:'Shh… everything is okay.',
		INVALID:'ROO is designed for babies. Try it on your little one!',
	};

	let hint = $derived(() => {
		if (appState.isAnalyzing) return null;
		if (appState.currentMode === 'audio' && !appState.audioBlob) return 'Record a cry first';
		if (appState.currentMode === 'image' && !appState.imageBlob) return 'Capture baby\'s face first';
		if (appState.currentMode === 'both') {
			if (!appState.audioBlob && !appState.imageBlob) return 'Record a cry and capture a photo';
			if (!appState.audioBlob) return 'Record a cry first';
			if (!appState.imageBlob) return 'Capture baby\'s face first';
		}
		return null;
	});

	let preparing = $derived(appState.isConvertingAudio || appState.isGeneratingSpectrogram);

	async function run() {
		if (!appState.isReady || appState.isAnalyzing) return;
		appState.isAnalyzing = true;
		appState.clearError();
		appState.result = null;
		unlockSpeech(); ensureAudio();
		const rid = appState.resetId;
		try {
			let feat = null;
			if (appState.audioBlob) {
				try { feat = await extractAudioFeatures(appState.audioBlob); } catch {}
			}
			if (appState.resetId !== rid) return;
			if (feat?.isProblematic && appState.currentMode !== 'both') {
				let reason = 'Audio quality too low for reliable analysis.';
				let action = 'Re-record in a quiet environment.';
				if (feat.isSilent)          { reason = 'No cry detected — mostly silence.'; action = 'Hold phone near your baby and try again.'; }
				else if (feat.isClipping)    { reason = 'Audio distorted — too loud.'; action = 'Move phone slightly away and re-record.'; }
				else if (feat.isTooShort)    { reason = 'Recording too short.'; action = 'Hold the record button a bit longer.'; }
				else if (feat.isNoise)       { reason = 'Ambient noise detected instead of a cry.'; action = 'Move to a quieter room and try again.'; }
				appState.result = { category:'UNKNOWN', confidence:0, severity:'NONE', reasoning:reason, parent_action:action, response_sound:'whitenoise', pre_cry:false, pre_cry_message:null, is_adult:false, adult_message:null, _isEdgeCase:true };
				saveToHistory(appState.result);
				return;
			}
			const data = await analyze({ mode:appState.currentMode, audio:appState.audioBlob, image:appState.imageBlob, spectrogram:appState.spectrogramBlob, audioFeatures:feat, userNotes:appState.userNotes });
			if (appState.resetId !== rid) return;
			appState.result = data;
			saveToHistory(data);
			trackAnalyze(appState.currentMode, data.category, data.confidence);
			if (appState.autoPlaySounds && data.response_sound && data.category !== 'INVALID') playResponse(data.response_sound);
			if (appState.autoPlaySounds && data.category !== 'INVALID') setTimeout(() => speak(MSGS[data.category] || MSGS.UNKNOWN), 1500);
		} catch (/** @type {any} */ err) {
			appState.setError(err.message || 'Analysis failed');
			trackError(appState.currentMode, err.message);
		} finally {
			appState.isAnalyzing = false;
		}
	}
</script>

<div class="ab">
	<button
		class="ab-btn"
		class:ready={appState.isReady && !preparing}
		class:analyzing={appState.isAnalyzing}
		disabled={!appState.isReady || appState.isAnalyzing || preparing}
		onclick={run}
	>
		{#if appState.isAnalyzing}
			<div class="ab-spinner"></div>
			<span>Analyzing…</span>
		{:else if preparing}
			<div class="ab-spinner" style="border-top-color:var(--text-2)"></div>
			<span>Preparing…</span>
		{:else if appState.isReady}
			<Icon name="search" size={22} color="#fff" />
			<span>Analyze This Cry</span>
			<div class="ab-ping"></div>
		{:else}
			<Icon name="search" size={22} color="var(--text-3)" />
			<span>Analyze This Cry</span>
		{/if}
	</button>

	{#if hint() && !appState.isAnalyzing}
		<p class="ab-hint">
			<Icon name="info" size={13} color="currentColor" />
			{hint()}
		</p>
	{/if}
</div>

<style>
	.ab { display: flex; flex-direction: column; align-items: stretch; gap: 10px; }

	.ab-btn {
		width: 100%; height: 68px; /* big thumb-friendly CTA */
		border-radius: var(--r-xl);
		display: flex; align-items: center; justify-content: center; gap: 12px;
		font-size: 1.1rem; font-weight: 800; letter-spacing: .01em;
		position: relative; overflow: hidden;
		/* Default: disabled look */
		background: var(--surface-2);
		color: var(--text-3); border: 1px solid var(--border);
		transition: background .2s, box-shadow .2s, transform .1s;
	}

	/* Ready state */
	.ab-btn.ready {
		background: var(--accent); color: #fff; border: none;
		box-shadow: 0 6px 28px var(--accent-glow);
	}
	.ab-btn.ready:hover:not(:disabled) {
		background: var(--accent-2);
		box-shadow: 0 10px 36px var(--accent-glow);
		transform: translateY(-1px);
	}
	.ab-btn.ready:active:not(:disabled) { transform: scale(.98); }

	/* Analyzing state */
	.ab-btn.analyzing {
		background: var(--accent-muted);
		color: var(--accent); border: 1px solid var(--accent-border);
		cursor: wait;
	}

	.ab-btn:disabled:not(.ready):not(.analyzing) { cursor: not-allowed; opacity: .6; }

	/* Spinner */
	.ab-spinner {
		width: 22px; height: 22px;
		border: 2.5px solid rgba(255,255,255,.25);
		border-top-color: #fff;
		border-radius: 50%;
		animation: spin .75s linear infinite; flex-shrink: 0;
	}

	/* Ping ring when ready */
	.ab-ping {
		position: absolute; inset: -2px; border-radius: inherit;
		border: 2px solid rgba(255,255,255,.2);
		animation: ping 2.5s ease-out infinite;
		pointer-events: none;
	}

	/* Hint text */
	.ab-hint {
		display: flex; align-items: center; justify-content: center; gap: 5px;
		font-size: .78rem; color: var(--text-3); font-weight: 600; text-align: center;
	}
</style>
