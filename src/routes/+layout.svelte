<script>
	import '../app.css';
	import { appState } from '$state/appState.svelte.js';
	import Icon from '$components/Icon.svelte';
	import SettingsPanel from '$components/SettingsPanel.svelte';

	let { children } = $props();

	let theme = $state(typeof localStorage !== 'undefined' ? localStorage.getItem('roo-theme') || 'dark' : 'dark');

	function toggleTheme() {
		theme = theme === 'dark' ? 'light' : 'dark';
		localStorage.setItem('roo-theme', theme);
	}

	$effect(() => {
		document.documentElement.setAttribute('data-theme', theme);
	});
</script>

<div class="app-shell">
	<div class="bg-canvas" aria-hidden="true">
		<div class="orb orb-1"></div>
		<div class="orb orb-2"></div>
		<div class="orb orb-3"></div>
		<div class="orb orb-4"></div>
	</div>

	<!-- Top navigation bar -->
	<div class="topbar">
		<div class="topbar-inner">
			<div class="topbar-brand">
				<span class="brand-emoji">🦘</span>
				<span class="brand-name">ROO</span>
			</div>
			<div class="topbar-actions">
				<button
					class="topbar-btn"
					onclick={toggleTheme}
					type="button"
					aria-label="Toggle theme"
				>
					<Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
				</button>
				<button
					class="topbar-btn"
					onclick={() => appState.showSettings = true}
					type="button"
					aria-label="Info"
				>
					<Icon name="info-circle" size={18} />
				</button>
			</div>
		</div>
	</div>

	<main class="content">
		{@render children()}
	</main>

	<SettingsPanel />
</div>

<style>
	.app-shell {
		position: relative;
		min-height: 100dvh;
		overflow-x: hidden;
	}

	.bg-canvas {
		position: fixed;
		inset: 0;
		pointer-events: none;
		z-index: 0;
		overflow: hidden;
	}

	.orb {
		position: absolute;
		border-radius: 50%;
		filter: blur(100px);
	}

	.orb-1 {
		width: 480px; height: 480px;
		background: var(--primary);
		opacity: 0.1;
		top: -200px; left: -160px;
		animation: drift 18s ease-in-out infinite;
	}

	.orb-2 {
		width: 400px; height: 400px;
		background: var(--secondary);
		opacity: 0.08;
		bottom: -120px; right: -100px;
		animation: drift 22s ease-in-out infinite reverse;
	}

	.orb-3 {
		width: 320px; height: 320px;
		background: var(--accent);
		opacity: 0.06;
		top: 45%; left: 55%;
		animation: drift 20s ease-in-out infinite;
		animation-delay: -6s;
	}

	.orb-4 {
		width: 260px; height: 260px;
		background: var(--lavender);
		opacity: 0.05;
		top: 20%; right: 10%;
		animation: drift 25s ease-in-out infinite;
		animation-delay: -12s;
	}

	/* ── Topbar ── */
	.topbar {
		position: sticky;
		top: 0;
		z-index: 40;
		background: var(--bg);
		border-bottom: 1px solid var(--border);
		backdrop-filter: blur(20px);
		-webkit-backdrop-filter: blur(20px);
		padding: env(safe-area-inset-top, 0) 0 0 0;
	}

	.topbar-inner {
		max-width: 480px;
		margin: 0 auto;
		padding: 10px 20px;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.topbar-brand {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.brand-emoji {
		font-size: 1.2rem;
		line-height: 1;
	}

	.brand-name {
		font-family: 'Fraunces', serif;
		font-size: 1.2rem;
		font-weight: 700;
		background: linear-gradient(135deg, var(--primary), var(--secondary));
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.topbar-actions {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.topbar-btn {
		width: 38px;
		height: 38px;
		border-radius: 50%;
		background: transparent;
		color: var(--text-muted);
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all var(--transition-fast);
	}

	.topbar-btn:hover {
		background: var(--surface-hover);
		color: var(--text);
	}

	/* ── Content ── */
	.content {
		position: relative;
		z-index: 1;
		max-width: 480px;
		margin: 0 auto;
		padding: 20px 20px 48px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	@media (max-width: 380px) {
		.content {
			padding: 16px 16px 40px;
		}
		.topbar-inner {
			padding: 8px 16px;
		}
	}
</style>