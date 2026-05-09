<script>
	import { appState } from '$state/appState.svelte.js';
	import { halt as stopAllSounds } from '$utils/soundGenerator.js';
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
	<meta name="description" content="Understand why your baby is crying. AI-powered cry analysis in seconds." />
</svelte:head>

<div class="page">
	<Header />
	<ModeTabs />

	<div class="card">
		{#key appState.currentMode}
			{#if appState.currentMode === 'audio'}
				<AudioRecorder />
			{:else if appState.currentMode === 'image'}
				<CameraCapture />
			{:else}
				<BothModePanel />
			{/if}
		{/key}

		{#if appState.isConvertingAudio || appState.isGeneratingSpectrogram}
			<div class="processing-overlay animate-fade">
				<div class="spinner"></div>
				<p>{appState.isConvertingAudio ? 'Optimizing audio…' : 'Generating spectrogram…'}</p>
			</div>
		{/if}
	</div>

	<div class="notes-bar">
		<Icon name="info-circle" size={14} color="var(--text-dim)" />
		<input
			type="text"
			class="notes-input"
			placeholder="Observations (optional) — e.g. &quot;just woke up&quot;, &quot;crying for 10 min&quot;, &quot;refusing bottle&quot;..."
			bind:value={appState.userNotes}
			maxlength={200}
		/>
	</div>

	<ErrorToast />
	<AnalyzeButton />
	<LoadingState />
	<ResultCard />
	<ResponsePlayer />

	{#if appState.result}
		<button class="reset-btn animate-scale" onclick={handleReset}>
			<Icon name="refresh" size={14} color="currentColor" />
			Analyze Another Cry
		</button>
	{/if}

	<HistoryCard />

	<footer class="footer">
		<div class="footer-inner">
			<div class="footer-brand">
				<Icon name="kangaroo" size={16} color="var(--pink)" />
				<span>ROO</span>
			</div>
			<p class="footer-tagline">Gemma 4 · Mel Spectrogram · Computer Vision</p>
			<p class="footer-sub">Not a medical device — always consult your pediatrician.</p>
		</div>
	</footer>
</div>

<style>
	.page{display:flex;flex-direction:column;gap:14px}

	.card{
		background:var(--card-bg);border:1px solid var(--card-border);
		border-radius:var(--radius-xl);overflow:hidden;
		min-height:180px;display:flex;align-items:center;justify-content:center;
		position:relative;
	}

	.processing-overlay{
		position:absolute;inset:0;z-index:10;
		display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;
		background:rgba(19,16,28,.92);backdrop-filter:blur(2px);
	}
	.processing-overlay p{font-size:.85rem;color:var(--text-soft);font-weight:600}
	.spinner{width:28px;height:28px;border:3px solid var(--card-border);border-top-color:var(--pink);border-radius:50%;animation:spin .8s linear infinite}

	.reset-btn{
		align-self:center;padding:12px 28px;border-radius:100px;
		font-size:.88rem;font-weight:700;color:var(--text-soft);
		border:1px solid var(--card-border);background:var(--card-bg);
		transition:all .15s;
	}
	.reset-btn:hover{border-color:var(--pink);color:var(--text)}

	.footer{margin-top:14px;padding:18px 0 32px;border-top:1px solid var(--card-border);text-align:center}
	.footer-inner{display:flex;flex-direction:column;align-items:center;gap:4px}
	.footer-brand{display:flex;align-items:center;gap:6px;font-family:'Fraunces',serif;font-size:1.05rem;font-weight:700;color:var(--text-soft)}
	.footer-tagline{font-size:.65rem;color:var(--text-dim);font-weight:600;letter-spacing:.04em}
	.footer-sub{font-size:.6rem;color:var(--text-dim);opacity:.45;max-width:260px;line-height:1.5}

	.notes-bar{
		display:flex;align-items:center;gap:8px;
		padding:8px 14px;
		background:var(--card-bg);border:1px solid var(--card-border);
		border-radius:var(--radius-sm);
	}
	.notes-input{
		flex:1;border:none;background:none;
		font-size:.75rem;color:var(--text);
		font-family:inherit;
		outline:none;
	}
	.notes-input::placeholder{color:var(--text-dim);font-style:italic}
</style>
