<script>
	import Icon from './Icon.svelte';
</script>

<div class="hdr">
	<div class="hdr-mark">
		<Icon name="kangaroo" size={28} color="var(--accent)" />
	</div>
	<div>
		<h1 class="hdr-title">Baby Cry Analyzer</h1>
		<p class="hdr-sub">AI understands what your baby needs</p>
	</div>
</div>

<style>
	.hdr {
		display:flex; align-items:center; gap:16px;
		padding:8px 0 4px;
	}
	.hdr-mark {
		width:60px; height:60px; border-radius:var(--r-xl);
		background:var(--accent-muted); border:1px solid var(--accent-border);
		display:flex; align-items:center; justify-content:center; flex-shrink:0;
	}
	.hdr-title {
		font-family:'Instrument Serif',serif;
		font-size:1.65rem; font-weight:400; color:var(--text);
		line-height:1.1;
	}
	.hdr-sub {
		font-size:.82rem; color:var(--text-2);
		font-weight:600; margin-top:5px;
	}
</style>
