<script>
	import '../app.css';
	import { appState } from '$state/appState.svelte.js';
	import Icon from '$components/Icon.svelte';
	import SettingsPanel from '$components/SettingsPanel.svelte';
</script>

<div class="app-shell">
	<!-- Animated background orbs -->
	<div class="bg-canvas" aria-hidden="true">
		<div class="orb orb-1"></div>
		<div class="orb orb-2"></div>
		<div class="orb orb-3"></div>
	</div>

	<!-- Main content -->
	<main class="content">
		<slot />
	</main>

	<!-- Info trigger -->
	<button
		class="settings-trigger"
		onclick={() => appState.showSettings = true}
		type="button"
		aria-label="About ROO"
	>
		<Icon name="info-circle" size={20} />
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
		filter: blur(80px);
		opacity: 0.15;
		animation: drift 14s ease-in-out infinite alternate;
	}

	.orb-1 {
		width: 500px;
		height: 500px;
		background: var(--coral);
		top: -180px;
		left: -120px;
		animation-delay: 0s;
	}

	.orb-2 {
		width: 420px;
		height: 420px;
		background: var(--amber);
		bottom: -120px;
		right: -100px;
		animation-delay: -5s;
	}

	.orb-3 {
		width: 350px;
		height: 350px;
		background: var(--mint);
		top: 50%;
		left: 60%;
		transform: translate(-50%, -50%);
		animation-delay: -10s;
		opacity: 0.08;
	}

	.content {
		position: relative;
		z-index: 1;
		max-width: 520px;
		margin: 0 auto;
		padding: 20px 20px 48px;
		display: flex;
		flex-direction: column;
		gap: 20px;
		min-height: 100dvh;
	}

	.settings-trigger {
		position: fixed;
		bottom: 20px;
		right: 20px;
		width: 48px;
		height: 48px;
		border-radius: 50%;
		background: var(--surface);
		border: 1px solid var(--border);
		color: var(--text-muted);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 50;
		transition: all var(--transition-fast);
		box-shadow: var(--shadow-md);
	}

	.settings-trigger:hover {
		background: var(--surface-hover);
		color: var(--text);
		transform: rotate(30deg);
	}

	@media (max-width: 380px) {
		.content {
			padding: 16px 16px 40px;
			gap: 16px;
		}
	}
</style>
