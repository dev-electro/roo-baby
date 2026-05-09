<script>
	import { appState } from '$state/appState.svelte.js';
	import { playResponseSound, playHeartbeat, playWhiteNoise, playLullaby, playShush, stopAllSounds, ensureAudioResumed } from '$utils/soundGenerator.js';
	import { speak, stopSpeaking, unlockSpeech, isSpeaking } from '$utils/ttsEngine.js';
	import Icon from './Icon.svelte';

	const MSGS={HUNGER:"Shh… food is coming. You're safe.",PAIN:"It's okay baby… I'm here.",TIRED:"Sleep now… the world can wait.",DISCOMFORT:"Let's get comfy… better soon.",BURPING:"Let it out… good baby.",UNKNOWN:"Shh… everything is okay.",INVALID:"This appears to be an adult face. ROO is for babies only."};
	const SOUNDS={heartbeat:{label:'Heartbeat',fn:playHeartbeat},whitenoise:{label:'White Noise',fn:()=>playWhiteNoise(30)},lullaby:{label:'Lullaby',fn:playLullaby},shush:{label:'Shush',fn:()=>playShush(20)}};

	let msg = $derived(appState.result?MSGS[appState.result.category]||MSGS.UNKNOWN:'');
	let currentSound = $derived(appState.result?.response_sound || 'whitenoise');

	let playingTTS = $state(false);

	async function playTTS() {
		unlockSpeech(); ensureAudioResumed();
		playingTTS = true;
		speak(msg);
		setTimeout(() => { if(!isSpeaking()) playingTTS = false; }, 500);
	}

	function playSound(name) {
		ensureAudioResumed();
		const s = SOUNDS[name] || SOUNDS.whitenoise;
		s.fn();
	}

	function handleStop() {
		stopAllSounds();
		stopSpeaking();
		playingTTS = false;
	}
</script>

{#if appState.result && appState.result.category !== 'INVALID'}
<div class="p animate-slide">
	<div class="p-head">
		<Icon name="kangaroo" size={18} color="var(--pink)" />
		Soothing Response
	</div>

	{#if appState.autoPlaySounds}
		<div class="p-bars">{#each Array(7) as _,i}<div class="p-bar" style="animation-delay:{i*.1}s"></div>{/each}</div>
		<p class="p-hint">Playing automatically…</p>
		<button class="p-stop" onclick={handleStop}><Icon name="stop" size={14} color="currentColor" /> Stop</button>
	{:else}
		<div class="p-actions">
			<button class="p-btn p-btn-tts" onclick={playTTS} disabled={playingTTS}>
				<Icon name="play" size={14} color="currentColor" /> Speak "{msg.slice(0,25)}…"
			</button>
			<div class="p-sounds">
				{#each Object.entries(SOUNDS) as [key, s]}
					<button class="p-btn p-btn-sound" class:active={key===currentSound} onclick={()=>playSound(key)}>
						<Icon name="play" size={12} color="currentColor" /> {s.label}
					</button>
				{/each}
			</div>
		</div>
		<button class="p-stop" onclick={handleStop}><Icon name="stop" size={14} color="currentColor" /> Stop all</button>
	{/if}
</div>
{/if}

<style>
	.p{display:flex;flex-direction:column;align-items:center;gap:12px;padding:18px;background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--radius-xl)}
	.p-head{display:flex;align-items:center;gap:6px;font-size:.62rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--teal)}
	.p-hint{font-size:.72rem;color:var(--text-soft)}
	.p-bars{display:flex;align-items:flex-end;gap:3px;height:24px}
	.p-bar{width:4px;border-radius:100px;background:linear-gradient(180deg,var(--teal),var(--teal-soft));animation:sound-bar 1.2s ease-in-out infinite;transform-origin:bottom}
	@keyframes sound-bar{0%,100%{transform:scaleY(.3);opacity:.4}50%{transform:scaleY(1);opacity:1}}
	.p-actions{display:flex;flex-direction:column;gap:8px;width:100%}
	.p-sounds{display:flex;flex-wrap:wrap;gap:6px;justify-content:center}
	.p-btn{display:flex;align-items:center;gap:5px;padding:8px 14px;border-radius:100px;font-size:.75rem;font-weight:700;color:var(--text-soft);border:1px solid var(--card-border);background:var(--card-bg);transition:all .15s;cursor:pointer}
	.p-btn:hover{border-color:var(--pink);color:var(--text)}
	.p-btn:disabled{opacity:.5;cursor:default}
	.p-btn-tts{border-color:var(--teal);color:var(--teal)}
	.p-btn-tts:hover{border-color:var(--teal);background:var(--teal-soft)}
	.p-btn-sound.active{border-color:var(--gold);color:var(--gold);background:var(--gold-soft)}
	.p-stop{padding:4px 14px;border-radius:100px;font-size:.7rem;font-weight:700;color:var(--text-soft);border:1px solid var(--card-border);transition:all .15s}
	.p-stop:hover{border-color:var(--red);color:var(--red)}
</style>
