<script>
	import { history, clearHistory } from '$utils/historyStore.js';
	import Icon from './Icon.svelte';

	let items = $derived($history);
	let showClearConfirm = $state(false);

	const ICONS = { HUNGER:'baby', PAIN:'warning', TIRED:'moon', DISCOMFORT:'settings', BURPING:'check', UNKNOWN:'search', INVALID:'alert-circle' };
	const COLORS = { HIGH:'var(--red)', MEDIUM:'var(--amber)', LOW:'var(--primary)', NONE:'var(--text-soft)' };

	function getRelTime(iso) {
		const d = new Date(iso);
		const diffMs = Date.now() - d.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		if (diffMins < 1) return 'Just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		const diffHrs = Math.floor(diffMins / 60);
		if (diffHrs < 24) return `${diffHrs}h ago`;
		return d.toLocaleDateString(undefined, { month:'short', day:'numeric' });
	}
</script>

<div class="h-card">
	<div class="h-head">
		<h3 class="h-title"><Icon name="clock" size={18} color="currentColor" /> History</h3>
		{#if items.length > 0}
			{#if showClearConfirm}
				<div class="h-actions">
					<button class="h-btn cancel" onclick={()=>showClearConfirm=false}>Cancel</button>
					<button class="h-btn confirm" onclick={()=>{clearHistory();showClearConfirm=false;}}>Confirm</button>
				</div>
			{:else}
				<button class="h-btn clear" onclick={()=>showClearConfirm=true}>Clear</button>
			{/if}
		{/if}
	</div>

	<div class="h-body">
		{#if items.length === 0}
			<div class="h-empty">
				<Icon name="inbox" size={32} color="var(--border)" />
				<p>No recent analysis</p>
			</div>
		{:else}
			<div class="timeline">
				{#each items.slice(0, 5) as item}
					{@const c = COLORS[item.severity] || 'var(--text-dim)'}
					<div class="tl-item">
						<div class="tl-dot" style="background:{c}; border-color:var(--surface)"></div>
						<div class="tl-content">
							<div class="tl-row">
								<span class="tl-cat" style="color:{c}"><Icon name={ICONS[item.category] || 'search'} size={14} color="currentColor"/> {item.category}</span>
								<span class="tl-time">{getRelTime(item.timestamp)}</span>
							</div>
							<p class="tl-desc">{item.reasoning}</p>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	.h-card { background:var(--surface); border:1px solid var(--border); border-radius:var(--r-md); box-shadow:var(--shadow-card); }
	
	.h-head { display:flex; justify-content:space-between; align-items:center; padding:16px 20px; border-bottom:1px solid var(--border); }
	.h-title { font-size:1.05rem; font-weight:700; color:var(--text); margin:0; display:flex; align-items:center; gap:8px; }
	
	.h-actions { display:flex; gap:8px; }
	.h-btn { font-size:0.8rem; font-weight:600; padding:6px 12px; border-radius:var(--r-xs); transition:all .2s; }
	.h-btn.clear { color:var(--text-soft); background:var(--surface-2); border:1px solid var(--border); }
	.h-btn.clear:hover { color:var(--blush); border-color:var(--blush); background:var(--blush-soft); }
	.h-btn.cancel { color:var(--text); background:var(--surface-2); border:1px solid var(--border); }
	.h-btn.confirm { color:var(--surface); background:var(--blush); }

	.h-body { padding:20px; }
	
	.h-empty { display:flex; flex-direction:column; align-items:center; gap:12px; padding:24px 0; color:var(--text-dim); font-size:0.9rem; font-weight:500; }

	.timeline { display:flex; flex-direction:column; gap:20px; position:relative; }
	.timeline::before { content:''; position:absolute; top:8px; bottom:8px; left:5px; width:2px; background:var(--surface-2); }

	.tl-item { display:flex; gap:16px; position:relative; }
	.tl-dot { width:12px; height:12px; border-radius:50%; border:2px solid var(--surface); position:absolute; left:0; top:4px; z-index:2; }
	
	.tl-content { flex:1; padding-left:24px; display:flex; flex-direction:column; gap:4px; }
	.tl-row { display:flex; justify-content:space-between; align-items:center; }
	.tl-cat { font-size:0.8rem; font-weight:700; text-transform:uppercase; display:flex; align-items:center; gap:4px; }
	.tl-time { font-size:0.75rem; color:var(--text-dim); font-weight:600; }
	.tl-desc { font-size:0.85rem; color:var(--text-soft); line-height:1.4; margin:0; }
</style>