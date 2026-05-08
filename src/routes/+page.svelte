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
	import Icon from '$components/Icon.svelte';
	
	function handleReset() {
		stopAllSounds();
		stopSpeaking();
		appState.reset();
	}
</script>

<svelte:head>
	<title>ROO — Baby Cry Analyzer</title>
	<meta name="description" content="World's first multimodal baby cry analyzer powered by Gemma 4" />
</svelte:head>

<div class="page">
	<Header />
	<ModeTabs />
	
	<!-- Capture Card -->
	<div class="capture-card glass">
		{#if appState.isConvertingAudio || appState.isGeneratingSpectrogram}
			<div class="processing-state">
				<div class="processing-spinner"></div>
				<p class="processing-text">
					{appState.isConvertingAudio ? 'Converting audio…' : 'Generating spectrogram…'}
				</p>
			</div>
		{:else if appState.currentMode === 'audio'}
			<AudioRecorder />
		{:else if appState.currentMode === 'image'}
			<CameraCapture />
		{:else}
			<BothModePanel />
		{/if}
	</div>
	
	<ErrorToast />
	<AnalyzeButton />
	<LoadingState />
	<ResultCard />
	<ResponsePlayer />
	
	{#if appState.result}
		<button class="reset-btn animate-fade-in" onclick={handleReset} type="button">
			<Icon name="refresh" size={14} />
			<span>Analyze Another</span>
		</button>
	{/if}
	
	<footer class="footer">
		<p>Powered by Gemma 4 · Spectrogram + Vision · DEV × Gemma 4</p>
	</footer>
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: 20px;
		padding-bottom: 24px;
	}

	.capture-card {
		min-height: 280px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-xl);
		transition: border-color 0.3s ease;
	}

	.reset-btn {
		align-self: center;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 10px 22px;
		border-radius: var(--radius-full);
		font-size: 0.85rem;
		font-weight: 700;
		color: var(--text-muted);
		background: var(--surface);
		border: 1px solid var(--border);
		transition: all var(--transition-fast);
	}

	.reset-btn:hover {
		background: var(--surface-hover);
		color: var(--text);
	}

	.footer {
		text-align: center;
		padding-top: 8px;
	}

	.footer p {
		font-size: 0.7rem;
		color: var(--text-faint);
		font-weight: 600;
		letter-spacing: 0.08em;
	}

	.processing-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		padding: 32px;
	}

	.processing-spinner {
		width: 36px;
		height: 36px;
		border: 3px solid var(--border);
		border-top-color: var(--coral);
		border-radius: 50%;
		animation: spin-slow 1s linear infinite;
	}

	.processing-text {
		font-size: 0.85rem;
		color: var(--text-muted);
		font-weight: 600;
	}

	@media (max-width: 380px) {
		.page {
			gap: 16px;
		}
	}
</style>
