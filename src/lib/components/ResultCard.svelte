<script>
	import { appState } from '$state/appState.svelte.js';
	import Icon from './Icon.svelte';

	const IC = {
		HUNGER:'bottle', PAIN:'bandage', TIRED:'moon', DISCOMFORT:'thermometer',
		BURPING:'wind', UNKNOWN:'info-circle', INVALID:'warning'
	};
	const LB = {
		HUNGER:'Hunger', PAIN:'Pain', TIRED:'Tired',
		DISCOMFORT:'Discomfort', BURPING:'Burping', UNKNOWN:'Unknown', INVALID:'Not a Baby'
	};
	const CL = {
		HUNGER:'var(--amber)', PAIN:'var(--blush)', TIRED:'var(--indigo)',
		DISCOMFORT:'var(--amber)', BURPING:'var(--mint)', UNKNOWN:'var(--text-soft)', INVALID:'var(--blush)'
	};
	const CL_SOFT = {
		HUNGER:'var(--amber-soft)', PAIN:'var(--blush-soft)', TIRED:'var(--indigo-soft)',
		DISCOMFORT:'var(--amber-soft)', BURPING:'var(--mint-soft)', UNKNOWN:'var(--surface-2)', INVALID:'var(--blush-soft)'
	};
	const SV = {
		NONE:     {c:'var(--text-soft)', bg:'var(--surface-2)'},
		LOW:      {c:'var(--mint)',      bg:'var(--mint-soft)'},
		MEDIUM:   {c:'var(--amber)',     bg:'var(--amber-soft)'},
		HIGH:     {c:'var(--blush)',     bg:'var(--blush-soft)'},
		CRITICAL: {c:'var(--red)',       bg:'var(--red-soft)'},
	};

	let w = $state(0);
	$effect(() => {
		if (appState.result) {
			requestAnimationFrame(() => setTimeout(() => w = appState.result?.confidence || 0, 120));
		} else {
			w = 0;
		}
	});

	let resultEl;
	$effect(() => {
		if (appState.result && resultEl) {
			setTimeout(() => resultEl.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
		}
	});
</script>

{#if appState.result}
	<div class="rc animate-up" bind:this={resultEl}>

		<!-- Adult alert -->
		{#if appState.result.is_adult || appState.result.category === 'INVALID'}
			<div class="rc-alert animate-in" style="animation-delay:.05s">
				<div class="rc-alert-emoji">👶</div>
				<div>
					<strong class="rc-alert-title">That's an adult face!</strong>
					<p class="rc-alert-sub">ROO is designed for babies aged 0–3. The results below may not be accurate — try it with your little one!</p>
				</div>
			</div>
		{/if}

		<!-- Top: category + severity -->
		<div class="rc-top" style="--cc:{CL[appState.result.category]||'var(--text-soft)'}; --cs:{CL_SOFT[appState.result.category]||'var(--surface-2)'}">
			<div class="rc-cat">
				<div class="rc-icon">
					<Icon name={IC[appState.result.category]||'info-circle'} size={28} color={CL[appState.result.category]||'var(--text-soft)'} />
				</div>
				<div>
					<div class="rc-name gradient-text" style="background:linear-gradient(135deg,{CL[appState.result.category]||'var(--text)'},{CL[appState.result.category]||'var(--text)'}99); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text;">
						{LB[appState.result.category]||appState.result.category}
					</div>
					<div class="rc-sub">Your baby may be {LB[appState.result.category]?.toLowerCase()||'upset'}</div>
				</div>
			</div>
			<div
				class="rc-sev"
				style="color:{(SV[appState.result.severity]||SV.MEDIUM).c}; background:{(SV[appState.result.severity]||SV.MEDIUM).bg}; box-shadow:0 0 12px {(SV[appState.result.severity]||SV.MEDIUM).c}40"
			>
				{appState.result.severity}
			</div>
		</div>

		<!-- Confidence bar -->
		<div class="rc-conf animate-up" style="animation-delay:.1s">
			<div class="rc-conf-h">
				<span>Confidence</span>
				<span class="rc-conf-v">{appState.result.confidence}%</span>
			</div>
			<div class="rc-conf-track">
				<div class="rc-conf-fill" style="width:{w}%">
					<div class="rc-conf-glow"></div>
				</div>
			</div>
		</div>

		<!-- Reasoning -->
		{#if appState.result.reasoning}
			<div class="rc-box animate-up" style="animation-delay:.15s">
				<div class="rc-box-l">Why</div>
				<p class="rc-reason">"{appState.result.reasoning}"</p>
			</div>
		{/if}

		<!-- Action -->
		{#if appState.result.parent_action}
			<div class="rc-action animate-up" style="animation-delay:.2s">
				<div class="rc-action-l">
					<Icon name="arrow-right" size={14} color="var(--mint)" />
					What to do
				</div>
				<div class="rc-action-t">{appState.result.parent_action}</div>
			</div>
		{/if}

		<!-- Adult message -->
		{#if appState.result.adult_message}
			<div class="rc-adult-msg">{appState.result.adult_message}</div>
		{/if}

	</div>
{/if}

<style>
	.rc {
		background:var(--surface); border:1px solid var(--border);
		border-radius:var(--r-xl); overflow:hidden;
		box-shadow:var(--shadow-card);
	}

	/* Alert */
	.rc-alert {
		display:flex; align-items:flex-start; gap:12px;
		padding:14px 18px; background:var(--blush-soft);
		border-bottom:2px solid rgba(253,164,175,.3);
	}
	.rc-alert-emoji { font-size:1.8rem; flex-shrink:0; line-height:1; margin-top:2px; }
	.rc-alert-title { font-size:.85rem; color:var(--blush); display:block; margin-bottom:3px; font-weight:800; }
	.rc-alert-sub   { font-size:.75rem; color:var(--text-soft); line-height:1.5; margin:0; }

	/* Top row */
	.rc-top {
		padding:18px; display:flex; align-items:flex-start;
		justify-content:space-between; gap:10px;
		background:linear-gradient(135deg, var(--cs) 0%, transparent 80%);
		border-bottom:1px solid var(--border);
	}
	.rc-cat   { display:flex; align-items:center; gap:12px; }
	.rc-icon  {
		width:56px; height:56px; border-radius:var(--r-md);
		background:var(--cs); border:1px solid rgba(128,128,128,.12);
		display:flex; align-items:center; justify-content:center; flex-shrink:0;
		box-shadow:0 0 20px var(--cs);
	}
	.rc-name  { font-family:'Fraunces',serif; font-size:1.8rem; font-weight:700; line-height:1; }
	.rc-sub   { font-size:.75rem; color:var(--text-soft); margin-top:3px; }
	.rc-sev   {
		padding:4px 12px; border-radius:var(--r-pill);
		font-size:.6rem; font-weight:800; letter-spacing:.1em; text-transform:uppercase;
		flex-shrink:0; border:1px solid currentColor;
	}

	/* Confidence */
	.rc-conf { padding:14px 18px; }
	.rc-conf-h {
		display:flex; justify-content:space-between; align-items:center;
		font-size:.68rem; font-weight:700; color:var(--text-dim);
		text-transform:uppercase; letter-spacing:.06em; margin-bottom:8px;
	}
	.rc-conf-v { font-family:'Fraunces',serif; font-size:.9rem; color:var(--text); text-transform:none; letter-spacing:0; }
	.rc-conf-track { height:10px; background:var(--border); border-radius:5px; overflow:hidden; position:relative; }
	.rc-conf-fill {
		height:100%; border-radius:5px;
		background:linear-gradient(90deg, var(--lavender), var(--mint));
		transition:width 1.1s cubic-bezier(.25,.46,.45,.94);
		position:relative;
	}
	.rc-conf-glow {
		position:absolute; right:0; top:50%; transform:translateY(-50%);
		width:12px; height:12px; border-radius:50%;
		background:var(--mint); box-shadow:0 0 10px var(--mint);
	}

	/* Reasoning */
	.rc-box    { padding:14px 18px; border-top:1px solid var(--border); }
	.rc-box-l  { font-size:.6rem; font-weight:800; letter-spacing:.1em; text-transform:uppercase; color:var(--text-dim); margin-bottom:6px; }
	.rc-reason { font-size:.88rem; color:var(--text-soft); line-height:1.6; font-style:italic; }
	.rc-reason::before { content:'\201C'; font-size:1.4rem; color:var(--lavender); opacity:.5; vertical-align:-.25em; margin-right:2px; font-style:normal; }

	/* Action */
	.rc-action {
		padding:16px 18px;
		background:linear-gradient(135deg, var(--mint-soft), transparent 80%);
		border-top:1px solid rgba(110,231,183,.2);
	}
	.rc-action-l {
		display:flex; align-items:center; gap:5px;
		font-size:.6rem; font-weight:800; letter-spacing:.1em; text-transform:uppercase;
		color:var(--mint); margin-bottom:6px;
	}
	.rc-action-t { font-size:.92rem; font-weight:700; color:var(--text); line-height:1.5; }

	.rc-adult-msg {
		padding:8px 18px; font-size:.7rem; color:var(--text-dim);
		font-style:italic; background:rgba(253,164,175,.04);
		border-top:1px solid var(--border);
	}
</style>