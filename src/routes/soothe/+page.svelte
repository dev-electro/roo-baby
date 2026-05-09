<script>
	import Icon from '$components/Icon.svelte';
	import SoothingPlayer from '$components/SoothingPlayer.svelte';
</script>

<svelte:head>
	<title>Soothing Sounds — ROO</title>
</svelte:head>

<div class="page">
	<div class="top">
		<a href="/" class="back"><Icon name="arrow-right" size={14} color="var(--text-soft)" /> Back</a>
		<h1 class="title">Soothing Sounds</h1>
		<p class="sub">Calm your baby with gentle, continuous sounds</p>
	</div>

	<SoothingPlayer />

	<p class="footnote">Place .m4a or .mp3 files in <code>static/audio/</code> for real recordings.<br/>Synthesized fallback plays when files aren't available.</p>
</div>

<style>
	.page{max-width:480px;margin:0 auto;padding:20px;display:flex;flex-direction:column;gap:20px}
	.top{display:flex;flex-direction:column;gap:4px}
	.back{display:inline-flex;align-items:center;gap:4px;font-size:.72rem;font-weight:700;color:var(--text-soft);text-decoration:none;align-self:flex-start;transform:rotate(180deg)}
	.back:hover{color:var(--text)}
	.title{font-family:'Fraunces',serif;font-size:1.8rem;font-weight:700;color:var(--text);margin-top:4px}
	.sub{font-size:.82rem;color:var(--text-soft);font-weight:600}
	.footnote{text-align:center;font-size:.6rem;color:var(--text-dim);opacity:.45;line-height:1.6}
	.footnote code{font-size:.58rem;color:var(--text-soft);background:var(--card-bg);padding:1px 5px;border-radius:3px}
</style>
