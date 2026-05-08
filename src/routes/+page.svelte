<script>
	import { appState } from '$state/appState.svelte.js';
	import { stopAllSounds } from '$utils/soundGenerator.js';
	import { stopSpeaking } from '$utils/ttsEngine.js';
	
	import Header from '$components/Header.svelte';
	import ModeTabs from '$components/ModeTabs.svelte';
	import AudioRecorder from '$components/AudioRecorder.svelte';
	import CameraCapture from '$components/CameraCapture.svelte';
	import BothModePanel from '$components/BothModePanel.svelte';
	import AnalyzeButton from '$components/AnalyzeButton.svelte';
	import LoadingState from '$components/LoadingState.svelte';
	import ResultCard from '$components/ResultCard.svelte';
	import ResponsePlayer from '$components/ResponsePlayer.svelte';
	import ErrorToast from '$components/ErrorToast.svelte';
	import HistoryCard from '$components/HistoryCard.svelte';
	import Icon from '$components/Icon.svelte';
	
	function handleReset() {
		stopAllSounds();
		stopSpeaking();
		appState.reset();
	}
</script>

<svelte:head>
	<title>ROO — Baby Cry Analyzer</title>
	<meta name="description" content="AI-powered baby cry analyzer. Understand why your baby is crying in seconds." />
</svelte:head>

<div class="page">
	<Header />
	<ModeTabs />
	
	<div class="capture-card glass">
		{#key appState.currentMode}
			{#if appState.isConvertingAudio || appState.isGeneratingSpectrogram}
				<div class="processing-state">
					<div class="processing-spinner"></div>
					<p class="processing-text">
						{appState.isConvertingAudio ? 'Optimizing audio…' : 'Creating spectrogram…'}
					</p>
				</div>
			{:else if appState.currentMode === 'audio'}
				<AudioRecorder />
			{:else if appState.currentMode === 'image'}
				<CameraCapture />
			{:else}
				<BothModePanel />
			{/if}
		{/key}
	</div>
	
	<ErrorToast />
	<AnalyzeButton />
	<LoadingState />
	<ResultCard />
	<ResponsePlayer />
	<HistoryCard />
	
	{#if appState.result}
		<button class="reset-btn animate-fade-in" onclick={handleReset} type="button">
			<Icon name="refresh" size={14} />
			<span>Analyze Another Cry</span>
		</button>
	{/if}
	
	<footer class="footer">
		<p>Powered by Gemma 4 · Multimodal AI</p>
	</footer>
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.capture-card {
		min-height: 200px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-2xl);
	}

	.reset-btn {
		align-self: center;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 12px 24px;
		border-radius: var(--radius-full);
		font-size: 0.88rem;
		font-weight: 700;
		color: var(--text-muted);
		background: var(--surface);
		border: 1px solid var(--border);
		transition: all var(--transition-fast);
	}

	.reset-btn:hover {
		background: var(--surface-hover);
		color: var(--text);
		border-color: var(--border-glow);
	}

	.footer {
		text-align: center;
		padding-top: 16px;
	}

	.footer p {
		font-size: 0.68rem;
		color: var(--text-faint);
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.processing-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 14px;
		padding: 40px;
	}

	.processing-spinner {
		width: 32px;
		height: 32px;
		border: 3px solid var(--border);
		border-top-color: var(--primary);
		border-radius: 50%;
		animation: spin-slow 1s linear infinite;
	}

	.processing-text {
		font-size: 0.85rem;
		color: var(--text-muted);
		font-weight: 600;
	}
</style>