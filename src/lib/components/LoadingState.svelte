<script>
	import Icon from './Icon.svelte';
	import { onMount } from 'svelte';

	const tips = [
		"Analyzing audio frequencies...",
		"Checking for signs of hunger...",
		"Looking for pain indicators...",
		"Processing vocal patterns...",
		"Evaluating baby's environment..."
	];
	let tipIndex = $state(0);

	onMount(() => {
		const iv = setInterval(() => {
			tipIndex = (tipIndex + 1) % tips.length;
		}, 2500);
		return () => clearInterval(iv);
	});
</script>

<div class="loader-wrap animate-in">
	<div class="spinner-box">
		<Icon name="loader" size={32} color="var(--primary)" style="animation: spin 1s linear infinite;" />
	</div>

	<h3 class="head">Analyzing...</h3>
	<div class="tip-wrap">
		{#key tipIndex}
			<p class="tip animate-up">{tips[tipIndex]}</p>
		{/key}
	</div>
	
	<!-- Clean indeterminate bar -->
	<div class="prog-bg">
		<div class="prog-bar"></div>
	</div>
</div>

<style>
	.loader-wrap {
		display:flex; flex-direction:column; align-items:center; justify-content:center;
		padding:48px 24px; min-height:240px; text-align:center;
	}

	.spinner-box { margin-bottom:20px; }

	.head { font-size:1.2rem; font-weight:700; color:var(--text); margin-bottom:8px; }

	.tip-wrap { height:24px; overflow:hidden; position:relative; margin-bottom:32px; width:100%; }
	.tip { font-size:0.9rem; color:var(--text-soft); font-weight:500; position:absolute; width:100%; left:0; }

	.prog-bg { width:200px; height:4px; border-radius:2px; background:var(--surface-2); overflow:hidden; position:relative; }
	.prog-bar {
		position:absolute; top:0; left:0; bottom:0; width:40%; border-radius:2px;
		background:var(--primary);
		animation: linear-prog 1.5s ease-in-out infinite;
	}

	@keyframes linear-prog {
		0%   { left:-40%; }
		100% { left:100%; }
	}
</style>
