<script>
	import Icon from './Icon.svelte';
</script>

<header class="header">
	<div class="logo-wrap">
		<Icon name="bottle" size={36} color="url(#coral-gradient)" />
		<h1 class="logo">
			<span class="gradient-text">ROO</span>
		</h1>
	</div>
	<p class="tagline">Babies speak. Now we listen.</p>
	<div class="badge">
		<span class="badge-dot"></span>
		<span>Gemma 4 E4B · Multimodal AI</span>
	</div>
</header>

<style>
	.header {
		text-align: center;
		padding: 20px 0 8px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
	}

	.logo-wrap {
		display: flex;
		align-items: center;
		gap: 10px;
	}

	.logo {
		font-family: 'Fraunces', serif;
		font-size: 2.8rem;
		font-weight: 700;
		line-height: 1;
		filter: drop-shadow(0 0 24px rgba(255,123,92,0.35));
		margin: 0;
	}

	.tagline {
		font-size: 0.85rem;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--text-muted);
		font-weight: 600;
		margin: 0;
	}

	.badge {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		background: rgba(82,217,193,0.08);
		border: 1px solid rgba(82,217,193,0.18);
		color: var(--mint);
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		padding: 5px 12px;
		border-radius: var(--radius-full);
		margin-top: 2px;
	}

	.badge-dot {
		width: 7px;
		height: 7px;
		background: var(--mint);
		border-radius: 50%;
		animation: pulse-glow 2s ease-in-out infinite;
	}

	@media (max-width: 380px) {
		.logo {
			font-size: 2.4rem;
		}
	}
</style>
