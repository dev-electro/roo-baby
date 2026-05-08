<script>
	import { appState } from '$state/appState.svelte.js';
	import { stopAllSounds } from '$utils/soundGenerator.js';
	import { stopSpeaking } from '$utils/ttsEngine.js';
	import Icon from './Icon.svelte';
	
	const RESPONSE_MESSAGES = {
		HUNGER: "Shh little one… food is on the way. You're safe.",
		PAIN: "It's okay baby… I'm right here. You're not alone.",
		TIRED: "Sleep now little one… the world can wait.",
		DISCOMFORT: "Shh shh… let's make you comfortable. Better soon.",
		BURPING: "Let it out… you'll feel much better. Good baby.",
		UNKNOWN: "Shh shh… it's okay little one. Everything is fine."
	};
	
	$: message = appState.result
		? RESPONSE_MESSAGES[appState.result.category] || RESPONSE_MESSAGES.UNKNOWN
		: '';
	
	function handleStop() {
		stopAllSounds();
		stopSpeaking();
	}
</script>

{#if appState.result}
	<div class="player animate-slide-up">
		<div class="player-header">
			<span class="player-label">ROO is soothing</span>
			<div class="sound-bars">
				{#each Array(7) as _, i}
					<div class="bar" style="animation-delay: {i * 0.1}s"></div>
				{/each}
			</div>
		</div>
		
		<p class="player-message">"{message}"</p>
		
		<button class="stop-btn" onclick={handleStop} type="button">
			<Icon name="stop" size={14} />
			<span>Stop</span>
		</button>
	</div>
{/if}

<style>
	.player {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 14px;
		padding: 22px 24px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-2xl);
		backdrop-filter: blur(16px);
		box-shadow: var(--shadow-md);
	}

	.player-header {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
	}

	.player-label {
		font-size: 0.65rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--accent);
	}

	.sound-bars {
		display: flex;
		align-items: flex-end;
		gap: 3px;
		height: 32px;
	}

	.bar {
		width: 4px;
		border-radius: 100px;
		background: linear-gradient(180deg, var(--accent), rgba(110,231,183,0.25));
		animation: sound-bar 1.4s ease-in-out infinite;
		transform-origin: bottom;
	}

	.player-message {
		font-size: 1rem;
		color: var(--text);
		font-weight: 600;
		text-align: center;
		line-height: 1.6;
		font-style: italic;
		max-width: 280px;
	}

	.stop-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 8px 18px;
		border-radius: var(--radius-full);
		font-size: 0.78rem;
		font-weight: 700;
		color: var(--text-muted);
		background: rgba(255,255,255,0.04);
		border: 1px solid var(--border);
		transition: all var(--transition-fast);
	}

	.stop-btn:hover {
		background: rgba(255,107,138,0.08);
		color: var(--danger);
		border-color: rgba(255,107,138,0.2);
	}
</style>