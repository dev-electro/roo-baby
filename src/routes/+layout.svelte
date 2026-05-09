<script>
	import '../app.css';
	import { page } from '$app/stores';
	import { appState } from '$state/appState.svelte.js';
	import Icon from '$components/Icon.svelte';
	import SettingsPanel from '$components/SettingsPanel.svelte';

	let { children } = $props();

	let theme = $state(typeof localStorage !== 'undefined' ? localStorage.getItem('roo-theme') || 'dark' : 'dark');

	function toggleTheme() {
		theme = theme === 'dark' ? 'light' : 'dark';
		try { localStorage.setItem('roo-theme', theme); } catch {}
	}

	$effect(() => {
		document.documentElement.setAttribute('data-theme', theme);
	});
</script>

<div class="shell">
	<div class="topbar">
		<div class="topbar-inner">
			<Icon name="kangaroo" size={18} color="var(--pink)" />
			<span class="topbar-brand">ROO</span>
			<div class="topbar-end">
				{#if $page.url.pathname !== '/soothe'}
					<a href="/soothe" class="tb-btn" aria-label="Soothing sounds">
						<Icon name="play" size={16} color="currentColor" />
					</a>
				{/if}
				<button class="tb-btn" onclick={toggleTheme} aria-label="Toggle theme">
					<Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} color="currentColor" />
				</button>
				<button class="tb-btn" onclick={() => appState.showSettings = true} aria-label="Info">
					<Icon name="info-circle" size={16} color="currentColor" />
				</button>
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
		display:flex;align-items:center;justify-content:space-between;gap:8px;
	}
	.topbar-brand{font-family:'Fraunces',serif;font-size:1rem;font-weight:700;color:var(--text)}
	.topbar-end{display:flex;gap:4px}
	.tb-btn{
		width:32px;height:32px;border-radius:50%;
		display:flex;align-items:center;justify-content:center;
		transition:background .15s;color:var(--text-soft);text-decoration:none;
	}
	.tb-btn:hover{background:var(--card-bg)}
	.main{max-width:480px;margin:0 auto;padding:12px 20px 60px;display:flex;flex-direction:column;gap:14px}
</style>