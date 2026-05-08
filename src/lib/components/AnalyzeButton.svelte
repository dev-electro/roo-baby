<script>
	import { appState } from '$state/appState.svelte.js';
	import { analyze } from '$utils/apiClient.js';
	import { extractAudioFeatures } from '$utils/audioFeatures.js';
	import { playResponseSound, ensureAudioResumed } from '$utils/soundGenerator.js';
	import { speak, unlockSpeech } from '$utils/ttsEngine.js';
	import { saveToHistory } from '$utils/historyStore.js';

	const MSGS = {
		HUNGER:"Shh little one… food is on the way. You're safe.",
		PAIN:"It's okay baby… I'm right here. You're not alone.",
		TIRED:"Sleep now little one… the world can wait.",
		DISCOMFORT:"Shh shh… let's make you comfortable.",
		BURPING:"Let it out… good baby. You'll feel better.",
		UNKNOWN:"Shh… it's okay. Everything is fine."
	};

	let busy=$state(false);

	async function run() {
		if (!appState.isReady || appState.isAnalyzing || busy) return;
		busy=true; appState.isAnalyzing=true; appState.clearError(); appState.result=null;
		unlockSpeech(); ensureAudioResumed();
		try {
			let feat=null;
			if(appState.audioBlob){try{feat=await extractAudioFeatures(appState.audioBlob)}catch{}}
			const data=await analyze({mode:appState.currentMode,audio:appState.audioBlob,image:appState.imageBlob,spectrogram:appState.spectrogramBlob,audioFeatures:feat});
			appState.result=data; saveToHistory(data);
			if(data.response_sound) playResponseSound(data.response_sound);
			const msg=MSGS[data.category]||MSGS.UNKNOWN;
			setTimeout(()=>speak(msg),1500);
		}catch(err){appState.setError(err.message||'Analysis failed')}
		finally{appState.isAnalyzing=false;busy=false}
	}
</script>

<button class="btn" class:on={appState.isReady} disabled={!appState.isReady||appState.isAnalyzing} onclick={run}>
	{#if appState.isAnalyzing}
		<span class="shimmer"></span><span>Analyzing…</span>
	{:else}
		🔍 Analyze Cry
	{/if}
</button>

<style>
	.btn{width:100%;padding:18px;border-radius:var(--radius);font-size:1rem;font-weight:800;letter-spacing:.02em;color:var(--text-dim);background:var(--card-bg);border:1px solid var(--card-border);position:relative;overflow:hidden;transition:all .2s}
	.btn.on{background:linear-gradient(135deg,var(--pink),var(--gold));color:#fff;border:none;box-shadow:0 6px 20px rgba(255,107,122,.3);cursor:pointer}
	.btn.on:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 10px 28px rgba(255,107,122,.4)}
	.btn.on:active:not(:disabled){transform:translateY(0)}
	.btn:disabled{opacity:.5;cursor:not-allowed}
	.shimmer{position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.1),transparent);background-size:200% 100%;animation:shimmer 1.5s infinite}
</style>