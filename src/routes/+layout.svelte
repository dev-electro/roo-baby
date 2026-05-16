<script>
	import '../app.css';
	import { page } from '$app/stores';
	import { appState } from '$state/appState.svelte.js';
	import Icon from '$components/Icon.svelte';
	import SettingsPanel from '$components/SettingsPanel.svelte';

	let { children } = $props();

	let theme = $state('light');

	// Read saved theme ASAP — before first render where possible
	$effect.root(() => {
		try {
			const saved = localStorage.getItem('roo-theme') || 'light';
			theme = saved;
			document.documentElement.setAttribute('data-theme', saved);
		} catch {}
	});

	function toggleTheme() {
		theme = theme === 'dark' ? 'light' : 'dark';
		document.documentElement.setAttribute('data-theme', theme);
		try { localStorage.setItem('roo-theme', theme); } catch {}
	}

	// Keep in sync if changed externally
	$effect(() => { document.documentElement.setAttribute('data-theme', theme); });

	const isSoothe = $derived($page.url.pathname === '/soothe');
</script>

<div class="bg-pattern" aria-hidden="true"></div>
<div class="bg-vignette" aria-hidden="true"></div>

<div class="shell">
	<header class="topbar">
		<div class="topbar-inner">
			<a href="/" class="brand">
				<div class="brand-mark">
					<Icon name="kangaroo" size={16} color="#fff" />
				</div>
				<span class="brand-name">ROO</span>
			</a>
			<nav class="topbar-nav">
				{#if !isSoothe}
					<a href="/soothe" class="tb-pill">
						<Icon name="music" size={15} color="currentColor" />
						Soothe
					</a>
				{:else}
					<a href="/" class="tb-pill">
						<Icon name="mic" size={15} color="currentColor" />
						Analyze
					</a>
				{/if}
				<button class="tb-icon" onclick={toggleTheme} aria-label="Toggle theme">
					<Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} color="currentColor" />
				</button>
				<button class="tb-icon" onclick={() => appState.showSettings = true} aria-label="Settings">
					<Icon name="settings" size={18} color="currentColor" />
				</button>
			</nav>
		</div>
	</header>

	<main class="main">{@render children()}</main>
	<SettingsPanel />
</div>

<style>
	.shell { display:flex; flex-direction:column; min-height:100dvh; }

	/* ── Topbar ── */
	.topbar {
		position:sticky; top:0; z-index:50;
		background:var(--topbar-bg);
		backdrop-filter:blur(24px) saturate(140%);
		-webkit-backdrop-filter:blur(24px) saturate(140%);
		border-bottom:1px solid var(--border);
		padding-top:env(safe-area-inset-top);
	}

	.topbar-inner {
		max-width:720px; margin:0 auto;
		padding:0 18px; height:58px; /* taller for one-hand */
		display:flex; align-items:center; justify-content:space-between;
	}

	/* Brand */
	.brand { display:flex; align-items:center; gap:10px; text-decoration:none; }
	.brand-mark {
		width:34px; height:34px; border-radius:var(--r-md);
		background:var(--accent);
		display:flex; align-items:center; justify-content:center; flex-shrink:0;
	}
	.brand-name {
		font-family:'Quicksand', sans-serif;
		font-size:1.2rem; font-weight:700;
		color:var(--text); letter-spacing:.04em;
	}

	/* Nav */
	.topbar-nav { display:flex; align-items:center; gap:6px; }

	.tb-pill {
		display:flex; align-items:center; gap:6px;
		padding:8px 16px; height:40px; border-radius:var(--r-pill);
		font-size:.78rem; font-weight:800; color:var(--text-2);
		border:1px solid var(--border); background:var(--surface-2);
		transition:all .15s; text-decoration:none;
	}
	.tb-pill:hover { border-color:var(--accent-border); color:var(--text); }

	.tb-icon {
		width:40px; height:40px; border-radius:var(--r-md);
		display:flex; align-items:center; justify-content:center;
		color:var(--text-2); transition:background .12s, color .12s;
	}
	.tb-icon:hover { background:var(--surface-2); color:var(--text); }

	/* ── Main ── */
	.main {
		flex:1; width:100%; max-width:720px; margin:0 auto;
		padding:18px 16px 96px; /* extra bottom for thumb reach */
		display:flex; flex-direction:column; gap:14px;
	}
	@media(min-width:560px) { .main { padding:24px 24px 96px; gap:16px; } }
</style>
