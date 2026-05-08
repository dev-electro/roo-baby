<script>
	import { appState } from '$state/appState.svelte.js';
	
	const texts = [
		'Listening to your baby…',
		'Reading the spectrogram…',
		'Consulting ROO AI…',
		'Almost there…'
	];
	
	let currentText = $state(texts[0]);
	let textIndex = 0;
	let interval;
	
	$effect(() => {
		if (appState.isAnalyzing) {
			interval = setInterval(() => {
				textIndex = (textIndex + 1) % texts.length;
				currentText = texts[textIndex];
			}, 2000);
			return () => {
				clearInterval(interval);
			};
		} else {
			currentText = texts[0];
			textIndex = 0;
		}
	});
</script>

{#if appState.isAnalyzing}
	<div class="loading animate-slide-up">
		<div class="pulse-ring">
			<span class="pulse-emoji">🦘</span>
		</div>
		<p class="text">{currentText}</p>
	</div>
{/if}

<style>
	.loading {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
		padding: 32px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-2xl);
		backdrop-filter: blur(16px);
	}

	.pulse-ring {
		width: 64px;
		height: 64px;
		border-radius: 50%;
		background: linear-gradient(135deg, rgba(255,140,107,0.15), rgba(255,184,108,0.1));
		border: 2px solid rgba(255,140,107,0.2);
		display: flex;
		align-items: center;
		justify-content: center;
		animation: gentle-pulse 2s ease-in-out infinite;
	}

	.pulse-emoji {
		font-size: 1.8rem;
		line-height: 1;
	}

	.text {
		font-size: 0.88rem;
		color: var(--text-muted);
		font-weight: 600;
		min-height: 1.4em;
	}
</style>