<script>
	import SoothingPlayer from '$components/SoothingPlayer.svelte';
	import Icon from '$components/Icon.svelte';
	import { categories, synths } from '$lib/data/soothingTracks.js';

	const synthCount = synths.length;
	const r2Count = categories.reduce((sum, c) => sum + c.tracks.length, 0);
	const totalCount = synthCount + r2Count;
</script>

<svelte:head>
	<title>ROO — Soothe</title>
	<meta name="description" content="Soothing sounds for babies — white noise, lullabies, ocean waves, heartbeat, binaural beats and more." />
</svelte:head>

<!-- Header -->
<div class="sh">
	<div class="sh-mark">
		<Icon name="music" size={28} color="var(--amber)" />
	</div>
	<div>
		<h1 class="sh-title">
			<span style="color:var(--amber)">Soothe</span> · Baby Sounds
		</h1>
		<p class="sh-sub">{totalCount} soothing sounds ({synthCount} synthesized & {r2Count} streaming files)</p>
	</div>
</div>

<!-- Benefit chips -->
<div class="sh-chips">
	<span class="sh-chip emerald">🌿 White noise</span>
	<span class="sh-chip sky">🌊 Ocean waves</span>
	<span class="sh-chip rose">❤️ Heartbeat</span>
	<span class="sh-chip indigo">🎵 Binaural beats</span>
	<span class="sh-chip amber">⚡ Instant start</span>
</div>

<!-- Player -->
<div class="block">
	<div class="block-head" style="border-color:var(--amber-border)">
		<p class="label">Choose a sound</p>
		<span class="badge" style="color:var(--amber); border-color:var(--amber-border); background:var(--amber-bg)">{totalCount} tracks</span>
	</div>
	<div style="padding:16px">
		<SoothingPlayer />
	</div>
</div>

<!-- How-to tips -->
<div class="tips-block">
	<p class="label" style="margin-bottom:10px">Tips for best results</p>
	<div class="tips">
		<div class="tip emerald">
			<span>🔊</span>
			<p>Set volume to 50–60% — enough to mask background noise without being too loud</p>
		</div>
		<div class="tip sky">
			<span>🎧</span>
			<p>Use headphones for Binaural beats — the stereo effect only works with earphones</p>
		</div>
		<div class="tip rose">
			<span>❤️</span>
			<p>Heartbeat works best for newborns — familiar from the womb</p>
		</div>
		<div class="tip amber">
			<span>🌙</span>
			<p>Play continuously while settling baby to sleep — use the loop toggle</p>
		</div>
	</div>
</div>

<a href="/" class="back-link">
	<Icon name="mic" size={14} color="currentColor" /> ← Back to Analyzer
</a>

<style>
	/* Soothe header */
	.sh {
		display:flex; align-items:center; gap:16px; padding:6px 0 2px;
	}
	.sh-mark {
		width:64px; height:64px; border-radius:var(--r-2xl); flex-shrink:0;
		background:var(--amber-bg); border:1px solid var(--amber-border);
		display:flex; align-items:center; justify-content:center;
	}
	.sh-title {
		font-family:'Quicksand', sans-serif;
		font-size:1.6rem; font-weight:700; color:var(--text); line-height:1.1;
	}
	.sh-sub { font-size:.8rem; color:var(--text-2); font-weight:600; margin-top:5px; }

	.sh-chips { display:flex; flex-wrap:wrap; gap:5px; }
	.sh-chip {
		padding:4px 10px; border-radius:var(--r-pill);
		font-size:.62rem; font-weight:800; border:1px solid; white-space:nowrap;
	}
	.sh-chip.emerald { color:var(--emerald); background:var(--emerald-bg); border-color:var(--emerald-border); }
	.sh-chip.sky     { color:var(--sky);     background:var(--sky-bg);     border-color:var(--sky-border); }
	.sh-chip.rose    { color:var(--rose);    background:var(--rose-bg);    border-color:var(--rose-border); }
	.sh-chip.indigo  { color:var(--indigo);  background:var(--indigo-bg);  border-color:var(--indigo-border); }
	.sh-chip.amber   { color:var(--amber);   background:var(--amber-bg);   border-color:var(--amber-border); }

	/* Block */
	.block {
		background:var(--surface); border:1px solid var(--border);
		border-radius:var(--r-xl); overflow:hidden;
		border-left:3px solid var(--amber);
	}
	.block-head {
		display:flex; align-items:center; justify-content:space-between;
		padding:12px 16px; border-bottom:1px solid var(--border);
	}

	/* Tips */
	.tips-block {
		background:var(--surface); border:1px solid var(--border);
		border-radius:var(--r-xl); padding:16px;
	}
	.tips { display:flex; flex-direction:column; gap:8px; }
	.tip {
		display:flex; align-items:flex-start; gap:10px;
		padding:10px 12px; border-radius:var(--r-md);
		font-size:.8rem; line-height:1.6; border:1px solid;
	}
	.tip span { font-size:1rem; flex-shrink:0; }
	.tip p    { color:var(--text-2); }
	.tip.emerald { background:var(--emerald-bg); border-color:var(--emerald-border); }
	.tip.sky     { background:var(--sky-bg);     border-color:var(--sky-border); }
	.tip.rose    { background:var(--rose-bg);    border-color:var(--rose-border); }
	.tip.amber   { background:var(--amber-bg);   border-color:var(--amber-border); }

	.back-link {
		display:inline-flex; align-items:center; gap:6px;
		padding:10px 16px; border-radius:var(--r-md);
		font-size:.78rem; font-weight:700; color:var(--text-2);
		background:var(--surface-2); border:1px solid var(--border);
		text-decoration:none; transition:all .12s; align-self:flex-start;
	}
	.back-link:hover { color:var(--text); border-color:var(--accent-border); }
</style>
