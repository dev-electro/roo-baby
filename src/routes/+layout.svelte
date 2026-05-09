<script>
	import '../app.css';
	import { page } from '$app/stores';
	import { appState } from '$state/appState.svelte.js';
	import { init as initGA, pageView as trackPage, toggleTheme as trackTheme } from '$utils/analytics.js';
	import Icon from '$components/Icon.svelte';
	import SettingsPanel from '$components/SettingsPanel.svelte';

	let { children } = $props();

	// SSR-safe theme init
	let theme = $state((() => { try { return localStorage.getItem('roo-theme') || 'dark'; } catch { return 'dark'; } })());
	let updateReady = $state(false);

	function toggleTheme() {
		theme = theme === 'dark' ? 'light' : 'dark';
		try { localStorage.setItem('roo-theme', theme); } catch {}
		trackTheme(theme);
	}

	function refreshApp() {
		if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
			navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
		}
		window.location.reload();
	}

	$effect(() => { document.documentElement.setAttribute('data-theme', theme); });
	$effect(() => { initGA(); trackPage($page.url.pathname); });
	$effect(() => {
		if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
		const handler = (event) => { if (event.data?.type === 'SW_UPDATED') updateReady = true; };
		navigator.serviceWorker.addEventListener('message', handler);
		navigator.serviceWorker.ready.then(reg => { if (reg.waiting) updateReady = true; });
		return () => navigator.serviceWorker.removeEventListener('message', handler);
	});

	const isSoothe = $derived($page.url.pathname === '/soothe');
</script>

<!-- Background mesh blobs -->
<div class="bg-mesh" aria-hidden="true">
	<div class="blob blob-1"></div>
	<div class="blob blob-2"></div>
	<div class="blob blob-3"></div>
</div>

<div class="shell">
	<!-- Top bar -->
	<div class="topbar glass">
		<div class="topbar-inner">
			<a href="/" class="brand" aria-label="ROO Home">
				<div class="brand-icon"><Icon name="kangaroo" size={16} color="var(--lavender)" /></div>
				<span class="brand-name">ROO</span>
			</a>
			<div class="topbar-end">
				{#if !isSoothe}
					<a href="/soothe" class="tb-btn" aria-label="Soothing sounds">
						<Icon name="music" size={16} color="currentColor" />
						<span class="tb-label">Soothe</span>
					</a>
				{:else}
					<a href="/" class="tb-btn" aria-label="Analyzer">
						<Icon name="search" size={16} color="currentColor" />
						<span class="tb-label">Analyze</span>
					</a>
				{/if}
				<button class="tb-btn" onclick={toggleTheme} aria-label="Toggle theme">
					<Icon name={theme === 'dark' ? 'sun' : 'moon'} size={16} color="currentColor" />
				</button>
				<button class="tb-btn" onclick={() => appState.showSettings = true} aria-label="Settings">
					<Icon name="settings" size={16} color="currentColor" />
				</button>
			</div>
		</div>
	</div>

	<main class="main">{@render children()}</main>

	<SettingsPanel />

	{#if updateReady}
		<div class="sw-toast animate-up">
			<Icon name="sparkles" size={14} color="var(--mint)" />
			<span>Update ready</span>
			<button class="sw-refresh" onclick={refreshApp}>Refresh</button>
		</div>
	{/if}
</div>

<style>
	/* Background mesh */
	.bg-mesh { position:fixed; inset:0; z-index:-1; pointer-events:none; overflow:hidden; }
	.blob {
		position:absolute; border-radius:50%;
		filter:blur(80px); opacity:.35;
		animation:float 8s ease-in-out infinite;
	}
	.blob-1 { width:400px; height:400px; top:-100px; right:-80px; background:radial-gradient(circle, var(--lavender), transparent 70%); animation-delay:0s; }
	.blob-2 { width:300px; height:300px; bottom:20%; left:-60px; background:radial-gradient(circle, var(--mint), transparent 70%); animation-delay:-3s; }
	.blob-3 { width:250px; height:250px; top:50%; right:10%; background:radial-gradient(circle, var(--indigo), transparent 70%); animation-delay:-5s; opacity:.2; }

	.shell { min-height:100dvh; width:100%; }

	/* Topbar */
	.topbar {
		position:sticky; top:0; z-index:40;
		border-bottom:1px solid var(--border);
		padding-top:env(safe-area-inset-top);
	}
	.topbar-inner {
		width:100%; padding:8px 20px;
		display:flex; align-items:center; justify-content:space-between; gap:8px;
	}

	/* Brand */
	.brand { display:flex; align-items:center; gap:8px; text-decoration:none; }
	.brand-icon {
		width:30px; height:30px; border-radius:var(--r-sm);
		background:var(--lav-soft); border:1px solid rgba(167,139,250,.2);
		display:flex; align-items:center; justify-content:center;
	}
	.brand-name { font-family:'Fraunces',serif; font-size:1.05rem; font-weight:700; color:var(--text); }

	/* Nav buttons */
	.topbar-end { display:flex; gap:4px; }
	.tb-btn {
		display:flex; align-items:center; gap:5px;
		padding:6px 8px; border-radius:var(--r-sm);
		color:var(--text-soft); text-decoration:none;
		transition:all .15s;
	}
	.tb-btn:hover { background:var(--surface); color:var(--text); }
	.tb-label { font-size:.72rem; font-weight:700; }
	@media(max-width:380px){ .tb-label { display:none; } }

	/* Main content */
	.main { width:100%; padding:14px 18px 64px; display:flex; flex-direction:column; gap:16px; }
	@media(min-width:640px)  { .main { max-width:720px; margin:0 auto; padding:18px 24px 80px; gap:18px; } .topbar-inner { max-width:720px; margin:0 auto; } }
	@media(min-width:1024px) { .main { max-width:840px; gap:20px; } .topbar-inner { max-width:840px; } }

	/* SW toast */
	.sw-toast {
		position:fixed; bottom:20px; left:50%; transform:translateX(-50%); z-index:200;
		display:flex; align-items:center; gap:10px; padding:12px 18px;
		border-radius:var(--r-pill); background:var(--surface); border:1px solid var(--mint);
		box-shadow:0 8px 32px rgba(0,0,0,.4); font-size:.82rem; font-weight:700; color:var(--text);
	}
	.sw-refresh {
		padding:5px 16px; border-radius:var(--r-pill); font-size:.75rem; font-weight:800;
		color:#fff; background:linear-gradient(135deg, var(--lavender), var(--indigo));
	}
	.sw-refresh:hover { opacity:.9; }
</style>