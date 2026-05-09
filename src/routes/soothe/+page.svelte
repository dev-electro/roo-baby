<script>
	import SoothingPlayer from '$components/SoothingPlayer.svelte';
	import Icon from '$components/Icon.svelte';
</script>

<svelte:head>
	<title>ROO — Soothe</title>
</svelte:head>

<div class="pg">
	<div class="hero animate-in">
		<div class="h-icon"><Icon name="music" size={32} color="var(--primary)" /></div>
		<h1 class="h-title">Soothing Sounds</h1>
		<p class="h-desc">Science-backed audio to calm your baby.</p>
	</div>

	<div class="content animate-up" style="animation-delay: 0.1s">
		<SoothingPlayer />
	</div>

	<div class="tips-box animate-up" style="animation-delay: 0.2s">
		<h3 class="t-head"><Icon name="info" size={16} color="currentColor"/> Quick Tips</h3>
		<ul class="t-list">
			<li><strong>White Noise</strong> masks household sounds (vacuum, talking).</li>
			<li><strong>Heartbeat</strong> mimics the womb, perfect for newborns.</li>
			<li><strong>Pink Noise</strong> is deeper and less harsh on sensitive ears.</li>
			<li>Ensure phone is at least 3 feet away from baby's crib.</li>
		</ul>
	</div>
</div>

<style>
	.pg { display:flex; flex-direction:column; gap:32px; width:100%; }

	.hero { display:flex; flex-direction:column; align-items:center; text-align:center; gap:12px; padding:24px 0 12px; }
	.h-icon {
		width:64px; height:64px; border-radius:var(--r-md); background:var(--surface); border:1px solid var(--border);
		display:flex; align-items:center; justify-content:center; box-shadow:var(--shadow-card);
	}
	.h-title { font-size:1.8rem; font-weight:800; color:var(--text); margin:0; letter-spacing:-0.02em; }
	.h-desc { font-size:1rem; color:var(--text-soft); max-width:400px; line-height:1.4; margin:0 auto; }

	.content { display:flex; flex-direction:column; width:100%; }

	.tips-box {
		background:var(--primary-soft); border:1px solid var(--border);
		border-radius:var(--r-md); padding:20px; color:var(--primary);
	}
	.t-head { font-size:0.95rem; font-weight:700; display:flex; align-items:center; gap:8px; margin-bottom:12px; }
	.t-list { list-style:none; display:flex; flex-direction:column; gap:10px; }
	.t-list li { font-size:0.85rem; font-weight:500; color:var(--text-soft); line-height:1.4; padding-left:16px; position:relative; }
	.t-list li::before { content:'•'; position:absolute; left:0; color:var(--primary); font-weight:bold; }
	.t-list strong { color:var(--text); }
</style>
