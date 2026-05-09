<script>
	import { appState } from '$state/appState.svelte.js';
	import { halt as stopAllSounds } from '$utils/soundGenerator.js';
	import { stopSpeaking } from '$utils/ttsEngine.js';
	import Icon from './Icon.svelte';
	import { modeSwitch as trackMode } from '$utils/analytics.js';

	const modes = [
		{ id: 'audio', icon: 'mic',    label: 'Audio',  sub: 'Cry analysis' },
		{ id: 'image', icon: 'camera', label: 'Photo',  sub: 'Face analysis' },
		{ id: 'both',  icon: 'star',   label: 'Dual',   sub: 'Audio + Face' },
	];

	function pick(mode) {
		stopAllSounds();
		stopSpeaking();
		appState.currentMode = mode;
		appState.reset();
		trackMode(mode);
	}
</script>

<nav class="tabs" role="tablist">
	{#each modes as m}
		<button
			class="tab"
			class:on={appState.currentMode === m.id}
			onclick={() => pick(m.id)}
			role="tab"
			aria-selected={appState.currentMode === m.id}
		>
			<div class="tab-icon">
				<Icon name={m.icon} size={20} color="currentColor" />
			</div>
			<span class="tab-l">{m.label}</span>
			<span class="tab-s">{m.sub}</span>
		</button>
	{/each}
</nav>

<style>
	.tabs {
		display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px;
		padding:6px; background:var(--surface); border:1px solid var(--border); border-radius:var(--r-lg);
	}

	.tab {
		display:flex; flex-direction:column; align-items:center; gap:3px;
		padding:12px 6px 10px; border-radius:var(--r-md);
		font-weight:700; color:var(--text-dim);
		transition:all .2s cubic-bezier(.34,1.56,.64,1);
		position:relative;
	}
	.tab:hover:not(.on) { background:var(--surface-2); color:var(--text-soft); }

	.tab.on {
		background:linear-gradient(145deg, var(--lavender), var(--indigo));
		color:#fff;
		box-shadow:0 4px 20px var(--lav-glow);
		transform:scale(1.02);
	}

	.tab-icon {
		width:36px; height:36px; border-radius:var(--r-sm);
		display:flex; align-items:center; justify-content:center;
		transition:background .2s;
	}
	.tab.on .tab-icon { background:rgba(255,255,255,.15); }

	.tab-l { font-size:.8rem; line-height:1; }
	.tab-s { font-size:.58rem; opacity:.6; line-height:1; }
	.tab.on .tab-s { opacity:.75; }
</style>
