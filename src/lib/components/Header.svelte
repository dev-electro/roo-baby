<script>import Icon from './Icon.svelte';</script>

<header class="h">
	<div class="h-icon"><Icon name="kangaroo" size={36} color="var(--pink)" /></div>
	<h1 class="h-title">ROO</h1>
	<p class="h-sub">Multimodal baby cry analysis — powered by Gemma 4</p>
	<div class="h-badges">
		<div class="h-badge"><Icon name="sparkles" size={11} color="var(--teal)" /> VLM + Spectrogram</div>
		<div class="h-badge h-badge-gold"><Icon name="bolt" size={11} color="var(--gold)" /> Sub‑second</div>
	</div>
</header>

<style>
	.h{text-align:center;padding:8px 0 0;display:flex;flex-direction:column;align-items:center;gap:6px}
	.h-icon{width:52px;height:52px;border-radius:var(--radius);background:var(--pink-soft);border:1px solid rgba(255,107,122,.2);display:flex;align-items:center;justify-content:center;animation:float 3s ease-in-out infinite;margin-bottom:2px}
	.h-title{font-family:'Fraunces',serif;font-size:2.2rem;font-weight:700;line-height:1;background:linear-gradient(135deg,var(--pink),var(--gold));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
	.h-sub{font-size:.85rem;color:var(--text-soft);font-weight:600}
	.h-badges{display:flex;gap:6px;flex-wrap:wrap;justify-content:center}
	.h-badge{display:inline-flex;align-items:center;gap:3px;background:var(--teal-soft);border:1px solid var(--teal);color:var(--teal);font-size:.6rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;padding:4px 8px;border-radius:100px}
	.h-badge-gold{background:var(--gold-soft);border-color:var(--gold);color:var(--gold)}
</style>
