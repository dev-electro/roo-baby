<script>
	import { appState } from '$state/appState.svelte.js';
	import Header from '$components/Header.svelte';
	import ModeTabs from '$components/ModeTabs.svelte';
	import AudioRecorder from '$components/AudioRecorder.svelte';
	import CameraCapture from '$components/CameraCapture.svelte';
	import BothModePanel from '$components/BothModePanel.svelte';
	import AnalyzeButton from '$components/AnalyzeButton.svelte';
	import ResultCard from '$components/ResultCard.svelte';
	import InfoGuide from '$components/InfoGuide.svelte';
	import HistoryCard from '$components/HistoryCard.svelte';
	import Icon from '$components/Icon.svelte';
	import { getHistory } from '$utils/historyStore.js';

	let history = $state(getHistory());
	$effect(() => { if (appState.result) history = getHistory(); });
</script>

<svelte:head>
	<title>ROO — Baby Cry Analyzer</title>
	<meta name="description" content="ROO uses AI to understand your baby's cry — hunger, pain, tired, discomfort and more. Soothing sounds included." />
</svelte:head>

<!-- Header -->
<Header />

<!-- Tagline chips -->
<div class="chips">
	<span class="chip chip-emerald"><Icon name="mic"     size={11} color="var(--emerald)" />  Real-time audio AI</span>
	<span class="chip chip-sky">    <Icon name="camera"  size={11} color="var(--sky)" />      Vision analysis</span>
	<span class="chip chip-rose">   <Icon name="heart"   size={11} color="var(--rose)" />     Made for parents</span>
	<span class="chip chip-amber">  <Icon name="sparkles" size={11} color="var(--amber)" />   Gemma 4 VLM</span>
</div>

<!-- Mode selector -->
<div class="block block-mode">
	<div class="block-head">
		<p class="label">How to analyze</p>
		<span class="badge badge-accent">Pick a mode</span>
	</div>
	<div class="block-body">
		<ModeTabs />
	</div>
</div>

<!-- Audio-only mode -->
{#if appState.currentMode === 'audio'}
<div class="block block-audio">
	<div class="block-head" style="border-color:var(--emerald-border)">
		<div class="block-head-left">
			<div class="step-dot emerald">①</div>
			<p class="block-title">Record the Cry</p>
		</div>
		{#if appState.audioBlob}
			<span class="badge badge-success">✓ Captured</span>
		{:else}
			<span class="badge" style="border-color:var(--emerald-border); color:var(--emerald)">Tap mic or upload</span>
		{/if}
	</div>
	<AudioRecorder />
</div>
{/if}

<!-- Image-only mode -->
{#if appState.currentMode === 'image'}
<div class="block block-camera">
	<div class="block-head" style="border-color:var(--sky-border)">
		<div class="block-head-left">
			<div class="step-dot sky">①</div>
			<p class="block-title">Baby's Face</p>
		</div>
		{#if appState.imageBlob}
			<span class="badge badge-success">✓ Captured</span>
		{:else}
			<span class="badge" style="border-color:var(--sky-border); color:var(--sky)">Camera or upload</span>
		{/if}
	</div>
	<CameraCapture />
</div>
{/if}

<!-- Both mode — unified step panel -->
{#if appState.currentMode === 'both'}
<BothModePanel />
{/if}

<!-- Analyze CTA -->
<AnalyzeButton />

<!-- Error -->
{#if appState.error}
<div class="err-box">
	<Icon name="warning" size={18} color="var(--rose)" />
	<div class="err-info">
		<p class="err-title">Analysis failed</p>
		<p class="err-desc">{appState.error}</p>
	</div>
	<button class="err-x" onclick={() => appState.clearError()}>
		<Icon name="close" size={14} color="currentColor" />
	</button>
</div>
{/if}

<!-- Result -->
{#if appState.result}
<ResultCard />
{/if}

<!-- Post-result: Soothe promo -->
{#if appState.result && appState.result.category !== 'INVALID'}
<a href="/soothe" class="soothe-promo">
	<div class="sp-left">
		<div class="sp-icon">🎵</div>
		<div>
			<p class="sp-title">Play Soothing Sounds</p>
			<p class="sp-sub">White noise · Lullabies · Ocean waves · Binaural beats</p>
		</div>
	</div>
	<span class="sp-arrow">›</span>
</a>
{/if}

<!-- Info & Guide -->
<InfoGuide />

<!-- History -->
{#if history.length > 0}
	{#key history}
		<HistoryCard onclear={() => history = []} />
	{/key}
{/if}

<style>
	/* ── Tagline chips ── */
	.chips {
		display:flex; flex-wrap:wrap; gap:6px;
	}
	.chip {
		display:inline-flex; align-items:center; gap:4px;
		padding:4px 10px; border-radius:var(--r-pill);
		font-size:.62rem; font-weight:800; letter-spacing:.03em;
		border:1px solid; white-space:nowrap;
	}
	.chip-emerald { color:var(--emerald); background:var(--emerald-bg); border-color:var(--emerald-border); }
	.chip-sky     { color:var(--sky);     background:var(--sky-bg);     border-color:var(--sky-border); }
	.chip-rose    { color:var(--rose);    background:var(--rose-bg);    border-color:var(--rose-border); }
	.chip-amber   { color:var(--amber);   background:var(--amber-bg);   border-color:var(--amber-border); }

	/* ── Blocks ── */
	.block {
		background:var(--surface); border:1px solid var(--border);
		border-radius:var(--r-xl); overflow:hidden;
	}
	/* Color left-border accent per block type */
	.block-audio  { border-left: 3px solid var(--emerald); }
	.block-camera { border-left: 3px solid var(--sky); }
	.block-mode   { border-left: 3px solid var(--accent); }

	.block-head {
		display:flex; align-items:center; justify-content:space-between;
		padding:13px 16px; border-bottom:1px solid var(--border);
	}
	.block-head-left { display:flex; align-items:center; gap:10px; }
	.block-title { font-size:.88rem; font-weight:800; color:var(--text); }
	.block-body  { padding:0 14px 14px; }

	/* Step dots */
	.step-dot {
		width:24px; height:24px; border-radius:50%; flex-shrink:0;
		font-size:.62rem; font-weight:800;
		display:flex; align-items:center; justify-content:center;
	}
	.step-dot.emerald { background:var(--emerald-bg); border:1px solid var(--emerald-border); color:var(--emerald); }
	.step-dot.sky     { background:var(--sky-bg);     border:1px solid var(--sky-border);     color:var(--sky); }

	/* ── Error ── */
	.err-box {
		display:flex; align-items:flex-start; gap:12px;
		padding:16px 18px; border-radius:var(--r-lg);
		background:var(--rose-bg); border:1px solid var(--rose-border);
	}
	.err-info { flex:1; }
	.err-title { font-size:.88rem; font-weight:800; color:var(--rose); }
	.err-desc  { font-size:.78rem; color:var(--text-2); margin-top:3px; line-height:1.5; }
	.err-x {
		width:28px; height:28px; border-radius:var(--r-sm); flex-shrink:0;
		display:flex; align-items:center; justify-content:center;
		color:var(--rose); transition:background .12s;
	}
	.err-x:hover { background:var(--rose-border); }

	/* ── Soothe promo ── */
	.soothe-promo {
		display:flex; align-items:center; justify-content:space-between;
		padding:16px 18px; border-radius:var(--r-xl); text-decoration:none;
		background:var(--amber-bg); border:1px solid var(--amber-border);
		transition:border-color .15s, background .15s;
	}
	.soothe-promo:hover { border-color:var(--amber); }
	.sp-left  { display:flex; align-items:center; gap:14px; }
	.sp-icon  { font-size:1.8rem; }
	.sp-title { font-size:.9rem; font-weight:800; color:var(--amber); }
	.sp-sub   { font-size:.7rem; color:var(--text-2); margin-top:3px; }
	.sp-arrow { font-size:1.5rem; color:var(--amber); font-weight:300; flex-shrink:0; }
</style>
