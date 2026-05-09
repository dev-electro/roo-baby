<script>import Icon from './Icon.svelte';</script>

<header class="h">
	<div class="h-blob" aria-hidden="true"></div>
	<div class="h-icon">
		<Icon name="kangaroo" size={32} color="var(--lavender)" />
	</div>
	<h1 class="h-title">ROO</h1>
	<p class="h-sub">Multimodal baby cry analysis — powered by Gemma 4</p>
	<div class="h-badges">
		<div class="h-badge h-badge-lav">
			<span class="h-dot"></span> VLM + Spectrogram
		</div>
		<div class="h-badge h-badge-mint">
			<span class="h-dot h-dot-mint"></span> Sub‑second
		</div>
	</div>
</header>

<style>
	.h {
		text-align:center; padding:12px 0 4px;
		display:flex; flex-direction:column; align-items:center; gap:8px;
		position:relative; overflow:visible;
	}

	/* Animated blob behind icon */
	.h-blob {
		position:absolute; top:-20px; left:50%; transform:translateX(-50%);
		width:160px; height:160px; border-radius:50%;
		background:radial-gradient(circle, rgba(167,139,250,.18) 0%, transparent 70%);
		animation:breathe 4s ease-in-out infinite;
		pointer-events:none;
	}

	.h-icon {
		position:relative; z-index:1;
		width:68px; height:68px; border-radius:var(--r-lg);
		background:var(--lav-soft); border:1px solid rgba(167,139,250,.25);
		display:flex; align-items:center; justify-content:center;
		animation:float 3.5s ease-in-out infinite;
		box-shadow:0 8px 32px var(--lav-glow);
		margin-bottom:2px;
	}

	.h-title {
		font-family:'Fraunces',serif;
		font-size:3rem; font-weight:700; line-height:.9;
		letter-spacing:-.03em;
		background:linear-gradient(135deg, var(--lavender) 20%, var(--indigo));
		-webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;
		position:relative; z-index:1;
	}

	.h-sub {
		font-size:.88rem; color:var(--text-soft); font-weight:600; max-width:280px; line-height:1.4;
	}

	.h-badges { display:flex; gap:8px; flex-wrap:wrap; justify-content:center; }

	.h-badge {
		display:inline-flex; align-items:center; gap:6px;
		padding:5px 12px; border-radius:var(--r-pill);
		font-size:.62rem; font-weight:800; letter-spacing:.06em; text-transform:uppercase;
	}
	.h-badge-lav  { background:var(--lav-soft); border:1px solid rgba(167,139,250,.25); color:var(--lavender); }
	.h-badge-mint { background:var(--mint-soft); border:1px solid rgba(110,231,183,.25); color:var(--mint); }

	.h-dot {
		width:6px; height:6px; border-radius:50%;
		background:var(--lavender);
		box-shadow:0 0 6px var(--lavender);
		animation:pulse-glow 2s ease-in-out infinite;
		flex-shrink:0;
	}
	.h-dot-mint { background:var(--mint); box-shadow:0 0 6px var(--mint); }
</style>
