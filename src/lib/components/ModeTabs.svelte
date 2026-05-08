<script>
	import { appState } from '$state/appState.svelte.js';
	import Icon from './Icon.svelte';
	
	const modes = [
		{ id: 'audio', label: 'Audio', icon: 'mic' },
		{ id: 'image', label: 'Image', icon: 'camera' },
		{ id: 'both', label: 'Best', icon: 'bolt' }
	];
	
	function selectMode(mode) {
		appState.currentMode = mode;
		appState.reset();
	}
</script>

<div class="tabs">
	{#each modes as mode}
		<button
			class="tab"
			class:active={appState.currentMode === mode.id}
			onclick={() => selectMode(mode.id)}
			type="button"
		>
			<Icon name={mode.icon} size={18} color={appState.currentMode === mode.id ? '#fff' : 'rgba(242,237,232,0.5)'} />
			<span class="tab-label">{mode.label}</span>
		</button>
	{/each}
</div>

<style>
	.tabs {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 6px;
		padding: 5px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		backdrop-filter: blur(12px);
	}

	.tab {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 5px;
		padding: 12px 4px;
		border-radius: var(--radius-md);
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		color: var(--text-muted);
		background: transparent;
		transition: all var(--transition-base);
		position: relative;
		overflow: hidden;
	}

	.tab::before {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(135deg, rgba(255,123,92,0.15), rgba(255,179,71,0.1));
		border-radius: inherit;
		opacity: 0;
		transition: opacity var(--transition-base);
	}

	.tab:hover:not(.active) {
		color: var(--text);
		background: var(--surface-hover);
	}

	.tab.active {
		color: var(--text);
	}

	.tab.active::before {
		opacity: 1;
	}

	.tab.active::after {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: inherit;
		border: 1px solid var(--border-glow);
		box-shadow: 0 4px 20px rgba(255,123,92,0.12);
	}

	.tab-label {
		position: relative;
		z-index: 1;
	}

	:global(.tab svg) {
		position: relative;
		z-index: 1;
		transition: transform var(--transition-fast);
	}

	.tab:hover :global(svg) {
		transform: translateY(-1px);
	}
</style>
