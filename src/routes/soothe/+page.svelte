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
		<p class="sub">Library tracks (R2) · Synth generator (always available)</p>
	</div>

	<SoothingPlayer />

	<p class="note">
		<strong>Synth tab</strong> generates sounds in real-time via Web Audio API — no files needed.<br/>
		<strong>Library tab</strong> plays real recordings from R2 when configured.
	</p>
</div>

<style>
	.page{max-width:480px;margin:0 auto;padding:20px;display:flex;flex-direction:column;gap:18px}
	.top{display:flex;flex-direction:column;gap:4px}
	.back{display:inline-flex;align-items:center;gap:4px;font-size:.72rem;font-weight:700;color:var(--text-soft);text-decoration:none;align-self:flex-start;transform:rotate(180deg)}
	.back:hover{color:var(--text)}
	.title{font-family:'Fraunces',serif;font-size:1.8rem;font-weight:700;color:var(--text);margin-top:4px}
	.sub{font-size:.78rem;color:var(--text-soft);font-weight:600}
	.note{text-align:center;font-size:.6rem;color:var(--text-dim);opacity:.5;line-height:1.7}
</style>
