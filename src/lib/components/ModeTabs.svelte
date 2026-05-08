<script>
	import { appState } from '$state/appState.svelte.js';
	import Icon from './Icon.svelte';
	
	const modes = [
		{ id: 'audio', label: 'Audio', icon: 'mic', desc: 'Cry only' },
		{ id: 'image', label: 'Photo', icon: 'camera', desc: 'Face only' },
		{ id: 'both', label: 'Best', icon: 'bolt', desc: 'Both' }
	];
	
	function selectMode(mode) {
		if (appState.currentMode === mode) return;
		appState.reset();
		appState.currentMode = mode;
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
			<Icon name={mode.icon} size={18} color={appState.currentMode === mode.id ? '#fff' : 'var(--text-muted)'} />
			<div class="tab-text">
				<span class="tab-label">{mode.label}</span>
				<span class="tab-desc">{mode.desc}</span>
			</div>
		</button>
	{/each}
</div>

<style>
	.tabs {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
		padding: 6px;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-lg);
		backdrop-filter: blur(20px);
	}

	.tab {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 12px 8px;
		border-radius: var(--radius-md);
		font-size: 0.82rem;
		font-weight: 700;
		letter-spacing: 0.02em;
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
		background: linear-gradient(135deg, rgba(255,140,107,0.12), rgba(255,184,108,0.08));
		border-radius: inherit;
		opacity: 0;
		transition: opacity var(--transition-base);
	}

	.tab:hover:not(.active) {
		color: var(--text);
		background: var(--surface-hover);
	}

	.tab.active {
		color: #fff;
	}

	.tab.active::before {
		opacity: 1;
	}

	.tab.active::after {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: inherit;
		border: 1px solid rgba(255,140,107,0.25);
		box-shadow: 0 4px 20px rgba(255,140,107,0.15);
	}

	.tab-text {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
	}

	.tab-desc {
		font-size: 0.6rem;
		font-weight: 500;
		opacity: 0.6;
		letter-spacing: 0.04em;
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