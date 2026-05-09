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

<div class="shell">
	<!-- Top bar (SaaS style, clean header) -->
	<header class="topbar glass">
		<div class="topbar-inner">
			<a href="/" class="brand" aria-label="ROO Home">
				<div class="brand-icon"><Icon name="baby" size={16} color="var(--bg)" /></div>
				<span class="brand-name">ROO Baby</span>
			</a>
			
			<div class="topbar-nav">
				<a href="/" class="nav-link" class:active={!isSoothe}>Analyze</a>
				<a href="/soothe" class="nav-link" class:active={isSoothe}>Soothe</a>
			</div>

			<div class="topbar-actions">
				<button class="action-btn" onclick={toggleTheme} aria-label="Toggle theme">
					<Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} color="currentColor" />
				</button>
				<button class="action-btn" onclick={() => appState.showSettings = true} aria-label="Settings">
					<Icon name="settings" size={18} color="currentColor" />
				</button>
			</div>
		</div>
	</header>

	<main class="main">{@render children()}</main>

	<SettingsPanel />

	{#if updateReady}
		<div class="sw-toast animate-up">
			<Icon name="check" size={16} color="var(--primary)" />
			<span>App update available</span>
			<button class="sw-refresh" onclick={refreshApp}>Reload</button>
		</div>
	{/if}
</div>

<style>
	.shell { min-height:100dvh; width:100%; display:flex; flex-direction:column; }

	/* Topbar */
	.topbar {
		position:sticky; top:0; z-index:40;
		padding-top:env(safe-area-inset-top);
	}
	.topbar-inner {
		width:100%; padding:12px 24px;
		display:flex; align-items:center; justify-content:space-between; gap:16px;
	}
	@media(min-width:768px){ .topbar-inner { max-width:960px; margin:0 auto; } }

	/* Brand */
	.brand { display:flex; align-items:center; gap:10px; text-decoration:none; flex-shrink:0; }
	.brand-icon {
		width:28px; height:28px; border-radius:var(--r-xs);
		background:var(--text); 
		display:flex; align-items:center; justify-content:center;
	}
	.brand-name { font-family:'Outfit',sans-serif; font-size:1.1rem; font-weight:700; color:var(--text); letter-spacing:-0.02em; }

	/* Desktop Nav (Center) */
	.topbar-nav { display:none; align-items:center; gap:4px; background:var(--surface); padding:4px; border-radius:var(--r-sm); border:1px solid var(--border); }
	@media(min-width:640px){ .topbar-nav { display:flex; } }
	
	.nav-link {
		padding:6px 16px; border-radius:var(--r-xs);
		font-size:0.85rem; font-weight:600; color:var(--text-soft); text-decoration:none;
		transition:all 0.2s;
	}
	.nav-link:hover { color:var(--text); }
	.nav-link.active { background:var(--surface-2); color:var(--text); box-shadow:var(--shadow-card); }

	/* Mobile Nav (Bottom/Hidden, but keeping simple here) */
	/* We rely on topbar links on mobile or the main page cards. Wait, let's keep the nav visible on mobile but smaller. */
	@media(max-width:639px){
		.topbar-nav { display:flex; position:absolute; bottom:-46px; left:24px; right:24px; justify-content:center; }
		.topbar-inner { padding-bottom: 8px; } /* give a little space */
	}

	/* Actions */
	.topbar-actions { display:flex; gap:8px; flex-shrink:0; }
	.action-btn {
		width:36px; height:36px; border-radius:var(--r-sm);
		display:flex; align-items:center; justify-content:center;
		color:var(--text-soft); border:1px solid transparent;
		transition:all .15s; background:var(--surface);
	}
	.action-btn:hover { color:var(--text); border-color:var(--border); background:var(--surface-2); }

	/* Main content */
	.main { flex:1; width:100%; padding:24px 20px 80px; display:flex; flex-direction:column; gap:24px; }
	@media(min-width:640px)  { .main { max-width:640px; margin:0 auto; padding:40px 24px 80px; } }
	@media(min-width:1024px) { .main { max-width:760px; } }

	/* SW toast */
	.sw-toast {
		position:fixed; bottom:24px; left:50%; transform:translateX(-50%); z-index:200;
		display:flex; align-items:center; gap:12px; padding:12px 16px;
		border-radius:var(--r-md); background:var(--surface); border:1px solid var(--border);
		box-shadow:var(--shadow-elevated); font-size:0.85rem; font-weight:600; color:var(--text);
	}
	.sw-refresh {
		padding:6px 14px; border-radius:var(--r-xs); font-size:0.8rem; font-weight:600;
		color:var(--surface); background:var(--text); cursor:pointer;
	}
	.sw-refresh:hover { opacity:.9; }
</style>