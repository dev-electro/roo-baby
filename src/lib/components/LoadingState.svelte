<script>
	import { appState } from '$state/appState.svelte.js';
	import Icon from './Icon.svelte';

	let words = $state(0); // cycling index driven by effect below
	const WORDS = [
		'Decoding your baby\'s cry…',
		'Analyzing Mel spectrogram patterns…',
		'Cross-referencing with Gemma 4 VLM…',
		'Identifying cry characteristics…',
		'Almost ready…',
	];
	let wordIdx = $state(0);
	let id;

	$effect(() => {
		if (appState.isAnalyzing) {
			wordIdx = 0;
			id = setInterval(() => { wordIdx = (wordIdx + 1) % WORDS.length; }, 2200);
			return () => clearInterval(id);
		} else {
			clearInterval(id); wordIdx = 0;
		}
	});
</script>

{#if appState.isAnalyzing}
<div class="l animate-up">
	<div class="l-orb">
		<div class="l-orb-inner">
			<Icon name="kangaroo" size={28} color="var(--lavender)" />
		</div>
		<div class="l-ring l-ring-1"></div>
		<div class="l-ring l-ring-2"></div>
	</div>
	<div class="l-text-wrap">
		{#key wordIdx}
			<p class="l-text animate-fade">{WORDS[wordIdx]}</p>
		{/key}
	</div>
	<div class="l-bar"><div class="l-bar-fill"></div></div>
</div>
{/if}

<style>
	.l {
		display:flex; flex-direction:column; align-items:center; gap:16px;
		padding:32px 24px; background:var(--surface); border:1px solid var(--border);
		border-radius:var(--r-xl); box-shadow:var(--shadow-card);
	}

	/* Orb */
	.l-orb { position:relative; width:80px; height:80px; display:flex; align-items:center; justify-content:center; }
	.l-orb-inner {
		width:64px; height:64px; border-radius:50%;
		background:linear-gradient(135deg, var(--lav-soft), var(--mint-soft));
		border:2px solid rgba(167,139,250,.3);
		display:flex; align-items:center; justify-content:center;
		animation:breathe 1.8s ease-in-out infinite;
		box-shadow:0 0 32px var(--lav-glow);
		position:relative; z-index:1;
	}
	.l-ring {
		position:absolute; border-radius:50%; border:1.5px solid rgba(167,139,250,.2);
		animation:ping 2s ease-out infinite;
	}
	.l-ring-1 { width:80px; height:80px; animation-delay:0s; }
	.l-ring-2 { width:80px; height:80px; animation-delay:.7s; }

	/* Text */
	.l-text-wrap { height:22px; display:flex; align-items:center; overflow:hidden; }
	.l-text { font-size:.88rem; color:var(--text-soft); font-weight:700; text-align:center; }

	/* Progress bar */
	.l-bar { width:160px; height:3px; background:var(--border); border-radius:2px; overflow:hidden; }
	.l-bar-fill {
		height:100%; width:40%;
		background:linear-gradient(90deg, var(--lavender), var(--mint));
		border-radius:2px;
		animation:indeterminate 1.5s ease-in-out infinite;
	}
	@keyframes indeterminate {
		0%   { transform:translateX(-150%); width:40%; }
		60%  { width:60%; }
		100% { transform:translateX(350%); width:40%; }
	}
</style>
