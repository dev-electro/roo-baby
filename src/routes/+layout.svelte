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

	<main class="content">
		{@render children()}
	</main>

	<button
		class="settings-trigger"
		onclick={() => appState.showSettings = true}
		type="button"
		aria-label="About ROO"
	>
		<Icon name="info-circle" size={18} />
	</button>

	<button
		class="theme-toggle"
		onclick={toggleTheme}
		type="button"
		aria-label="Toggle theme"
	>
		<Icon name={theme === 'dark' ? 'moon' : 'bolt'} size={16} />
	</button>

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
		width: 480px;
		height: 480px;
		background: var(--coral);
		opacity: 0.1;
		top: -200px;
		left: -160px;
		animation: drift 18s ease-in-out infinite;
	}

	.orb-2 {
		width: 400px;
		height: 400px;
		background: var(--amber);
		opacity: 0.08;
		bottom: -120px;
		right: -100px;
		animation: drift 22s ease-in-out infinite reverse;
	}

	.orb-3 {
		width: 320px;
		height: 320px;
		background: var(--mint);
		opacity: 0.06;
		top: 45%;
		left: 55%;
		animation: drift 20s ease-in-out infinite;
		animation-delay: -6s;
	}

	.orb-4 {
		width: 260px;
		height: 260px;
		background: var(--lavender);
		opacity: 0.05;
		top: 20%;
		right: 10%;
		animation: drift 25s ease-in-out infinite;
		animation-delay: -12s;
	}

	.content {
		position: relative;
		z-index: 1;
		max-width: 480px;
		margin: 0 auto;
		padding: 24px 20px 100px;
		display: flex;
		flex-direction: column;
		gap: 20px;
		min-height: 100dvh;
	}

	.settings-trigger {
		position: fixed;
		bottom: 24px;
		right: 24px;
		width: 44px;
		height: 44px;
		border-radius: 50%;
		background: var(--surface);
		backdrop-filter: blur(16px);
		border: 1px solid var(--border);
		color: var(--text-muted);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 50;
		transition: all var(--transition-fast);
		box-shadow: var(--shadow-sm);
	}

	.settings-trigger:hover {
		background: var(--surface-hover);
		color: var(--text);
		transform: rotate(15deg) scale(1.05);
	}

	.theme-toggle {
		position: fixed;
		bottom: 24px;
		right: 80px;
		width: 44px;
		height: 44px;
		border-radius: 50%;
		background: var(--surface);
		backdrop-filter: blur(16px);
		border: 1px solid var(--border);
		color: var(--text-muted);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 50;
		transition: all var(--transition-fast);
		box-shadow: var(--shadow-sm);
	}

	.theme-toggle:hover {
		background: var(--surface-hover);
		color: var(--text);
		transform: scale(1.08);
	}

	@media (max-width: 380px) {
		.content {
			padding: 16px 16px 90px;
			gap: 16px;
		}
	}
</style>