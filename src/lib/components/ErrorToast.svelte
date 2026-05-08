<script>import { appState } from '$state/appState.svelte.js';</script>
{#if appState.error}
<div class="e animate-slide">⚠️ <span>{appState.error}</span><button class="e-x" onclick={appState.clearError}>✕</button></div>
{/if}
<style>
	.e{display:flex;align-items:center;gap:8px;padding:12px 14px;background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.15);border-radius:var(--radius);color:var(--red);font-size:.82rem;font-weight:600}
	.e span{flex:1;line-height:1.4}
	.e-x{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--red);font-size:.7rem;flex-shrink:0;transition:background .15s}
	.e-x:hover{background:rgba(248,113,113,.15)}
</style>