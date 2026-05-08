<script>
	import { appState } from '$state/appState.svelte.js';
	const words=['Listening to your baby…','Reading the spectrogram…','Consulting ROO AI…','Almost there…'];
	let w=$state(words[0]), i=0, id;
	$effect(()=>{if(appState.isAnalyzing){id=setInterval(()=>{i=(i+1)%words.length;w=words[i]},2000);return()=>clearInterval(id)}else{w=words[0];i=0}});
</script>
{#if appState.isAnalyzing}
<div class="l animate-slide"><div class="l-pulse"><Icon name="kangaroo" size={24} color="var(--pink)" /></div><p class="l-text">{w}</p></div>
{/if}
<style>
	.l{display:flex;flex-direction:column;align-items:center;gap:12px;padding:28px;background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--radius-xl)}
	.l-pulse{width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,var(--pink-soft),var(--gold-soft));border:2px solid var(--pink);display:flex;align-items:center;justify-content:center;font-size:1.5rem;animation:dot 1.6s ease-in-out infinite}
	.l-text{font-size:.85rem;color:var(--text-soft);font-weight:600}
</style>