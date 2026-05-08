<script>
	import Icon from './Icon.svelte';
</script>

<header class="header">
	<div class="logo-row">
		<div class="logo-icon">
			<span class="logo-emoji">🦘</span>
		</div>
		<h1 class="logo">ROO</h1>
	</div>
	<p class="tagline">Understand your baby's cry</p>
	<div class="badge">
		<span class="badge-dot"></span>
		<span>AI · Multimodal Analysis</span>
	</div>
</header>

<style>
	.header {
		text-align: center;
		padding: 16px 0 4px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
	}

	.logo-row {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.logo-icon {
		width: 44px;
		height: 44px;
		border-radius: var(--radius-md);
		background: linear-gradient(135deg, rgba(255,140,107,0.15), rgba(255,184,108,0.1));
		border: 1px solid rgba(255,140,107,0.2);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.logo-emoji {
		font-size: 1.5rem;
		line-height: 1;
	}

	.logo {
		font-family: 'Fraunces', serif;
		font-size: 2.6rem;
		font-weight: 700;
		line-height: 1;
		background: linear-gradient(135deg, var(--coral), var(--amber));
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		filter: drop-shadow(0 0 20px rgba(255,140,107,0.3));
	}

	.tagline {
		font-size: 0.88rem;
		color: var(--text-muted);
		font-weight: 600;
		letter-spacing: 0.02em;
	}

	.badge {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		background: rgba(110,231,183,0.06);
		border: 1px solid rgba(110,231,183,0.15);
		color: var(--mint);
		font-size: 0.65rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		padding: 4px 12px;
		border-radius: var(--radius-full);
	}

	.badge-dot {
		width: 6px;
		height: 6px;
		background: var(--mint);
		border-radius: 50%;
		animation: gentle-pulse 2.5s ease-in-out infinite;
	}
</style>