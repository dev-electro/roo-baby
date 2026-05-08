<script>
	import { appState } from '$state/appState.svelte.js';
	import { stopAllSounds } from '$utils/soundGenerator.js';
	import { stopSpeaking } from '$utils/ttsEngine.js';
	import Icon from './Icon.svelte';
	
	const RESPONSE_MESSAGES = {
		HUNGER: "Shh little one… food is on the way. You're safe.",
		PAIN: "It's okay baby… mama is right here. You're not alone.",
		TIRED: "Sleep now little one… the world can wait. Rest now.",
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
	
	$: if (appState.result) {
		// Auto-show when result arrives
	}
</script>

{#if appState.result}
	<div class="player animate-slide-up">
		<div class="player-header">
			<span class="player-label">ROO is responding</span>
			<div class="sound-bars">
				{#each Array(7) as _, i}
					<div class="bar" style="animation-delay: {i * 0.1}s; height: {14 + i * 4}px"></div>
				{/each}
			</div>
		</div>
		
		<p class="player-message">{message}</p>
		
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
		gap: 16px;
		padding: 24px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-xl);
		backdrop-filter: blur(12px);
		box-shadow: var(--shadow-md);
	}

	.player-header {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
	}

	.player-label {
		font-size: 0.7rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.sound-bars {
		display: flex;
		align-items: flex-end;
		gap: 4px;
		height: 40px;
	}

	.bar {
		width: 5px;
		border-radius: 100px;
		background: linear-gradient(180deg, var(--mint), rgba(82,217,193,0.3));
		animation: sound-bar 1.4s ease-in-out infinite;
		transform-origin: bottom;
	}

	.player-message {
		font-size: 1.05rem;
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
		gap: 8px;
		padding: 10px 22px;
		border-radius: var(--radius-full);
		font-size: 0.82rem;
		font-weight: 700;
		color: var(--text-muted);
		background: rgba(255,255,255,0.05);
		border: 1px solid var(--border);
		transition: all var(--transition-fast);
	}

	.stop-btn:hover {
		background: rgba(255,77,109,0.1);
		color: var(--danger);
		border-color: rgba(255,77,109,0.2);
	}
</style>
