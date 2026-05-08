<script>
	import { appState } from '$state/appState.svelte.js';
	
	const texts = [
		'ROO is listening…',
		'Analyzing cry patterns…',
		'Consulting Gemma 4…',
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
			}, 1800);
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
		<div class="dots">
			{#each Array(3) as _, i}
				<div class="dot" style="animation-delay: {i * 0.15}s"></div>
			{/each}
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
		padding: 36px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		backdrop-filter: blur(12px);
	}

	.dots {
		display: flex;
		gap: 8px;
	}

	.dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: linear-gradient(135deg, var(--coral), var(--amber));
		animation: bounce-dot 0.9s ease-in-out infinite;
	}

	.text {
		font-size: 0.9rem;
		color: var(--text-muted);
		font-weight: 600;
		min-height: 1.4em;
	}
</style>
