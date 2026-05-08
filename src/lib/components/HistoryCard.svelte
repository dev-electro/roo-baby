<script>
	import { getGroupedHistory, clearHistory } from '$utils/historyStore.js';
	let groups=$state(getGroupedHistory());
	const EM={HUNGER:'🍼',PAIN:'🩹',TIRED:'😴',DISCOMFORT:'🌡️',BURPING:'💫',UNKNOWN:'❓'};
	function refresh(){groups=getGroupedHistory()}
	function clear(){clearHistory();refresh()}
	$effect(()=>{const id=setInterval(refresh,3000);return()=>clearInterval(id)});
</script>
{#if Object.keys(groups).length}
<div class="hc animate-slide">
	<div class="hc-head"><span class="hc-title">Recent Analyses</span><button class="hc-clear" onclick={clear}>Clear</button></div>
	{#each Object.entries(groups).slice(0,5) as [date,entries]}
		<div class="hc-group">
			<div class="hc-date">{date===new Date().toLocaleDateString()?'Today':date}</div>
			{#each entries.slice(0,8) as e}
				<div class="hc-entry"><span class="hc-emoji">{EM[e.category]||'❓'}</span><span class="hc-cat">{e.category}</span><span class="hc-conf">{e.confidence}%</span><span class="hc-time">{new Date(e.timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span></div>
			{/each}
		</div>
	{/each}
</div>
{/if}
<style>
	.hc{background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--radius-xl);overflow:hidden}
	.hc-head{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border-bottom:1px solid var(--card-border)}
	.hc-title{font-size:.65rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--text-soft)}
	.hc-clear{font-size:.6rem;font-weight:700;color:var(--text-dim);padding:2px 6px;border-radius:6px;transition:all .15s}
	.hc-clear:hover{color:var(--red);background:rgba(248,113,113,.08)}
	.hc-group{padding:6px 16px;border-bottom:1px solid var(--card-border)}.hc-group:last-child{border-bottom:none}
	.hc-date{font-size:.58rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--text-dim);padding:4px 0}
	.hc-entry{display:flex;align-items:center;gap:6px;padding:5px 0;font-size:.75rem}
	.hc-emoji{font-size:.85rem;line-height:1}
	.hc-cat{font-weight:700;color:var(--text);flex:1}.hc-conf{font-size:.68rem;color:var(--text-soft);font-family:'Fraunces',serif}
	.hc-time{font-size:.62rem;color:var(--text-dim)}
</style>