<script>
	import Icon from './Icon.svelte';
</script>

<div class="hdr">
	<div class="hdr-mark">
		<Icon name="kangaroo" size={28} color="var(--accent)" />
	</div>
	<div>
		<h1 class="hdr-title">
			<span class="hdr-title-roo">ROO</span>
			<span class="hdr-title-dot">·</span>
			Baby Cry Analyzer
		</h1>
		<p class="hdr-sub">Understand what your little one needs</p>
	</div>
</div>

<!-- Tech / trust strip -->
<div class="trust-strip">
	<div class="trust-item">
		<span class="trust-dot teal"></span>
		<span>Gemma 4 Multimodal AI</span>
	</div>
	<div class="trust-div"></div>
	<div class="trust-item">
		<span class="trust-dot indigo"></span>
		<span>Mel Spectrogram Analysis</span>
	</div>
	<div class="trust-div"></div>
	<div class="trust-item">
		<span class="trust-dot emerald"></span>
		<span>On-device processing</span>
	</div>
</div>

<style>
	.hdr {
		display:flex; align-items:center; gap:16px;
		padding:6px 0 2px;
	}
	.hdr-mark {
		width:64px; height:64px; border-radius:var(--r-2xl); flex-shrink:0;
		background: linear-gradient(135deg, var(--accent-muted), var(--indigo-bg));
		border:1px solid var(--accent-border);
		display:flex; align-items:center; justify-content:center;
	}
	.hdr-title {
		font-family:'Instrument Serif',serif;
		font-size:1.6rem; font-weight:400; color:var(--text);
		line-height:1.1; display:flex; align-items:center; gap:6px; flex-wrap:wrap;
	}
	.hdr-title-roo {
		color:var(--accent);
	}
	.hdr-title-dot { color:var(--text-3); font-size:1.2rem; }
	.hdr-sub {
		font-size:.8rem; color:var(--text-2); font-weight:600; margin-top:5px;
	}

	/* Tech trust strip */
	.trust-strip {
		display:flex; align-items:center; flex-wrap:wrap; gap:0;
		padding:10px 14px;
		background:var(--surface); border:1px solid var(--border);
		border-radius:var(--r-lg);
	}
	.trust-item {
		display:flex; align-items:center; gap:6px;
		font-size:.65rem; font-weight:700; color:var(--text-3);
		padding:0 10px;
	}
	.trust-item:first-child { padding-left:0; }
	.trust-item:last-child  { padding-right:0; }
	.trust-dot {
		width:6px; height:6px; border-radius:50%; flex-shrink:0;
	}
	.trust-dot.teal    { background:var(--teal); }
	.trust-dot.indigo  { background:var(--indigo); }
	.trust-dot.emerald { background:var(--emerald); }
	.trust-div { width:1px; height:14px; background:var(--border); flex-shrink:0; }
</style>
