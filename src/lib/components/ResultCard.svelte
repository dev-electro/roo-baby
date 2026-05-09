<script>
	import Icon from './Icon.svelte';

	let { result } = $props();

	const SEV_COLORS = { HIGH:'var(--red)', MEDIUM:'var(--amber)', LOW:'var(--primary)', NONE:'var(--text-soft)' };
	const C_ICONS = { HUNGER:'baby', PAIN:'warning', TIRED:'moon', DISCOMFORT:'settings', BURPING:'check', UNKNOWN:'search', INVALID:'alert-circle' };
	
	let color = $derived(SEV_COLORS[result?.severity] || 'var(--primary)');
	let icon = $derived(C_ICONS[result?.category] || 'search');

	// Map 0-1 confidence to percentage
	let confPct = $derived(Math.round((result?.confidence || 0) * 100));
</script>

<div class="rc-card animate-up" style="--c-accent: {color}">
	<div class="rc-head">
		<div class="rc-icon" style="color:var(--c-accent)"><Icon name={icon} size={24} color="currentColor" /></div>
		<div class="rc-titles">
			<span class="rc-sub">Detected Category</span>
			<h2 class="rc-title" style="color:var(--c-accent)">{result?.category}</h2>
		</div>
		<div class="rc-conf-badge">{confPct}% match</div>
	</div>

	<div class="rc-conf-bar-wrap">
		<div class="rc-conf-bar" style="width:{confPct}%; background:var(--c-accent)"></div>
	</div>

	<div class="rc-body">
		<div class="rc-sec">
			<h4 class="sec-lbl"><Icon name="align-left" size={14} color="currentColor"/> Reason</h4>
			<p class="sec-txt">{result?.reasoning}</p>
		</div>

		{#if result?.parent_action}
			<div class="rc-sec">
				<h4 class="sec-lbl"><Icon name="check-circle" size={14} color="currentColor"/> Recommended Action</h4>
				<p class="sec-txt">{result?.parent_action}</p>
			</div>
		{/if}

		{#if result?.pre_cry && result?.pre_cry_message}
			<div class="rc-alert pre-cry">
				<Icon name="info" size={16} color="currentColor" />
				<span>{result?.pre_cry_message}</span>
			</div>
		{/if}

		{#if result?.is_adult && result?.adult_message}
			<div class="rc-alert adult">
				<Icon name="users" size={16} color="currentColor" />
				<span>{result?.adult_message}</span>
			</div>
		{/if}
	</div>
</div>

<style>
	.rc-card {
		background:var(--surface); border:1px solid var(--border); border-radius:var(--r-md);
		overflow:hidden; display:flex; flex-direction:column; box-shadow:var(--shadow-card);
	}
	
	.rc-head { padding:20px; display:flex; align-items:center; gap:16px; position:relative; }
	.rc-icon { width:48px; height:48px; border-radius:var(--r-sm); background:var(--surface-2); display:flex; align-items:center; justify-content:center; }
	.rc-titles { display:flex; flex-direction:column; gap:2px; flex:1; }
	.rc-sub { font-size:0.75rem; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; color:var(--text-dim); }
	.rc-title { font-size:1.3rem; font-weight:700; letter-spacing:-0.01em; margin:0; }
	
	.rc-conf-badge {
		padding:4px 10px; border-radius:var(--r-pill); font-size:0.8rem; font-weight:700;
		background:var(--surface-2); color:var(--text-soft); border:1px solid var(--border);
	}

	.rc-conf-bar-wrap { width:100%; height:4px; background:var(--border); }
	.rc-conf-bar { height:100%; transition:width 1s cubic-bezier(0.34,1.56,0.64,1); }

	.rc-body { padding:20px; display:flex; flex-direction:column; gap:16px; background:var(--surface-2); }
	
	.rc-sec { display:flex; flex-direction:column; gap:6px; }
	.sec-lbl { font-size:0.85rem; font-weight:700; color:var(--text-soft); display:flex; align-items:center; gap:6px; margin:0; }
	.sec-txt { font-size:0.95rem; color:var(--text); line-height:1.5; font-weight:500; }

	.rc-alert {
		display:flex; align-items:flex-start; gap:12px; padding:12px;
		border-radius:var(--r-sm); font-size:0.85rem; font-weight:500; line-height:1.4;
	}
	.pre-cry { background:var(--amber-soft); color:var(--amber); border:1px solid rgba(226,184,131,0.2); }
	.adult { background:var(--indigo-soft); color:var(--indigo); border:1px solid rgba(128,147,241,0.2); }
</style>