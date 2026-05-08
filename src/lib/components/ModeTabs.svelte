<script>
	import { appState } from '$state/appState.svelte.js';
	import Icon from './Icon.svelte';

	const modes = [
		{ id: 'audio', icon: 'mic', label: 'Audio', sub: 'Cry only' },
		{ id: 'image', icon: 'camera', label: 'Photo', sub: 'Face only' },
		{ id: 'both',  icon: 'star', label: 'Best',  sub: 'Audio+Photo' },
	];

	function pick(mode) {
		appState.currentMode = mode;
		appState.reset();
	}
</script>

<nav class="tabs">
	{#each modes as m}
		<button class="tab" class:on={appState.currentMode === m.id} onclick={() => pick(m.id)}>
			<Icon name={m.icon} size={18} color="currentColor" />
			<span class="tab-l">{m.label}</span>
			<span class="tab-s">{m.sub}</span>
		</button>
	{/each}
</nav>

<style>
	.tabs{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;padding:5px;background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--radius)}
	.tab{display:flex;flex-direction:column;align-items:center;gap:2px;padding:10px 4px;border-radius:var(--radius-sm);font-weight:600;transition:all .2s;color:var(--text-soft)}
	.tab:hover:not(.on){background:rgba(128,128,128,.06)}
	.tab.on{background:linear-gradient(135deg,var(--pink-soft),var(--gold-soft));color:var(--text);box-shadow:0 0 0 1px var(--pink)}
	.tab-l{font-size:.78rem}
	.tab-s{font-size:.58rem;opacity:.5}
</style>