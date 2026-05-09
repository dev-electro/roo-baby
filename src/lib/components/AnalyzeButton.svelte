<script>
	import { appState } from '$state/appState.svelte.js';
	import { analyze } from '$utils/apiClient.js';
	import { extractAudioFeatures } from '$utils/audioFeatures.js';
	import { playResponse, unlock as ensureAudioResumed } from '$utils/soundGenerator.js';
	import { speak, unlockSpeech } from '$utils/ttsEngine.js';
	import { saveToHistory } from '$utils/historyStore.js';
	import Icon from './Icon.svelte';

	const MSGS={HUNGER:"Shh little one… food is on the way.",PAIN:"It's okay baby… I'm right here.",TIRED:"Sleep now… the world can wait.",DISCOMFORT:"Let's get comfortable.",BURPING:"Good baby… let it out.",UNKNOWN:"Shh… everything is okay.",INVALID:"Hey! We see you're testing ROO on yourself. The results are just for fun — ROO is for babies only. Try it on your little one!"};

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

		if (feat?.isProblematic) {
			let reason, action;
			if (feat.isSilent) {
				reason = "No cry sound detected — the recording is mostly silence. Make sure your baby is crying and the microphone is close enough.";
				action = "Re-record your baby's cry. Hold the phone near your baby.";
			} else if (feat.isClipping) {
				reason = "Audio is distorted/clipped — the microphone picked up too loud a signal. Try moving the phone slightly away from your baby.";
				action = "Re-record with the phone at a moderate distance from your baby.";
			} else if (feat.isTooShort) {
				reason = "Recording is too short to analyze. Please record at least 1 second of your baby crying.";
				action = "Re-record for at least 1-2 seconds.";
			} else if (feat.isNoise) {
				reason = "Detected ambient noise (static, fan, hum) instead of a baby cry. The sound lacks the characteristic pitch patterns of an infant cry.";
				action = "Move to a quieter room and re-record your baby crying.";
			} else if (feat.isMusicLike) {
				reason = "This sounds more like music or TV audio than a baby crying. The frequency pattern shows strong harmonic structure typical of music.";
				action = "Make sure only your baby's cry is being recorded. Turn off TV/music.";
			} else if (feat.hasMultipleSources) {
				reason = "Multiple overlapping sounds detected — there may be background noise or voices mixed with the baby's cry. This makes analysis unreliable.";
				action = "Try recording in a quieter environment with only your baby crying.";
			} else if (feat.isOutsideCryRange) {
				reason = "The dominant frequency is outside the typical baby cry range (200-1000 Hz). This doesn't sound like a baby crying.";
				action = "Make sure you're recording your baby's cry, not other sounds.";
			} else {
				reason = "The audio quality is too low for reliable analysis. The signal doesn't match baby cry patterns.";
				action = "Re-record in a quiet environment with your baby crying clearly.";
			}
			appState.result = {
				category: 'UNKNOWN',
				confidence: 0,
				severity: 'NONE',
				reasoning: reason,
				parent_action: action,
				response_sound: 'whitenoise',
				pre_cry: false,
				pre_cry_message: null,
				is_adult: false,
				adult_message: null,
				_isEdgeCase: true,
			};
			saveToHistory(appState.result);
			return;
		}

		const data=await analyze({mode:appState.currentMode,audio:appState.audioBlob,image:appState.imageBlob,spectrogram:appState.spectrogramBlob,audioFeatures:feat,userNotes:appState.userNotes});
			if(appState.resetId !== rid) return;
			appState.result=data; saveToHistory(data);
		if(appState.autoPlaySounds && data.response_sound && data.category !== 'INVALID' && !data.is_adult) playResponse(data.response_sound);
		if(appState.autoPlaySounds && data.category !== 'INVALID' && !data.is_adult) setTimeout(()=>speak(MSGS[data.category]||MSGS.UNKNOWN),1500);
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
