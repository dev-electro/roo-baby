<script>
	import { appState } from '$state/appState.svelte.js';
	import Icon from './Icon.svelte';

	// Each mode has its own color identity
	const MODES = [
		{ id:'audio', label:'Record Cry',  icon:'mic',    color:'var(--emerald)', bg:'var(--emerald-bg)', border:'var(--emerald-border)', sub:'Audio only' },
		{ id:'image', label:'Baby Face',   icon:'camera', color:'var(--sky)',     bg:'var(--sky-bg)',     border:'var(--sky-border)',     sub:'Visual' },
		{ id:'both',  label:'Combined',    icon:'search', color:'var(--accent)',  bg:'var(--accent-muted)',border:'var(--accent-border)', sub:'Best result', badge:true },
	];
</script>

<div class="mt" role="tablist" aria-label="Analysis mode">
	{#each MODES as m}
		{@const active = appState.currentMode === m.id}
		<button
			class="mt-tab"
			class:active
			role="tab"
			aria-selected={active}
			style={active ? `--tc:${m.color};--tbg:${m.bg};--tbdr:${m.border}` : ''}
			onclick={() => { appState.currentMode = m.id; appState.reset(); }}
		>
			<div class="mt-icon-wrap" class:on={active}>
				<Icon name={m.icon} size={20} color={active ? m.color : 'var(--text-3)'} />
			</div>
			<span class="mt-label">{m.label}</span>
			{#if m.badge}
				<span class="mt-best">✦ Best</span>
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
		gap:6px; padding:14px 8px; border-radius:var(--r-lg);
		font-size:.7rem; font-weight:800; color:var(--text-3);
		position:relative; transition:all .18s;
		min-height:72px;
	}
	.mt-tab:hover:not(.active) { background:var(--surface-3); color:var(--text-2); }
	.mt-tab.active {
		background: var(--tbg);
		color: var(--tc);
		box-shadow: var(--shadow-sm);
		border: 1px solid var(--tbdr);
	}

	.mt-icon-wrap {
		width:36px; height:36px; border-radius:var(--r-md);
		display:flex; align-items:center; justify-content:center;
		background:transparent; transition:background .15s;
	}
	.mt-icon-wrap.on { background:var(--surface); }

	.mt-label { font-size:.68rem; font-weight:800; text-align:center; line-height:1.2; }

	.mt-best {
		position:absolute; top:6px; right:6px;
		font-size:.45rem; font-weight:800; letter-spacing:.05em;
		padding:2px 5px; border-radius:var(--r-xs);
		background:var(--accent-muted); color:var(--accent); border:1px solid var(--accent-border);
	}
</style>
