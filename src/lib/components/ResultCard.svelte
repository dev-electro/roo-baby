<script>
	import { appState } from '$state/appState.svelte.js';
	import Icon from './Icon.svelte';

	const IC = { HUNGER:'bottle', PAIN:'bandage', TIRED:'moon', DISCOMFORT:'thermometer', BURPING:'wind', UNKNOWN:'info-circle', INVALID:'warning' };
	const LB = { HUNGER:'Hunger', PAIN:'Pain', TIRED:'Tired', DISCOMFORT:'Discomfort', BURPING:'Burping', UNKNOWN:'Unknown', INVALID:'Not a Baby' };
	const CL = { HUNGER:'var(--gold)', PAIN:'var(--red)', TIRED:'var(--purple)', DISCOMFORT:'var(--gold)', BURPING:'var(--teal)', UNKNOWN:'var(--text-soft)', INVALID:'var(--red)' };
	const SV = { NONE:{c:'var(--text-soft)',bg:'rgba(128,128,128,.1)'}, LOW:{c:'var(--teal)',bg:'var(--teal-soft)'}, MEDIUM:{c:'var(--gold)',bg:'var(--gold-soft)'}, HIGH:{c:'var(--pink)',bg:'var(--pink-soft)'}, CRITICAL:{c:'var(--red)',bg:'rgba(248,113,113,.15)'} };

	let w=$state(0);
	$effect(()=>{if(appState.result){requestAnimationFrame(()=>setTimeout(()=>w=appState.result?.confidence||0,100))}else w=0});
</script>

{#if appState.result}
	<div class="rc animate-slide">
		<div class="rc-top">
			<div class="rc-cat">
				<div class="rc-icon" style="color:{CL[appState.result.category]||'var(--text-soft)'}">
					<Icon name={IC[appState.result.category]||'info-circle'} size={28} color="currentColor" />
				</div>
				<div><div class="rc-name">{LB[appState.result.category]||appState.result.category}</div><div class="rc-sub">Your baby may be {LB[appState.result.category]?.toLowerCase()||'upset'}</div></div>
			</div>
			<div class="rc-sev" style="--sc:{(SV[appState.result.severity]||SV.MEDIUM).c};--sb:{(SV[appState.result.severity]||SV.MEDIUM).bg}">{appState.result.severity}</div>
		</div>
		<div class="rc-conf">
			<div class="rc-conf-h"><span>Confidence</span><span class="rc-conf-v">{appState.result.confidence}%</span></div>
			<div class="rc-conf-t"><div class="rc-conf-f" style="width:{w}%"></div></div>
		</div>
		{#if appState.result.reasoning}
			<div class="rc-box"><div class="rc-box-l">Why</div><p class="rc-reason">"{appState.result.reasoning}"</p></div>
		{/if}
		{#if appState.result.parent_action}
			<div class="rc-action"><div class="rc-box-l action-l">What to do</div><div class="rc-action-t">{appState.result.parent_action}</div></div>
		{/if}
	</div>
{/if}

<style>
	.rc{background:var(--card-bg);border:1px solid var(--card-border);border-radius:var(--radius-xl);overflow:hidden}
	.rc-top{padding:16px;display:flex;align-items:flex-start;justify-content:space-between;gap:8px;background:linear-gradient(135deg,var(--pink-soft),var(--gold-soft));border-bottom:1px solid var(--card-border)}
	.rc-cat{display:flex;align-items:center;gap:10px}
	.rc-icon{width:48px;height:48px;border-radius:var(--radius-sm);background:rgba(128,128,128,.06);display:flex;align-items:center;justify-content:center;flex-shrink:0}
	.rc-name{font-family:'Fraunces',serif;font-size:1.4rem;font-weight:700;color:var(--text)}
	.rc-sub{font-size:.72rem;color:var(--text-soft)}
	.rc-sev{padding:3px 10px;border-radius:100px;font-size:.6rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--sc);background:var(--sb);border:1px solid var(--sc);flex-shrink:0}
	.rc-conf{padding:12px 16px}
	.rc-conf-h{display:flex;justify-content:space-between;font-size:.68rem;font-weight:700;color:var(--text-soft);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px}
	.rc-conf-v{font-family:'Fraunces',serif;font-size:.85rem;color:var(--text);text-transform:none;letter-spacing:0}
	.rc-conf-t{height:4px;background:var(--card-border);border-radius:2px;overflow:hidden}
	.rc-conf-f{height:100%;background:linear-gradient(90deg,var(--pink),var(--gold));border-radius:2px;transition:width 1s cubic-bezier(.25,.46,.45,.94);box-shadow:0 0 8px var(--pink)}
	.rc-box{padding:12px 16px;border-bottom:1px solid var(--card-border)}
	.rc-box-l{font-size:.6rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--text-dim);margin-bottom:4px}
	.rc-reason{font-size:.82rem;color:var(--text-soft);line-height:1.55;font-style:italic}
	.rc-action{padding:14px 16px;background:var(--teal-soft)}
	.action-l{color:var(--teal)!important}
	.rc-action-t{font-size:.9rem;font-weight:700;color:var(--text);line-height:1.4}
</style>