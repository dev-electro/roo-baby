<script>
	import '../app.css';
	import { page } from '$app/stores';
	import { appState } from '$state/appState.svelte.js';
	import Icon from '$components/Icon.svelte';
	import SettingsPanel from '$components/SettingsPanel.svelte';

	let { children } = $props();

	let theme = $state(typeof localStorage !== 'undefined' ? localStorage.getItem('roo-theme') || 'dark' : 'dark');
	let updateReady = $state(false);

	function toggleTheme() {
		theme = theme === 'dark' ? 'light' : 'dark';
		try { localStorage.setItem('roo-theme', theme); } catch {}
	}

	function refreshApp() {
		if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
			navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
		}
		window.location.reload();
	}

	$effect(() => {
		document.documentElement.setAttribute('data-theme', theme);
	});

	$effect(() => {
		if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
		const handler = (event) => {
			if (event.data?.type === 'SW_UPDATED') updateReady = true;
		};
		navigator.serviceWorker.addEventListener('message', handler);
		// Also check if there's already a waiting worker
		navigator.serviceWorker.ready.then(reg => {
			if (reg.waiting) updateReady = true;
		});
		return () => navigator.serviceWorker.removeEventListener('message', handler);
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

	{#if updateReady}
		<div class="sw-toast animate-slide">
			<Icon name="sparkles" size={14} color="var(--teal)" />
			<span>Update available</span>
			<button class="sw-refresh" onclick={refreshApp}>Refresh</button>
		</div>
	{/if}
</div>

<style>
	.shell{min-height:100dvh;width:100%}
	.topbar{
		position:sticky;top:0;z-index:40;
		background:var(--bg);border-bottom:1px solid var(--card-border);
		padding-top:env(safe-area-inset-top);
	}
	.topbar-inner{
		width:100%;padding:8px 20px;
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
	.main{width:100%;padding:12px 20px 60px;display:flex;flex-direction:column;gap:14px}
	@media(min-width:640px){.main{max-width:720px;margin:0 auto;padding:16px 24px 80px}.topbar-inner{max-width:720px;margin:0 auto;padding:10px 24px}}
	@media(min-width:1024px){.main{max-width:960px;gap:18px}.topbar-inner{max-width:960px}}

	.sw-toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:200;display:flex;align-items:center;gap:10px;padding:12px 20px;border-radius:100px;background:var(--card-bg);border:1px solid var(--teal);box-shadow:0 8px 32px rgba(0,0,0,.4);font-size:.82rem;font-weight:700;color:var(--text)}
	.sw-refresh{padding:6px 18px;border-radius:100px;font-size:.75rem;font-weight:700;color:#fff;background:linear-gradient(135deg,var(--pink),var(--gold));border:none;cursor:pointer}
	.sw-refresh:hover{opacity:.9}
</style>