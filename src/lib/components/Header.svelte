<script>
	import Icon from './Icon.svelte';
</script>

<div class="pg-head">
	<div class="pg-icon">
		<Icon name="search" size={24} color="var(--primary)" />
	</div>
	<div class="pg-titles">
		<h1 class="pg-title">Analyze Cry</h1>
		<p class="pg-desc">Upload audio or video to understand why your baby is crying.</p>
	</div>
</div>

<style>
	.pg-head {
		display:flex; flex-direction:column; gap:16px;
		padding-bottom:16px; border-bottom:1px solid var(--border);
	}
	@media(min-width:640px){ .pg-head { flex-direction:row; align-items:center; } }

	.pg-icon {
		width:48px; height:48px; border-radius:var(--r-md);
		background:var(--surface); border:1px solid var(--border);
		display:flex; align-items:center; justify-content:center; flex-shrink:0;
		box-shadow:var(--shadow-card);
	}
	
	.pg-titles { display:flex; flex-direction:column; gap:4px; }
	.pg-title { font-size:1.4rem; font-weight:700; color:var(--text); letter-spacing:-0.01em; }
	.pg-desc { font-size:0.9rem; color:var(--text-soft); max-width:480px; line-height:1.4; }
</style>
