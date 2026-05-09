<script>
	import { appState } from '$state/appState.svelte.js';
	import Header from '$components/Header.svelte';
	import ModeTabs from '$components/ModeTabs.svelte';
	import AudioRecorder from '$components/AudioRecorder.svelte';
	import CameraCapture from '$components/CameraCapture.svelte';
	import BothModePanel from '$components/BothModePanel.svelte';
	import AnalyzeButton from '$components/AnalyzeButton.svelte';
	import LoadingState from '$components/LoadingState.svelte';
	import ResultCard from '$components/ResultCard.svelte';
	import ResponsePlayer from '$components/ResponsePlayer.svelte';
	import HistoryCard from '$components/HistoryCard.svelte';
	import ErrorToast from '$components/ErrorToast.svelte';
	import Icon from '$components/Icon.svelte';
</script>

<svelte:head>
	<title>ROO — Analyze</title>
</svelte:head>

<div class="pg">
	<Header />

	{#if appState.isAnalyzing}
		<LoadingState />
	{:else}
		<!-- Main Input Panel -->
		<div class="panel-box animate-in">
			<ModeTabs />
			
			<div class="panel-content">
				{#if appState.currentMode === 'audio'}
					<AudioRecorder />
				{:else if appState.currentMode === 'image'}
					<CameraCapture />
				{:else}
					<BothModePanel />
				{/if}
			</div>

			<div class="panel-foot">
				<label class="notes-box">
					<span class="notes-lbl"><Icon name="edit-2" size={14} color="currentColor"/> Additional Context</span>
					<textarea
						bind:value={appState.userNotes}
						placeholder="E.g. Woke up 10 mins ago, hasn't eaten in 3 hours..."
						maxlength="200"
					></textarea>
					<span class="notes-count">{appState.userNotes.length}/200</span>
				</label>
			</div>
		</div>

		<AnalyzeButton />

		{#if appState.result}
			<div class="res-box">
				<ResultCard result={appState.result} />
				{#if appState.result.category !== 'INVALID'}
					<ResponsePlayer result={appState.result} />
				{/if}
			</div>
		{/if}

		<div class="hist-box animate-fade" style="animation-delay: 0.1s">
			<HistoryCard />
		</div>
	{/if}

	<ErrorToast />
</div>

<style>
	.pg { display:flex; flex-direction:column; gap:24px; width:100%; }

	.panel-box {
		background:var(--surface); border:1px solid var(--border); border-radius:var(--r-md);
		overflow:hidden; box-shadow:var(--shadow-card); display:flex; flex-direction:column;
	}
	
	.panel-content { min-height:280px; display:flex; align-items:center; justify-content:center; }

	.panel-foot { padding:16px 20px; border-top:1px solid var(--border); background:var(--surface-2); }
	.notes-box { display:flex; flex-direction:column; gap:8px; position:relative; }
	.notes-lbl { font-size:0.85rem; font-weight:700; color:var(--text-soft); display:flex; align-items:center; gap:6px; }
	.notes-box textarea {
		width:100%; height:80px; resize:none; padding:12px; border-radius:var(--r-sm);
		font-size:0.9rem; line-height:1.4; transition:border-color .2s;
	}
	.notes-count { position:absolute; bottom:8px; right:12px; font-size:0.75rem; font-weight:600; color:var(--text-dim); }

	.res-box { display:flex; flex-direction:column; gap:20px; margin-top:16px; }
	.hist-box { margin-top:24px; }
</style>
