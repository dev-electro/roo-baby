<script>import Icon from './Icon.svelte';</script>

<header class="h">
	<div class="h-icon"><Icon name="kangaroo" size={36} color="var(--pink)" /></div>
	<h1 class="h-title">ROO</h1>
	<p class="h-sub">Understand why your baby is crying</p>
	<div class="h-badge"><Icon name="sparkles" size={12} color="var(--teal)" /> AI-Powered Analysis</div>
</header>

<style>
	.h{text-align:center;padding:8px 0 0;display:flex;flex-direction:column;align-items:center;gap:6px}
	.h-icon{width:52px;height:52px;border-radius:var(--radius);background:var(--pink-soft);border:1px solid rgba(255,107,122,.2);display:flex;align-items:center;justify-content:center;animation:float 3s ease-in-out infinite;margin-bottom:2px}
	.h-title{font-family:'Fraunces',serif;font-size:2.2rem;font-weight:700;line-height:1;background:linear-gradient(135deg,var(--pink),var(--gold));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
	.h-sub{font-size:.85rem;color:var(--text-soft);font-weight:600}
	.h-badge{display:inline-flex;align-items:center;gap:4px;background:var(--teal-soft);border:1px solid var(--teal);color:var(--teal);font-size:.62rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;padding:4px 10px;border-radius:100px}
</style>