<script>
	import { appState } from '$state/appState.svelte.js';
	import Icon from './Icon.svelte';

	const MSGS = {
		HUNGER:'Shh… food is coming. You\'re safe.',
		PAIN:'It\'s okay baby… I\'m here.',
		TIRED:'Sleep now… the world can wait.',
		DISCOMFORT:'Let\'s get comfy… better soon.',
		BURPING:'Let it out… good baby.',
		UNKNOWN:'Shh… everything is okay.',
		INVALID:'This appears to be an adult face. ROO is for babies only.',
	};

	const SOUNDS = {
		heartbeat: { label:'Heartbeat', icon:'heart' },
		whitenoise: { label:'White Noise', icon:'wind' },
		lullaby:   { label:'Lullaby',    icon:'music' },
		shush:     { label:'Shush',      icon:'volume' },
	};

	import { playResponse, halt as stopAll, unlock as ensureAudio, setVol, isPlaying } from '$utils/soundGenerator.js';
	import { speak, stopSpeaking, unlockSpeech, isSpeaking } from '$utils/ttsEngine.js';
	import { trackEvent } from '$utils/analytics.js';

	let msg = $derived(appState.result ? MSGS[appState.result.category] || MSGS.UNKNOWN : '');
	let currentSound = $derived(appState.result?.response_sound || 'whitenoise');
	let playingTTS = $state(false);
	let ttsTimer  = null;

	async function playTTS() {
		unlockSpeech(); ensureAudio();
		playingTTS = true;
		speak(msg);
		trackEvent('response_tts_played', { category: appState.result?.category || 'unknown' });
		// Bug fix: poll isSpeaking() to re-enable button
		clearInterval(ttsTimer);
		ttsTimer = setInterval(() => {
			if (!isSpeaking()) { playingTTS = false; clearInterval(ttsTimer); }
		}, 300);
	}

	function playSound(name) { ensureAudio(); playResponse(name); trackEvent('response_sound_played', { sound: name }); }

	function handleStop() { stopAll(); stopSpeaking(); playingTTS = false; clearInterval(ttsTimer); }

	import { onDestroy } from 'svelte';
	onDestroy(() => clearInterval(ttsTimer));
</script>

{#if appState.result && appState.result.category !== 'INVALID'}
<div class="p animate-up">
	<div class="p-head">
		<Icon name="sparkles" size={14} color="var(--mint)" />
		Soothing Response
	</div>

	{#if appState.autoPlaySounds}
		<div class="p-auto">
			<div class="p-wave">
				{#each Array(8) as _,i}
					<div class="p-bar" style="animation-delay:{i*.1}s"></div>
				{/each}
			</div>
			<p class="p-hint">Playing automatically…</p>
		</div>
	{:else}
		<!-- TTS button -->
		<button class="p-tts" onclick={playTTS} disabled={playingTTS}>
			<Icon name={playingTTS ? 'volume' : 'play'} size={16} color="currentColor" />
			<span>"{msg.length > 32 ? msg.slice(0,32)+'…' : msg}"</span>
		</button>

		<!-- Sound grid -->
		<div class="p-grid">
			{#each Object.entries(SOUNDS) as [key, s]}
				<button class="p-tile" class:active={key === currentSound} onclick={() => playSound(key)}>
					<Icon name={s.icon} size={20} color="currentColor" />
					<span>{s.label}</span>
					{#if key === currentSound}
						<div class="p-eq">
							<div></div><div style="animation-delay:.15s"></div><div style="animation-delay:.3s"></div>
						</div>
					{/if}
				</button>
			{/each}
		</div>
	{/if}

	<button class="p-stop" onclick={handleStop}>
		<Icon name="stop" size={14} color="currentColor" /> Stop all
	</button>
</div>
{/if}

<style>
	.p {
		display:flex; flex-direction:column; align-items:center; gap:14px;
		padding:20px; background:var(--surface); border:1px solid var(--border);
		border-radius:var(--r-xl); box-shadow:var(--shadow-card);
	}
	.p-head {
		display:flex; align-items:center; gap:6px;
		font-size:.62rem; font-weight:800; letter-spacing:.08em; text-transform:uppercase; color:var(--mint);
	}

	/* Auto-play wave */
	.p-auto { display:flex; flex-direction:column; align-items:center; gap:10px; }
	.p-wave { display:flex; align-items:flex-end; gap:3px; height:28px; }
	.p-bar  {
		width:4px; border-radius:100px;
		background:linear-gradient(180deg, var(--mint), var(--lavender));
		animation:wave 1.1s ease-in-out infinite; transform-origin:bottom;
		min-height:4px;
	}
	.p-hint { font-size:.75rem; color:var(--text-soft); }

	/* TTS button */
	.p-tts {
		width:100%; padding:12px 16px; border-radius:var(--r-md);
		background:var(--mint-soft); border:1px solid rgba(110,231,183,.25); color:var(--mint);
		display:flex; align-items:center; gap:8px;
		font-size:.82rem; font-weight:700; cursor:pointer; transition:all .15s;
		text-align:left;
	}
	.p-tts:hover:not(:disabled) { background:var(--mint-soft); border-color:var(--mint); }
	.p-tts:disabled { opacity:.5; cursor:default; }
	.p-tts span { flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-style:italic; }

	/* Sound grid */
	.p-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; width:100%; }
	.p-tile {
		padding:14px 10px; border-radius:var(--r-md);
		background:var(--surface-2); border:1px solid var(--border); color:var(--text-soft);
		display:flex; flex-direction:column; align-items:center; gap:6px;
		font-size:.72rem; font-weight:700; cursor:pointer;
		transition:all .2s; position:relative; min-height:80px;
	}
	.p-tile:hover { border-color:var(--lavender); color:var(--text); }
	.p-tile.active { border-color:var(--mint); background:var(--mint-soft); color:var(--mint); }

	/* EQ bars in tile */
	.p-eq { display:flex; align-items:flex-end; gap:2px; height:12px; position:absolute; top:8px; right:8px; }
	.p-eq div { width:3px; border-radius:1px; background:var(--mint); animation:eq .9s ease-in-out infinite; }

	/* Stop */
	.p-stop {
		padding:7px 20px; border-radius:var(--r-pill);
		font-size:.72rem; font-weight:700; color:var(--text-soft);
		border:1px solid var(--border); transition:all .15s;
		display:flex; align-items:center; gap:5px;
	}
	.p-stop:hover { border-color:var(--red); color:var(--red); background:var(--red-soft); }
</style>
