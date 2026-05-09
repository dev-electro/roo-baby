<script>
	import { appState } from '$state/appState.svelte.js';
	import Icon from './Icon.svelte';

	const TABS = [
		{ id:'audio', label:'Audio', icon:'mic',   desc:'Microphone' },
		{ id:'image', label:'Video', icon:'camera',desc:'Camera' },
		{ id:'both',  label:'Both',  icon:'check', desc:'High accuracy' }
	];
</script>

<div class="tabs">
	{#each TABS as t}
		<button
			class="tab"
			class:active={appState.currentMode === t.id}
			onclick={() => {
				if (appState.isAnalyzing) return;
				appState.setMode(t.id);
			}}
			disabled={appState.isAnalyzing}
			aria-pressed={appState.currentMode === t.id}
		>
			<Icon name={t.icon} size={16} color="currentColor" />
			<span class="tab-lbl">{t.label}</span>
		</button>
	{/each}
</div>

<style>
	.tabs {
		display:flex; background:var(--surface); padding:4px;
		border-radius:var(--r-sm); border:1px solid var(--border);
		box-shadow:var(--shadow-card);
	}
	.tab {
		flex:1; display:flex; align-items:center; justify-content:center; gap:8px;
		padding:10px 0; border-radius:var(--r-xs);
		font-size:0.85rem; font-weight:600; color:var(--text-soft);
		transition:all 0.2s; position:relative; z-index:1;
	}
	.tab:hover:not(:disabled):not(.active) { color:var(--text); background:var(--surface-2); }
	.tab.active { color:var(--surface); background:var(--text); box-shadow:0 1px 4px rgba(0,0,0,0.2); }
	.tab:disabled { opacity:0.5; cursor:not-allowed; }
</style>
