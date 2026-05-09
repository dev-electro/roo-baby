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

	let notesLen = $derived(appState.userNotes.length);
</script>

<svelte:head>
	<title>ROO — Baby Cry Analyzer</title>
	<meta name="description" content="Understand why your baby is crying. AI-powered cry analysis in seconds." />
</svelte:head>

<div class="page">
	<Header />
	<ModeTabs />

	<!-- Input card -->
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

	<!-- Notes bar -->
	<div class="notes-bar" class:focused={false}>
		<Icon name="info" size={14} color="var(--text-dim)" />
		<input
			type="text"
			class="notes-input"
			placeholder='Observations — e.g. "just woke up", "refusing bottle"…'
			bind:value={appState.userNotes}
			maxlength={200}
		/>
		{#if notesLen > 0}
			<span class="notes-count" class:warn={notesLen > 180}>{notesLen}/200</span>
		{/if}
	</div>

	<AnalyzeButton />
	<LoadingState />
	<ResultCard />
	<ResponsePlayer />

	<!-- Reset button -->
	{#if appState.result}
		<button class="reset-btn animate-in" onclick={handleReset}>
			<Icon name="refresh" size={15} color="currentColor" />
			Analyze Another Cry
		</button>
	{/if}

	<HistoryCard />

	<footer class="footer">
		<div class="footer-inner">
			<div class="footer-brand">
				<Icon name="kangaroo" size={14} color="var(--lavender)" />
				<span>ROO</span>
			</div>
			<p class="footer-tech">Gemma 4 · Mel Spectrogram · Computer Vision</p>
			<p class="footer-legal">Not a medical device — always consult your pediatrician.</p>
		</div>
	</footer>
</div>

<!-- Toast is fixed-position, placed outside .page -->
<ErrorToast />

<style>
	.page { display:flex; flex-direction:column; gap:16px; }

	/* Input card */
	.card {
		background:var(--surface); border:1px solid var(--border);
		border-radius:var(--r-xl); overflow:hidden;
		min-height:200px; display:flex; align-items:center; justify-content:center;
		position:relative;
	}

	/* Processing overlay */
	.processing-overlay {
		position:absolute; inset:0; z-index:10;
		display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px;
		background:rgba(14,13,20,.88); backdrop-filter:blur(4px);
	}
	.processing-overlay p { font-size:.85rem; color:var(--text-soft); font-weight:700; }
	.spinner {
		width:32px; height:32px;
		border:3px solid var(--border); border-top-color:var(--lavender);
		border-radius:50%; animation:spin .7s linear infinite;
	}

	/* Notes bar */
	.notes-bar {
		display:flex; align-items:center; gap:8px;
		padding:10px 14px;
		background:var(--surface); border:1px solid var(--border);
		border-radius:var(--r-md); transition:border-color .2s;
	}
	.notes-bar:focus-within { border-color:var(--lavender); }
	.notes-input {
		flex:1; border:none; background:none; outline:none;
		font-size:.78rem; color:var(--text); font-family:inherit;
	}
	.notes-input::placeholder { color:var(--text-dim); font-style:italic; }
	.notes-count { font-size:.62rem; color:var(--text-dim); font-weight:700; flex-shrink:0; }
	.notes-count.warn { color:var(--blush); }

	/* Reset */
	.reset-btn {
		align-self:center; padding:12px 28px; border-radius:var(--r-pill);
		font-size:.88rem; font-weight:800; color:var(--text-soft);
		border:1px solid var(--border); background:var(--surface);
		transition:all .2s; display:flex; align-items:center; gap:7px;
	}
	.reset-btn:hover { border-color:var(--lavender); color:var(--text); background:var(--lav-soft); }

	/* Footer */
	.footer { margin-top:8px; padding:20px 0 32px; border-top:1px solid var(--border); text-align:center; }
	.footer-inner { display:flex; flex-direction:column; align-items:center; gap:5px; }
	.footer-brand { display:flex; align-items:center; gap:6px; font-family:'Fraunces',serif; font-size:1rem; font-weight:700; color:var(--text-soft); }
	.footer-tech  { font-size:.65rem; color:var(--text-dim); font-weight:700; letter-spacing:.04em; }
	.footer-legal { font-size:.62rem; color:var(--text-dim); opacity:.5; max-width:260px; line-height:1.5; }
</style>
