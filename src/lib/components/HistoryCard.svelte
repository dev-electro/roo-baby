<script>
	import { getGroupedHistory, clearHistory } from '$utils/historyStore.js';
	import Icon from './Icon.svelte';

	let { onclear } = $props();
	let groups = $state(getGroupedHistory());
	let confirmClear = $state(false);

	const IC  = {HUNGER:'bottle',PAIN:'bandage',TIRED:'moon',DISCOMFORT:'thermometer',BURPING:'wind',UNKNOWN:'info-circle',INVALID:'warning'};
	const COL = {HUNGER:'var(--amber)',PAIN:'var(--blush)',TIRED:'var(--indigo)',DISCOMFORT:'var(--amber)',BURPING:'var(--mint)',UNKNOWN:'var(--text-dim)',INVALID:'var(--blush)'};

	function refresh() { groups = getGroupedHistory(); }
	function clear()   { clearHistory(); refresh(); confirmClear = false; onclear?.(); }

	// Bug fix: only poll when history exists
	$effect(() => {
		if (Object.keys(groups).length === 0) return;
		const id = setInterval(refresh, 4000);
		return () => clearInterval(id);
	});

	let showAll = $state(false);
	const today = new Date().toLocaleDateString();
</script>

{#if Object.keys(groups).length}
<div class="hc animate-up">
	<div class="hc-head">
		<span class="hc-title">
			<Icon name="sparkles" size={12} color="var(--lavender)" /> Recent Analyses
		</span>
		{#if confirmClear}
			<div class="hc-confirm">
				<span class="hc-confirm-q">Clear all?</span>
				<button class="hc-btn hc-btn-red" onclick={clear}>Yes, clear</button>
				<button class="hc-btn" onclick={() => confirmClear = false}>Cancel</button>
			</div>
		{:else}
			<button class="hc-clear" onclick={() => confirmClear = true}>Clear</button>
		{/if}
	</div>

	{#each Object.entries(groups).slice(0, showAll ? undefined : 3) as [date, entries]}
		<div class="hc-group">
			<div class="hc-date">
				<div class="hc-date-line"></div>
				<span>{date === today ? 'Today' : date}</span>
				<div class="hc-date-line"></div>
			</div>
			{#each entries.slice(0, 8) as e}
				<div class="hc-entry">
					<div class="hc-icon" style="color:{COL[e.category]||'var(--text-dim)'}; background:{COL[e.category]||'var(--text-dim)'}18">
						<Icon name={IC[e.category]||'info-circle'} size={14} color="currentColor" />
					</div>
					<span class="hc-cat">{e.category}</span>
					{#if e.confidence > 0}
						<span class="hc-conf" style="color:{COL[e.category]||'var(--text-dim)'}">{e.confidence}%</span>
					{/if}
					<span class="hc-time">{new Date(e.timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</span>
				</div>
			{/each}
		</div>
	{/each}

	{#if Object.keys(groups).length > 3}
		<button class="hc-more" onclick={() => showAll = !showAll}>
			{showAll ? 'Show less' : `Show older (${Object.keys(groups).length - 3} more days)`}
		</button>
	{/if}
</div>
{/if}

<style>
	.hc {
		background:var(--surface); border:1px solid var(--border);
		border-radius:var(--r-xl); overflow:hidden;
	}

	.hc-head {
		display:flex; align-items:center; justify-content:space-between;
		padding:12px 16px; border-bottom:1px solid var(--border); gap:8px; flex-wrap:wrap;
	}
	.hc-title {
		font-size:.65rem; font-weight:800; letter-spacing:.08em; text-transform:uppercase;
		color:var(--text-soft); display:flex; align-items:center; gap:5px;
	}
	.hc-clear {
		font-size:.62rem; font-weight:700; color:var(--text-dim);
		padding:3px 8px; border-radius:var(--r-sm); transition:all .15s;
	}
	.hc-clear:hover { color:var(--blush); background:var(--blush-soft); }

	.hc-confirm { display:flex; align-items:center; gap:6px; }
	.hc-confirm-q { font-size:.68rem; color:var(--text-soft); font-weight:700; }
	.hc-btn {
		padding:3px 10px; border-radius:var(--r-sm); font-size:.62rem; font-weight:800;
		border:1px solid var(--border); background:var(--surface); color:var(--text-soft);
		transition:all .15s; cursor:pointer;
	}
	.hc-btn:hover { border-color:var(--lavender); color:var(--text); }
	.hc-btn-red { border-color:rgba(253,164,175,.3); color:var(--blush); background:var(--blush-soft); }
	.hc-btn-red:hover { border-color:var(--blush); }

	.hc-group { padding:4px 16px 8px; border-bottom:1px solid var(--border-soft); }
	.hc-group:last-of-type { border-bottom:none; }

	.hc-date {
		display:flex; align-items:center; gap:8px; padding:8px 0 4px;
		font-size:.58rem; font-weight:800; letter-spacing:.08em; text-transform:uppercase;
		color:var(--text-dim);
	}
	.hc-date-line { flex:1; height:1px; background:var(--border-soft); }

	.hc-entry { display:flex; align-items:center; gap:8px; padding:6px 0; }
	.hc-icon  {
		width:24px; height:24px; border-radius:var(--r-xs);
		display:flex; align-items:center; justify-content:center; flex-shrink:0;
	}
	.hc-cat   { font-size:.78rem; font-weight:800; color:var(--text); flex:1; text-transform:capitalize; }
	.hc-conf  { font-size:.68rem; font-weight:700; font-family:'Fraunces',serif; flex-shrink:0; }
	.hc-time  { font-size:.62rem; color:var(--text-dim); flex-shrink:0; }

	.hc-more {
		display:block; width:100%; padding:10px; text-align:center;
		font-size:.72rem; font-weight:700; color:var(--lavender);
		border-top:1px solid var(--border-soft); transition:background .15s;
	}
	.hc-more:hover { background:var(--lav-soft); }
</style>