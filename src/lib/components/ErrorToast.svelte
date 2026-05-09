<script>
	import { appState } from '$state/appState.svelte.js';
	import Icon from './Icon.svelte';
	import { onDestroy } from 'svelte';

	let visible = $state(false);
	let progress = $state(100);
	let timer = null;
	let progressTimer = null;
	const DURATION = 6000;

	$effect(() => {
		if (appState.error) {
			visible = true;
			progress = 100;
			clearTimeout(timer);
			clearInterval(progressTimer);
			// Animate progress bar down
			const start = Date.now();
			progressTimer = setInterval(() => {
				const elapsed = Date.now() - start;
				progress = Math.max(0, 100 - (elapsed / DURATION) * 100);
				if (progress <= 0) clearInterval(progressTimer);
			}, 50);
			// Auto-dismiss
			timer = setTimeout(() => {
				visible = false;
				appState.clearError();
			}, DURATION);
		} else {
			visible = false;
		}
	});

	onDestroy(() => { clearTimeout(timer); clearInterval(progressTimer); });
</script>

{#if visible && appState.error}
	<div class="toast animate-up" role="alert" aria-live="polite">
		<Icon name="warning" size={18} color="var(--blush)" />
		<span class="toast-msg">{appState.error}</span>
		<button class="toast-x" onclick={() => { visible = false; appState.clearError(); }} aria-label="Dismiss">
			<Icon name="close" size={14} color="currentColor" />
		</button>
		<div class="toast-progress" style="width:{progress}%"></div>
	</div>
{/if}

<style>
	.toast {
		position:fixed; bottom:24px; left:50%; transform:translateX(-50%);
		z-index:200; display:flex; align-items:center; gap:10px;
		padding:12px 16px 14px;
		background:var(--surface); border:1px solid rgba(253,164,175,.3);
		border-radius:var(--r-lg); box-shadow:0 8px 32px rgba(0,0,0,.4);
		font-size:.84rem; font-weight:700; color:var(--text);
		max-width:min(380px, calc(100vw - 32px));
		white-space:normal;
		overflow:hidden;
	}
	.toast-msg { flex:1; color:var(--blush); line-height:1.4; }
	.toast-x {
		width:28px; height:28px; border-radius:50%; flex-shrink:0;
		display:flex; align-items:center; justify-content:center;
		color:var(--text-dim); transition:background .15s;
	}
	.toast-x:hover { background:var(--blush-soft); color:var(--blush); }
	.toast-progress {
		position:absolute; bottom:0; left:0; height:3px;
		background:linear-gradient(90deg, var(--blush), var(--lavender));
		border-radius:0 0 var(--r-lg) var(--r-lg);
		transition:width 50ms linear;
	}
</style>