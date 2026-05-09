<script>
	import { appState } from '$state/appState.svelte.js';
	import Icon from './Icon.svelte';

	const MODES = [
		{ id:'audio', label:'Record Cry',  icon:'mic',    sub:'Audio only' },
		{ id:'image', label:'Baby Face',   icon:'camera', sub:'Visual only' },
		{ id:'both',  label:'Both',        icon:'search', sub:'Best result', badge:true },
	];
</script>

<div class="mt" role="tablist" aria-label="Analysis mode">
	{#each MODES as m}
		<button
			class="mt-tab"
			class:active={appState.currentMode === m.id}
			role="tab"
			aria-selected={appState.currentMode === m.id}
			onclick={() => { appState.currentMode = m.id; appState.reset(); }}
		>
			<Icon
				name={m.icon}
				size={20}
				color={appState.currentMode === m.id ? 'var(--accent)' : 'var(--text-3)'}
			/>
			<span class="mt-label">{m.label}</span>
			{#if m.badge}
				<span class="mt-best">Best</span>
			{/if}
		</button>
	{/each}
</div>

<style>
	.mt {
		display:grid; grid-template-columns:repeat(3,1fr);
		gap:6px; padding:6px;
		background:var(--surface-2); border:1px solid var(--border);
		border-radius:var(--r-xl);
	}

	.mt-tab {
		display:flex; flex-direction:column; align-items:center; justify-content:center;
		gap:5px;
		padding:14px 8px; /* 48px+ tall */
		border-radius:var(--r-lg);
		font-size:.78rem; font-weight:800; color:var(--text-3);
		position:relative; transition:all .18s;
		min-height:68px;
	}
	.mt-tab:hover:not(.active) { background:var(--surface-3); color:var(--text-2); }
	.mt-tab.active {
		background:var(--surface); color:var(--text);
		box-shadow:var(--shadow-sm);
		border:1px solid var(--border);
	}

	.mt-label { font-size:.7rem; font-weight:800; text-align:center; line-height:1.2; }

	.mt-best {
		position:absolute; top:6px; right:6px;
		font-size:.45rem; font-weight:800; letter-spacing:.06em; text-transform:uppercase;
		padding:2px 5px; border-radius:var(--r-xs);
		background:var(--accent-muted); color:var(--accent); border:1px solid var(--accent-border);
	}
</style>
