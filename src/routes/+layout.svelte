<script>
	import '../app.css';
	import { appState } from '$state/appState.svelte.js';
	import SettingsPanel from '$components/SettingsPanel.svelte';

	let { children } = $props();

	let theme = $state(globalThis.localStorage?.getItem('roo-theme') || 'dark');

	function toggleTheme() {
		theme = theme === 'dark' ? 'light' : 'dark';
		globalThis.localStorage?.setItem('roo-theme', theme);
	}

	$effect(() => {
		document.documentElement.setAttribute('data-theme', theme);
	});
</script>

<div class="shell">
	<div class="topbar">
		<div class="topbar-inner">
			<span class="topbar-logo">🦘 ROO</span>
			<div class="topbar-end">
				<button class="tb-btn" onclick={toggleTheme} aria-label="Toggle theme">
					{theme === 'dark' ? '☀️' : '🌙'}
				</button>
				<button class="tb-btn" onclick={() => appState.showSettings = true} aria-label="Info">ℹ️</button>
			</div>
		</div>
	</div>
	<main class="main">{@render children()}</main>
	<SettingsPanel />
</div>

<style>
	.shell{min-height:100dvh}
	.topbar{
		position:sticky;top:0;z-index:40;
		background:var(--bg);border-bottom:1px solid var(--card-border);
		padding-top:env(safe-area-inset-top);
	}
	.topbar-inner{
		max-width:480px;margin:0 auto;padding:8px 20px;
		display:flex;align-items:center;justify-content:space-between;
	}
	.topbar-logo{font-family:'Fraunces',serif;font-size:1rem;font-weight:700;color:var(--text)}
	.topbar-end{display:flex;gap:4px}
	.tb-btn{
		width:36px;height:36px;border-radius:50%;
		display:flex;align-items:center;justify-content:center;
		font-size:1rem;transition:background .15s;
	}
	.tb-btn:hover{background:var(--card-bg)}
	.main{max-width:480px;margin:0 auto;padding:12px 20px 60px;display:flex;flex-direction:column;gap:14px}
</style>