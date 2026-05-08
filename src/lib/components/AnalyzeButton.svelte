<script>
	import { appState } from '$state/appState.svelte.js';
	import { analyze } from '$utils/apiClient.js';
	import { extractAudioFeatures } from '$utils/audioFeatures.js';
	import { playResponseSound, ensureAudioResumed } from '$utils/soundGenerator.js';
	import { speak, unlockSpeech } from '$utils/ttsEngine.js';
	import { saveToHistory } from '$utils/historyStore.js';
	import Icon from './Icon.svelte';
	
	const RESPONSE_MESSAGES = {
		HUNGER: "Shh little one… food is on the way. You're safe.",
		PAIN: "It's okay baby… I'm right here. You're not alone.",
		TIRED: "Sleep now little one… the world can wait.",
		DISCOMFORT: "Shh shh… let's make you comfortable. Better soon.",
		BURPING: "Let it out… you'll feel much better. Good baby.",
		UNKNOWN: "Shh shh… it's okay little one. Everything is fine."
	};
	
	let analyzing = false;

	async function handleAnalyze() {
		if (!appState.isReady || appState.isAnalyzing || analyzing) return;
		analyzing = true;
		
		appState.isAnalyzing = true;
		appState.clearError();
		appState.result = null;
		
		// Unlock audio subsystems (requires user gesture on mobile)
		unlockSpeech();
		ensureAudioResumed();

		// Stop any currently playing sounds from previous analysis
		const { stopAllSounds } = await import('$utils/soundGenerator.js');
		const { stopSpeaking } = await import('$utils/ttsEngine.js');
		stopAllSounds();
		stopSpeaking();
		
		try {
			let audioFeatures = null;
			if (appState.audioBlob) {
				try {
					audioFeatures = await extractAudioFeatures(appState.audioBlob);
				} catch {
					audioFeatures = null;
				}
			}
			
			const data = await analyze({
				mode: appState.currentMode,
				audio: appState.audioBlob,
				image: appState.imageBlob,
				spectrogram: appState.spectrogramBlob,
				audioFeatures
			});
			
			appState.result = data;
			saveToHistory(data);
			
			if (data.response_sound) {
				playResponseSound(data.response_sound);
			}
			
			const msg = RESPONSE_MESSAGES[data.category] || RESPONSE_MESSAGES.UNKNOWN;
			setTimeout(() => speak(msg), 1500);
			
		} catch (err) {
			appState.setError(err.message || 'Analysis failed. Please try again.');
		} finally {
			appState.isAnalyzing = false;
			analyzing = false;
		}
	}
</script>

<button
	class="analyze-btn"
	class:ready={appState.isReady}
	class:generating={appState.isConvertingAudio || appState.isGeneratingSpectrogram}
	disabled={!appState.isReady || appState.isAnalyzing || appState.isConvertingAudio || appState.isGeneratingSpectrogram}
	onclick={handleAnalyze}
	type="button"
>
	{#if appState.isAnalyzing}
		<span class="btn-shimmer"></span>
		<span class="btn-text">Analyzing…</span>
	{:else if appState.isConvertingAudio || appState.isGeneratingSpectrogram}
		<span class="btn-content">
			<div class="mini-spinner"></div>
			<span>{appState.isConvertingAudio ? 'Optimizing…' : 'Preparing…'}</span>
		</span>
	{:else}
		<span class="btn-content">
			<Icon name="arrow-right" size={18} color="currentColor" />
			<span>Analyze Cry</span>
		</span>
	{/if}
</button>

<style>
	.analyze-btn {
		width: 100%;
		padding: 20px 28px;
		border-radius: var(--radius-xl);
		font-size: 1.05rem;
		font-weight: 800;
		letter-spacing: 0.03em;
		color: rgba(255,255,255,0.4);
		background: var(--surface);
		border: 1px solid var(--border);
		position: relative;
		overflow: hidden;
		transition: all var(--transition-base);
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 60px;
	}

	.analyze-btn.ready {
		background: linear-gradient(135deg, var(--coral), var(--amber));
		color: #fff;
		border: none;
		box-shadow: 0 6px 24px rgba(255,140,107,0.3), inset 0 1px 0 rgba(255,255,255,0.15);
		cursor: pointer;
	}

	.analyze-btn.ready:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 10px 36px rgba(255,140,107,0.4), inset 0 1px 0 rgba(255,255,255,0.15);
	}

	.analyze-btn.ready:active:not(:disabled) {
		transform: translateY(0);
		box-shadow: 0 4px 16px rgba(255,140,107,0.25);
	}

	.analyze-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.analyze-btn.generating {
		background: var(--surface);
		color: var(--text-muted);
		border: 1px solid var(--border-glow);
		cursor: wait;
	}

	.btn-content {
		display: flex;
		align-items: center;
		gap: 10px;
		position: relative;
		z-index: 1;
	}

	.mini-spinner {
		width: 16px;
		height: 16px;
		border: 2px solid var(--border);
		border-top-color: var(--coral);
		border-radius: 50%;
		animation: spin-slow 0.8s linear infinite;
	}

	.btn-text {
		position: relative;
		z-index: 1;
	}

	.btn-shimmer {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			90deg,
			transparent,
			rgba(255,255,255,0.12),
			transparent
		);
		background-size: 200% 100%;
		animation: shimmer 1.5s infinite;
	}
</style>