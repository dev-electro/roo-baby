<script>
	import { appState } from '$state/appState.svelte.js';
	import { analyze } from '$utils/apiClient.js';
	import { extractAudioFeatures } from '$utils/audioFeatures.js';
	import { playResponse, unlock as ensureAudioResumed } from '$utils/soundGenerator.js';
	import { speak, unlockSpeech } from '$utils/ttsEngine.js';
	import { saveToHistory } from '$utils/historyStore.js';
	import Icon from './Icon.svelte';

	const MSGS={HUNGER:"Shh little one… food is on the way.",PAIN:"It's okay baby… I'm right here.",TIRED:"Sleep now… the world can wait.",DISCOMFORT:"Let's get comfortable.",BURPING:"Good baby… let it out.",UNKNOWN:"Shh… everything is okay.",INVALID:"This doesn't appear to be a baby. ROO is designed for infant cry analysis only."};

	let busy=$state(false);

	let processing = $derived(appState.isConvertingAudio || appState.isGeneratingSpectrogram);

	async function run() {
		if (!appState.isReady || appState.isAnalyzing || busy) return;
		busy=true; appState.isAnalyzing=true; appState.clearError(); appState.result=null;
		unlockSpeech(); ensureAudioResumed();
		const rid = appState.resetId;
		try {
			let feat=null;
			if(appState.audioBlob){try{feat=await extractAudioFeatures(appState.audioBlob)}catch{}}
			if(appState.resetId !== rid) return;
			const data=await analyze({mode:appState.currentMode,audio:appState.audioBlob,image:appState.imageBlob,spectrogram:appState.spectrogramBlob,audioFeatures:feat});
			if(appState.resetId !== rid) return;
			appState.result=data; saveToHistory(data);
			if(appState.autoPlaySounds && data.response_sound && data.category !== 'INVALID') playResponse(data.response_sound);
			if(appState.autoPlaySounds && data.category !== 'INVALID') setTimeout(()=>speak(MSGS[data.category]||MSGS.UNKNOWN),1500);
		}catch(err){appState.setError(err.message||'Analysis failed')}
		finally{appState.isAnalyzing=false;busy=false}
	}
</script>

<button class="btn" class:on={appState.isReady} class:proc={processing} disabled={!appState.isReady||appState.isAnalyzing||processing} onclick={run}>
	{#if appState.isAnalyzing}
		<span class="shimmer"></span><span>Analyzing…</span>
	{:else if processing}
		<Icon name="loader" size={18} color="currentColor" /> Preparing…
	{:else if appState.isReady}
		<Icon name="search" size={18} color="currentColor" /> Understand This Cry
	{:else}
		Record your baby to begin
	{/if}
</button>

<style>
	.btn{width:100%;padding:18px;border-radius:var(--radius);font-size:1rem;font-weight:800;letter-spacing:.02em;color:var(--text-dim);background:var(--card-bg);border:1px solid var(--card-border);position:relative;overflow:hidden;transition:all .2s;display:flex;align-items:center;justify-content:center;gap:8px}
	.btn.on{background:linear-gradient(135deg,var(--pink),var(--gold));color:#fff;border:none;box-shadow:0 6px 20px rgba(255,107,122,.3);cursor:pointer}
	.btn.on:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 10px 28px rgba(255,107,122,.4)}
	.btn.on:active:not(:disabled){transform:translateY(0)}
	.btn:disabled{opacity:.6;cursor:not-allowed}
	.btn.proc{opacity:.75;cursor:wait;border-color:var(--pink)}
	.shimmer{position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.1),transparent);background-size:200% 100%;animation:shimmer 1.5s infinite}
</style>
