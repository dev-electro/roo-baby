<script>
	import { appState } from '$state/appState.svelte.js';
	import Icon from './Icon.svelte';

	const CAT_META = {
		HUNGER:     { label:'Hunger',      icon:'bottle',      color:'var(--cat-hunger)',     bg:'var(--cat-hunger-bg)',     advice:'Baby needs to be fed. Offer breast or bottle.' },
		PAIN:       { label:'Pain / Discomfort', icon:'bandage', color:'var(--cat-pain)',    bg:'var(--cat-pain-bg)',        advice:'Check for discomfort — gas, rash, or teething. Consult a doctor if persistent.' },
		TIRED:      { label:'Tired',        icon:'moon',        color:'var(--cat-tired)',      bg:'var(--cat-tired-bg)',      advice:'Baby needs sleep. Create a calm, dark environment.' },
		DISCOMFORT: { label:'Discomfort',   icon:'thermometer', color:'var(--cat-discomfort)', bg:'var(--cat-discomfort-bg)', advice:'Check temperature, diaper, clothing, or position.' },
		BURPING:    { label:'Needs Burping',icon:'wind',        color:'var(--cat-burping)',    bg:'var(--cat-burping-bg)',    advice:'Hold baby upright and gently pat their back.' },
		UNKNOWN:    { label:'Unclear',      icon:'info',        color:'var(--cat-unknown)',    bg:'var(--cat-unknown-bg)',    advice:'Pattern unclear. Observe your baby and try again.' },
		INVALID:    { label:'Not a Baby',   icon:'warning',     color:'var(--error)',          bg:'var(--error-bg)',          advice:'ROO is designed for babies only. Point the mic at your little one.' },
	};

	const SEV_LABEL = { NONE:'Low urgency', LOW:'Low urgency', MEDIUM:'Moderate', HIGH:'Act soon', CRITICAL:'Urgent' };
	const SEV_COLOR = { NONE:'var(--text-3)', LOW:'var(--success)', MEDIUM:'var(--warning)', HIGH:'var(--warning)', CRITICAL:'var(--error)' };

	let r  = $derived(/** @type {any} */(appState.result));
	let m  = $derived(r ? (CAT_META[/** @type {string} */(r.category)] ?? CAT_META.UNKNOWN) : null);
	let sv = $derived(r?.severity ?? 'NONE');

	let cardEl = $state(/** @type {HTMLElement|undefined} */(undefined));
	$effect(() => {
		if (r && cardEl) { setTimeout(() => cardEl?.scrollIntoView({ behavior:'smooth', block:'nearest' }), 80); }
	});
</script>

{#if r && m}
<div class="rc animate-up" bind:this={cardEl} style="--cat-c:{m.color};--cat-bg:{m.bg}">

	<!-- Category header -->
	<div class="rc-head">
		<div class="rc-icon">
			<Icon name={m.icon} size={28} color={m.color} />
		</div>
		<div class="rc-head-text">
			<p class="rc-label">ROO says your baby is…</p>
			<h2 class="rc-cat">{m.label}</h2>
		</div>
		<div class="rc-sev" style="color:{SEV_COLOR[sv] ?? 'var(--text-3)'}">
			{SEV_LABEL[sv] ?? 'Low urgency'}
		</div>
	</div>

	<!-- Confidence bar -->
	{#if r.confidence > 0}
	<div class="rc-conf">
		<div class="rc-conf-labels">
			<span class="label">Confidence</span>
			<span class="rc-conf-pct">{r.confidence}%</span>
		</div>
		<div class="rc-conf-track">
			<div
				class="rc-conf-fill"
				style="width:{r.confidence}%; background:{r.confidence >= 75 ? 'var(--success)' : r.confidence >= 50 ? 'var(--warning)' : 'var(--error)'}"
			></div>
		</div>
		{#if r.confidence < 60}
			<p class="rc-conf-note">
				<Icon name="info" size={12} color="currentColor" />
				Low confidence — consider re-recording in a quieter environment
			</p>
		{/if}
	</div>
	{/if}

	<!-- What ROO heard -->
	{#if r.reasoning}
	<div class="rc-section">
		<p class="label">What ROO detected</p>
		<p class="rc-body">{r.reasoning}</p>
	</div>
	{/if}

	<!-- Parent action -->
	<div class="rc-action">
		<Icon name="sparkles" size={16} color={m.color} />
		<p class="rc-action-text">{r.parent_action || m.advice}</p>
	</div>

	<!-- Adult face warning -->
	{#if r.is_adult && r.adult_message}
	<div class="rc-alert warn">
		<Icon name="warning" size={15} color="var(--warning)" />
		<p>{r.adult_message}</p>
	</div>
	{/if}

	<!-- Pre-cry note -->
	{#if r.pre_cry && r.pre_cry_message}
	<div class="rc-alert info">
		<Icon name="info" size={15} color="var(--info)" />
		<p>{r.pre_cry_message}</p>
	</div>
	{/if}

	<!-- Edge-case note -->
	{#if r._isEdgeCase}
	<div class="rc-alert warn">
		<Icon name="info" size={15} color="var(--warning)" />
		<p>This result is based on audio quality analysis, not AI inference. Please re-record for a full analysis.</p>
	</div>
	{/if}

	<!-- Disclaimer -->
	<p class="rc-disclaimer">
		<Icon name="warning" size={11} color="currentColor" />
		Not a medical device. Always trust your parental instincts and consult your pediatrician.
	</p>
</div>
{/if}

<style>
	.rc {
		background: var(--surface); border: 1px solid var(--border);
		border-radius: var(--r-xl); overflow: hidden;
		display: flex; flex-direction: column; gap: 0;
	}

	/* Category header */
	.rc-head {
		display: flex; align-items: center; gap: 14px;
		padding: 20px 20px 16px;
		border-bottom: 1px solid var(--border);
		background: var(--cat-bg);
	}
	.rc-icon {
		width: 60px; height: 60px; border-radius: var(--r-lg); flex-shrink: 0;
		background: var(--surface); border: 1px solid rgba(255,255,255,.08);
		display: flex; align-items: center; justify-content: center;
	}

	.rc-head-text { flex: 1; }
	.rc-label { font-size: .65rem; font-weight: 700; color: var(--text-2); letter-spacing: .04em; }
	.rc-cat   { font-family:'Quicksand', sans-serif; font-size: 1.6rem; font-weight: 700; color: var(--cat-c); line-height: 1.1; margin-top: 3px; }
	.rc-sev   { font-size: .62rem; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; flex-shrink: 0; text-align: right; }

	/* Confidence */
	.rc-conf { padding: 16px 20px; border-bottom: 1px solid var(--border); display: flex; flex-direction: column; gap: 6px; }
	.rc-conf-labels { display: flex; justify-content: space-between; align-items: center; }
	.rc-conf-pct { font-size: 1rem; font-weight: 800; color: var(--text); }
	.rc-conf-track { height: 8px; background: var(--surface-2); border-radius: 4px; overflow: hidden; }
	.rc-conf-fill  { height: 100%; border-radius: 4px; transition: width .6s cubic-bezier(.16,1,.3,1); }
	.rc-conf-note  { display: flex; align-items: center; gap: 5px; font-size: .68rem; color: var(--text-2); }

	/* Sections */
	.rc-section { padding: 16px 20px; border-bottom: 1px solid var(--border); display: flex; flex-direction: column; gap: 4px; }
	.rc-body    { font-size: .88rem; color: var(--text-2); line-height: 1.6; }


	/* Action */
	.rc-action {
		display: flex; align-items: flex-start; gap: 10px;
		padding: 16px 20px; border-bottom: 1px solid var(--border);
		background: var(--cat-bg);
	}
	.rc-action-text { font-size: .9rem; font-weight: 700; color: var(--text); line-height: 1.5; }

	/* Alerts */
	.rc-alert {
		display: flex; align-items: flex-start; gap: 10px;
		padding: 12px 20px; border-bottom: 1px solid var(--border);
		font-size: .8rem; line-height: 1.5;
	}
	.rc-alert.warn { background: var(--warning-bg); color: var(--warning); }
	.rc-alert.info { background: var(--info-bg);    color: var(--info); }
	.rc-alert p { flex: 1; }

	/* Disclaimer */
	.rc-disclaimer {
		display: flex; align-items: center; gap: 5px;
		padding: 10px 20px;
		font-size: .62rem; color: var(--text-3); line-height: 1.5;
	}
</style>