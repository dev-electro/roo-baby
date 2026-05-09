<script>
	import Icon from '$components/Icon.svelte';
	import SoothingPlayer from '$components/SoothingPlayer.svelte';
</script>

<svelte:head>
	<title>Soothing Sounds — ROO</title>
</svelte:head>

<div class="page">
	<a href="/" class="back"><Icon name="arrow-right" size={14} color="var(--text-soft)" /> Analyzer</a>
	<h1 class="title">Soothing Sounds</h1>
	<SoothingPlayer />
</div>

<style>
	.page{padding:14px 16px 40px;display:flex;flex-direction:column;gap:12px}
	@media(min-width:640px){.page{padding:20px 24px 48px}}
	.back{display:inline-flex;align-items:center;gap:4px;font-size:.68rem;font-weight:700;color:var(--text-soft);text-decoration:none;align-self:flex-start;transform:rotate(180deg)}
	.back:hover{color:var(--text)}
	.title{font-family:'Fraunces',serif;font-size:1.4rem;font-weight:700;color:var(--text);margin-top:2px}
</style>
