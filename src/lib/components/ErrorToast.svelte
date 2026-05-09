<script>
	import { appState } from '$state/appState.svelte.js';
	import Icon from './Icon.svelte';
	import { onMount, onDestroy } from 'svelte';

	let tmr;

	// Reset timer whenever error changes
	$effect(() => {
		if (appState.errorMsg) {
			clearTimeout(tmr);
			tmr = setTimeout(() => appState.clearError(), 6000);
		}
	});

	onDestroy(() => clearTimeout(tmr));
</script>

{#if appState.errorMsg}
	<div class="toast animate-up">
		<div class="t-icon"><Icon name="alert-circle" size={18} color="currentColor" /></div>
		<span class="t-msg">{appState.errorMsg}</span>
		<button class="t-close" onclick={() => appState.clearError()} aria-label="Dismiss error">
			<Icon name="x" size={16} color="currentColor" />
		</button>
		<div class="t-prog"></div>
	</div>
{/if}

<style>
	.toast {
		position:fixed; bottom:24px; left:50%; transform:translateX(-50%); z-index:100;
		display:flex; align-items:center; gap:12px; padding:12px 16px;
		background:var(--blush-soft); border:1px solid var(--blush); color:var(--blush);
		border-radius:var(--r-sm); font-size:0.85rem; font-weight:600;
		box-shadow:var(--shadow-elevated); max-width:calc(100% - 48px); overflow:hidden;
	}
	.t-icon { flex-shrink:0; display:flex; align-items:center; }
	.t-msg { flex:1; }
	.t-close { opacity:0.7; transition:opacity .2s; display:flex; align-items:center; }
	.t-close:hover { opacity:1; }

	.t-prog {
		position:absolute; bottom:0; left:0; height:2px; background:var(--blush);
		animation: t-drain 6s linear forwards;
	}

	@keyframes t-drain {
		from { width:100%; }
		to { width:0%; }
	}
</style>