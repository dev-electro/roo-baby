<script>
	import { appState } from '$state/appState.svelte.js';
	import { stopAllSounds } from '$utils/soundGenerator.js';
	import { stopSpeaking } from '$utils/ttsEngine.js';
	import { saveToHistory } from '$utils/historyStore.js';

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

	function handleReset() {
		stopAllSounds();
		stopSpeaking();
		appState.reset();
	}
</script>

<svelte:head>
	<title>ROO — Baby Cry Analyzer</title>
	<meta name="description" content="Understand why your baby is crying. AI-powered cry analysis in seconds." />
</svelte:head>

<div class="page">
	<Header />
	<ModeTabs />

	<div class="card">
		{#if appState.isConvertingAudio || appState.isGeneratingSpectrogram}
			<div class="processing">
				<div class="spinner"></div>
				<p>{appState.isConvertingAudio ? 'Optimizing…' : 'Creating spectrogram…'}</p>
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
		<button class="reset-btn animate-scale" onclick={handleReset}>
			🔄 Analyze Another Cry
		</button>
	{/if}

	<HistoryCard />
</div>

<style>
	.page{display:flex;flex-direction:column;gap:14px}

	.card{
		background:var(--card-bg);border:1px solid var(--card-border);
		border-radius:var(--radius-xl);overflow:hidden;
		min-height:180px;display:flex;align-items:center;justify-content:center;
	}

	.processing{display:flex;flex-direction:column;align-items:center;gap:12px;padding:36px}
	.spinner{width:28px;height:28px;border:3px solid var(--card-border);border-top-color:var(--pink);border-radius:50%;animation:spin .8s linear infinite}
	.processing p{font-size:.85rem;color:var(--text-soft);font-weight:600}

	.reset-btn{
		align-self:center;padding:12px 28px;border-radius:100px;
		font-size:.88rem;font-weight:700;color:var(--text-soft);
		border:1px solid var(--card-border);background:var(--card-bg);
		transition:all .15s;
	}
	.reset-btn:hover{border-color:var(--pink);color:var(--text)}
</style>