<script>
	import SoothingPlayer from '$components/SoothingPlayer.svelte';
	import Icon from '$components/Icon.svelte';
</script>

<svelte:head>
	<title>Soothe — ROO Baby</title>
	<meta name="description" content="Soothing sounds and synthesized audio to calm your baby. White noise, lullabies, womb sounds, and more." />
</svelte:head>

<div class="soothe">
	<!-- Hero -->
	<div class="hero">
		<div class="hero-blob" aria-hidden="true"></div>
		<div class="hero-icon">
			<Icon name="music" size={28} color="var(--lavender)" />
		</div>
		<h1 class="hero-title">Soothe</h1>
		<p class="hero-sub">Synthesized and curated sounds for your little one</p>
		<div class="hero-badges">
			<span class="hbadge hbadge-lav">12 synths</span>
			<span class="hbadge hbadge-mint">Real-time audio</span>
			<span class="hbadge hbadge-amber">No streaming needed</span>
		</div>
	</div>

	<!-- Tips row -->
	<div class="tips">
		<div class="tip">
			<Icon name="volume" size={14} color="var(--lavender)" />
			<span>Keep volume at <strong>60–70%</strong> for newborns</span>
		</div>
		<div class="tip">
			<Icon name="moon" size={14} color="var(--indigo)" />
			<span>Brown noise great for bedtime</span>
		</div>
		<div class="tip">
			<Icon name="heart" size={14} color="var(--blush)" />
			<span>Heartbeat perfect for ages 0–3mo</span>
		</div>
	</div>

	<SoothingPlayer />

	<footer class="s-footer">
		<p>All sounds generated in real-time in your browser — no download or streaming.</p>
	</footer>
</div>

<style>
	.soothe { display:flex; flex-direction:column; gap:20px; }

	/* Hero */
	.hero {
		display:flex; flex-direction:column; align-items:center; gap:8px;
		text-align:center; position:relative; padding:8px 0 4px;
	}
	.hero-blob {
		position:absolute; top:-40px; left:50%; transform:translateX(-50%);
		width:240px; height:180px;
		background:radial-gradient(circle, rgba(110,231,183,.2) 0%, transparent 70%);
		animation:breathe 4s ease-in-out infinite; pointer-events:none;
	}
	.hero-icon {
		width:60px; height:60px; border-radius:var(--r-lg);
		background:var(--mint-soft); border:1px solid rgba(110,231,183,.25);
		display:flex; align-items:center; justify-content:center;
		animation:float 3.5s ease-in-out infinite;
		box-shadow:0 8px 28px var(--mint-glow);
		position:relative; z-index:1;
	}
	.hero-title {
		font-family:'Fraunces',serif; font-size:2.4rem; font-weight:700;
		background:linear-gradient(135deg, var(--mint), var(--lavender));
		-webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
	}
	.hero-sub { font-size:.88rem; color:var(--text-soft); font-weight:600; }
	.hero-badges { display:flex; gap:6px; flex-wrap:wrap; justify-content:center; margin-top:2px; }
	.hbadge { padding:4px 12px; border-radius:var(--r-pill); font-size:.6rem; font-weight:800; letter-spacing:.06em; text-transform:uppercase; }
	.hbadge-lav  { background:var(--lav-soft);  border:1px solid rgba(167,139,250,.25); color:var(--lavender); }
	.hbadge-mint { background:var(--mint-soft);  border:1px solid rgba(110,231,183,.25); color:var(--mint); }
	.hbadge-amber{ background:var(--amber-soft); border:1px solid rgba(252,211,77,.25);  color:var(--amber); }

	/* Tips */
	.tips { display:flex; flex-direction:column; gap:6px; padding:10px 14px; background:var(--surface); border:1px solid var(--border); border-radius:var(--r-md); }
	.tip  { display:flex; align-items:center; gap:8px; font-size:.74rem; color:var(--text-soft); }
	.tip strong { color:var(--text); font-weight:700; }

	/* Footer */
	.s-footer { text-align:center; }
	.s-footer p { font-size:.62rem; color:var(--text-dim); line-height:1.6; }
</style>
