<script>
	import { appState } from '$state/appState.svelte.js';
	import { stopAllSounds } from '$utils/soundGenerator.js';
	import { stopSpeaking } from '$utils/ttsEngine.js';
	const MSGS={HUNGER:"Shh… food is coming. You're safe.",PAIN:"It's okay baby… I'm here.",TIRED:"Sleep now… the world can wait.",DISCOMFORT:"Let's get comfy… better soon.",BURPING:"Let it out… good baby.",UNKNOWN:"Shh… everything is okay."};
	$: msg=appState.result?MSGS[appState.result.category]||MSGS.UNKNOWN:'';
	function stop(){stopAllSounds();stopSpeaking()}
</script>
{#if appState.result}
<div class="p animate-slide">
	<div class="p-head">🦘 ROO is soothing</div>
	<div class="p-bars">{#each Array(7) as _,i}<div class="p-bar" style="animation-delay:{i*.1}s"></div>{/each}</div>
	<p class="p-msg">"{msg}"</p>
	<button class="p-stop" onclick={stop}>⏹️ Stop</button>
</div>
{/if}
<style>
	.p{display:flex;flex-direction:column;align-items:center;gap:12px;padding:20px;background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--radius-xl)}
	.p-head{font-size:.62rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--teal)}
	.p-bars{display:flex;align-items:flex-end;gap:3px;height:28px}
	.p-bar{width:4px;border-radius:100px;background:linear-gradient(180deg,var(--teal),var(--teal-soft));animation:sound-bar 1.2s ease-in-out infinite;transform-origin:bottom}
	@keyframes sound-bar{0%,100%{transform:scaleY(.3);opacity:.4}50%{transform:scaleY(1);opacity:1}}
	.p-msg{font-size:.92rem;color:var(--text);font-weight:600;text-align:center;line-height:1.5;font-style:italic}
	.p-stop{padding:6px 18px;border-radius:100px;font-size:.75rem;font-weight:700;color:var(--text-soft);border:1px solid var(--card-border);transition:all .15s}
	.p-stop:hover{border-color:var(--red);color:var(--red)}
</style>