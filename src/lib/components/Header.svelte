<script>
</script>

<header class="header">
	<h1 class="logo gradient-text">ROO</h1>
	<p class="tagline">Understand your baby's cry</p>
	<div class="badge">
		<span class="badge-dot"></span>
		<span>AI · Multimodal Analysis</span>
	</div>
</header>

<style>
	.header {
		text-align: center;
		padding: 12px 0 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 6px;
	}

	.logo {
		font-family: 'Fraunces', serif;
		font-size: 2.4rem;
		font-weight: 700;
		line-height: 1;
		background: linear-gradient(135deg, var(--primary), var(--secondary));
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		filter: drop-shadow(0 0 16px rgba(255,120,90,0.25));
	}

	.tagline {
		font-size: 0.88rem;
		color: var(--text-muted);
		font-weight: 600;
	}

	.badge {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		background: var(--accent-soft);
		border: 1px solid rgba(94,234,212,0.15);
		color: var(--accent);
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
		background: var(--accent);
		border-radius: 50%;
		animation: gentle-pulse 2.5s ease-in-out infinite;
	}

	@media (max-width: 380px) {
		.logo { font-size: 2rem; }
	}
</style>