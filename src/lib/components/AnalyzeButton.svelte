<script>
	import { appState } from '$state/appState.svelte.js';
	import { analyze } from '$utils/apiClient.js';
	import { playResponseSound, stopAllSounds } from '$utils/soundGenerator.js';
	import { speak } from '$utils/ttsEngine.js';
	import Icon from './Icon.svelte';
	
	const RESPONSE_MESSAGES = {
		HUNGER: "Shh little one… food is on the way. You're safe.",
		PAIN: "It's okay baby… mama is right here. You're not alone.",
		TIRED: "Sleep now little one… the world can wait. Rest now.",
		DISCOMFORT: "Shh shh… let's make you comfortable. Better soon.",
		BURPING: "Let it out… you'll feel much better. Good baby.",
		UNKNOWN: "Shh shh… it's okay little one. Everything is fine."
	};
	
	async function handleAnalyze() {
		if (!appState.isReady) return;
		
		appState.isAnalyzing = true;
		appState.clearError();
		appState.result = null;
		stopAllSounds();
		
		try {
		const data = await analyze({
			mode: appState.currentMode,
			audio: appState.audioBlob,
			image: appState.imageBlob,
			spectrogram: appState.spectrogramBlob
		});
			
			appState.result = data;
			
			// Play response
			if (data.response_sound) {
				playResponseSound(data.response_sound);
			}
			
			// TTS after 1.5s
			const msg = RESPONSE_MESSAGES[data.category] || RESPONSE_MESSAGES.UNKNOWN;
			setTimeout(() => speak(msg), 1500);
			
		} catch (err) {
			appState.setError(err.message || 'Analysis failed. Please try again.');
		} finally {
			appState.isAnalyzing = false;
		}
	}
</script>

<button
	class="analyze-btn"
	class:ready={appState.isReady}
	disabled={!appState.isReady || appState.isAnalyzing}
	onclick={handleAnalyze}
	type="button"
>
	{#if appState.isAnalyzing}
		<span class="btn-shimmer"></span>
	{/if}
	<span class="btn-content">
		<Icon name="arrow-right" size={18} color="currentColor" />
		<span>Analyze with ROO</span>
	</span>
</button>

<style>
	.analyze-btn {
		width: 100%;
		padding: 18px 24px;
		border-radius: var(--radius-lg);
		font-size: 1rem;
		font-weight: 800;
		letter-spacing: 0.04em;
		color: rgba(255,255,255,0.5);
		background: var(--surface);
		border: 1px solid var(--border);
		position: relative;
		overflow: hidden;
		transition: all var(--transition-base);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.analyze-btn.ready {
		background: linear-gradient(135deg, var(--coral), var(--amber));
		color: #fff;
		border: none;
		box-shadow: 0 8px 32px rgba(255,123,92,0.35);
		cursor: pointer;
	}

	.analyze-btn.ready:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 14px 40px rgba(255,123,92,0.45);
	}

	.analyze-btn.ready:active:not(:disabled) {
		transform: translateY(0);
	}

	.analyze-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-content {
		display: flex;
		align-items: center;
		gap: 10px;
		position: relative;
		z-index: 1;
	}

	.btn-shimmer {
		position: absolute;
		inset: 0;
		background: linear-gradient(
			90deg,
			transparent,
			rgba(255,255,255,0.15),
			transparent
		);
		background-size: 200% 100%;
		animation: shimmer 1.5s infinite;
	}
</style>
