<script>
	import { appState } from '$state/appState.svelte.js';
	import Icon from './Icon.svelte';

	const CAT_META = {
		HUNGER:     {
			label:'Hunger',
			icon:'bottle',
			color:'var(--cat-hunger)',
			bg:'var(--cat-hunger-bg)',
			emoji: '🍼',
			advice: 'Your baby needs to be fed right now. Offer breast or bottle as soon as possible.',
			why: 'Hunger is the most common reason babies cry. Your baby is making a natural "neh" sound — their tongue pushing to the roof of their mouth as they root for milk. This is an instinctive reflex that activates when their stomach is empty.',
			steps: [
				'Offer breast or bottle immediately',
				'Check when baby last fed — hunger likely if over 2 hours',
				'Look for rooting: head turning side-to-side, mouth opening',
				'Ensure a comfortable feeding position for both of you',
				'If baby refuses, check for other sources of discomfort'
			]
		},
		PAIN:       {
			label:'Pain / Gas',
			icon:'bandage',
			color:'var(--cat-pain)',
			bg:'var(--cat-pain-bg)',
			emoji: '😣',
			advice: 'Your baby may be in pain or have gas. Check for gas, rash, or teething. Consult a doctor if persistent.',
			why: 'This type of cry is typically sudden, loud, and high-pitched. It can indicate trapped gas (a common issue in newborns whose digestive systems are still maturing), colic, or physical discomfort. Babies often show physical signs — scrunched face, drawn-up legs, or an arched back.',
			steps: [
				'Gently bicycle baby\'s legs to help release trapped gas',
				'Hold baby over your shoulder and pat their back',
				'Check for rash, tight clothing, or hair wrapped around fingers/toes',
				'Try skin-to-skin contact for comfort',
				'If cry persists over 3 hours, consult your pediatrician'
			]
		},
		TIRED:      {
			label:'Tired',
			icon:'moon',
			color:'var(--cat-tired)',
			bg:'var(--cat-tired-bg)',
			emoji: '😴',
			advice: 'Your baby needs sleep. Create a calm, dark, quiet environment and help them settle down.',
			why: 'Overtired babies cry in a whiny, lower-pitched pattern that fades and rises — almost like a yawn in sound. When babies are overtired, they produce cortisol (a stress hormone) that makes it harder to fall asleep. The sooner you help them wind down, the easier it will be.',
			steps: [
				'Reduce stimulation: dim lights, lower noise',
				'Try a gentle rocking or swaying motion',
				'Swaddle firmly to recreate womb-like comfort',
				'Play white noise or a gentle lullaby',
				'Check their wake window — newborns can only stay awake 45-90 mins'
			]
		},
		DISCOMFORT: {
			label:'Discomfort',
			icon:'thermometer',
			color:'var(--cat-discomfort)',
			bg:'var(--cat-discomfort-bg)',
			emoji: '🌡️',
			advice: 'Check temperature, diaper, clothing, or position. Something physical is bothering baby.',
			why: 'Discomfort cries are steady and continuous — they don\'t have a rhythmic ON/OFF pattern like hunger. Your baby is reacting to something touching or bothering their skin: a wet diaper, clothing that\'s too tight, being too hot or cold, or an uncomfortable position.',
			steps: [
				'Check and change diaper immediately',
				'Check baby\'s temperature — feel their neck or back',
				'Look for tight clothing, tags, or anything irritating skin',
				'Try repositioning or adjusting how you\'re holding them',
				'Offer skin-to-skin contact if no obvious cause found'
			]
		},
		BURPING:    {
			label:'Needs Burping',
			icon:'wind',
			color:'var(--cat-burping)',
			bg:'var(--cat-burping-bg)',
			emoji: '💨',
			advice: 'Baby has trapped air in their chest. Hold them upright and gently pat their back.',
			why: 'This cry sounds like short "eh-eh-eh" bursts — your baby is trying to push trapped air up from their chest. Newborns swallow air while feeding (both breast and bottle), and that air causes discomfort until released. This is very common and easily resolved.',
			steps: [
				'Hold baby upright against your chest or on your lap',
				'Gently pat or rub their back in circular motions',
				'Try different burping positions: over-shoulder, sitting up, face-down on lap',
				'Give it 2-3 minutes — sometimes burps take a moment',
				'In future feedings, burp mid-feed to prevent buildup'
			]
		},
		UNKNOWN:    {
			label:'Unclear',
			icon:'info',
			color:'var(--cat-unknown)',
			bg:'var(--cat-unknown-bg)',
			emoji: '❓',
			advice: 'Pattern unclear. Try recording again in a quieter environment, or run through a quick checklist.',
			why: 'The recording didn\'t have enough of a clear cry pattern for ROO to classify. This can happen with background noise, very short recordings, or when baby is just fussing rather than crying. Try again with a cleaner recording.',
			steps: [
				'Record again closer to baby\'s mouth (20–30cm away)',
				'Try to reduce background noise before recording',
				'Run through the basics: diaper, hunger, tired, temperature',
				'Trust your parental intuition — you know your baby best',
				'Contact your pediatrician if you are worried'
			]
		},
		INVALID:    {
			label:'Not a Baby Cry',
			icon:'warning',
			color:'var(--error)',
			bg:'var(--error-bg)',
			emoji: '🎙️',
			advice: 'ROO is designed for babies only. Please record your baby\'s actual cry.',
			why: 'No baby cry was detected in this recording. This could be ambient noise, an adult voice, or a very quiet fuss that didn\'t register clearly.',
			steps: [
				'Point the microphone at your baby',
				'Wait for an actual cry before tapping record',
				'Hold phone 20–30cm from baby\'s mouth',
				'Try to minimize background noise first'
			]
		},
	};

	const SEV_LABEL = { NONE:'Low urgency', LOW:'Low urgency', MEDIUM:'Moderate', HIGH:'Act soon', CRITICAL:'Urgent!' };
	const SEV_COLOR = { NONE:'var(--text-3)', LOW:'var(--success)', MEDIUM:'var(--warning)', HIGH:'var(--warning)', CRITICAL:'var(--error)' };

	let r  = $derived(/** @type {any} */(appState.result));
	let m  = $derived(r ? (CAT_META[/** @type {string} */(r.category)] ?? CAT_META.UNKNOWN) : null);
	let sv = $derived(r?.severity ?? 'NONE');

	// Prefer AI-generated steps/why, fall back to hardcoded
	let whyCry = $derived(r?.why_this_cry || m?.why || '');
	let actionSteps = $derived(
		(r?.steps && Array.isArray(r.steps) && r.steps.length > 0)
			? r.steps
			: (m?.steps ?? [])
	);

	// Spectrogram viewer
	let spectrogramUrl = $derived(
		appState.spectrogramBlob ? URL.createObjectURL(appState.spectrogramBlob) : null
	);
	let showSpectrogram = $state(false);

	let cardEl = $state(/** @type {HTMLElement|undefined} */(undefined));
	$effect(() => {
		if (r && cardEl) { setTimeout(() => cardEl?.scrollIntoView({ behavior:'smooth', block:'nearest' }), 80); }
	});
</script>

{#if r && m}
<div class="rc animate-up" bind:this={cardEl} style="--cat-c:{m.color};--cat-bg:{m.bg}">

	<!-- Category header -->
	<div class="rc-head">
		<div class="rc-emoji">{m.emoji}</div>
		<div class="rc-head-text">
			<p class="rc-label">ROO detected…</p>
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
			<span class="label">AI Confidence</span>
			<span class="rc-conf-pct">{r.confidence}%</span>
		</div>
		<div class="rc-conf-track">
			<div
				class="rc-conf-fill"
				style="width:{r.confidence}%; background:{r.confidence >= 75 ? 'var(--success)' : r.confidence >= 50 ? 'var(--warning)' : 'var(--error)'}"
			></div>
		</div>
		{#if r.noise_level}
			<p class="rc-noise-note">
				<span class="noise-dot" style="background:{r.noise_level === 'CLEAN' ? 'var(--success)' : r.noise_level === 'LOW' ? 'var(--success)' : r.noise_level === 'MODERATE' ? 'var(--warning)' : 'var(--error)'}"></span>
				Recording noise: {r.noise_level.toLowerCase()}
				{#if r.confidence < 60}&nbsp;· Low confidence — try recording again in a quieter spot{/if}
			</p>
		{/if}
	</div>
	{/if}

	<!-- Why is baby crying — science for parents -->
	{#if whyCry}
	<div class="rc-section rc-why">
		<div class="rc-section-head">
			<Icon name="info" size={14} color={m.color} />
			<p class="label">Why is baby crying?</p>
		</div>
		<p class="rc-body">{whyCry}</p>
		{#if r.pattern_matched}
			<p class="rc-pattern">
				<Icon name="sparkles" size={11} color="var(--text-3)" />
				Pattern detected: {r.pattern_matched}
			</p>
		{/if}
	</div>
	{/if}

	<!-- What to do — ordered steps -->
	{#if actionSteps.length > 0}
	<div class="rc-section">
		<div class="rc-section-head">
			<Icon name="check" size={14} color={m.color} />
			<p class="label">What to do right now</p>
		</div>
		<ol class="rc-steps">
			{#each actionSteps as step, i}
				<li class="rc-step">
					<span class="rc-step-n">{i + 1}</span>
					<span class="rc-step-t">{step}</span>
				</li>
			{/each}
		</ol>
	</div>
	{/if}

	<!-- Parent action summary -->
	<div class="rc-action">
		<Icon name="sparkles" size={16} color={m.color} />
		<p class="rc-action-text">{r.parent_action || m.advice}</p>
	</div>

	<!-- Spectrogram viewer -->
	{#if spectrogramUrl}
	<div class="rc-spec-wrap">
		<button
			class="rc-spec-toggle"
			onclick={() => showSpectrogram = !showSpectrogram}
			aria-expanded={showSpectrogram}
		>
			<div class="rc-spec-toggle-left">
				<Icon name="waveform" size={15} color="var(--accent)" />
				<span>View cry spectrogram</span>
				<span class="rc-spec-badge">AI used this</span>
			</div>
			<span class="rc-spec-chevron" class:open={showSpectrogram}>›</span>
		</button>

		{#if showSpectrogram}
		<div class="rc-spec-panel animate-in">
			<img
				src={spectrogramUrl}
				alt="Mel spectrogram of baby cry — frequency vs time heatmap"
				class="rc-spec-img"
			/>
			<p class="rc-spec-caption">
				This is the <strong>mel spectrogram</strong> of your baby's cry — the exact acoustic fingerprint ROO's AI analyzed. 
				Bright/warm colours (yellow-white) = high energy. Dark colours (purple-black) = low energy. 
				Y-axis: frequency in Hz (low at bottom, high at top). X-axis: time in seconds.
				The AI compared this against a reference atlas of labeled cry patterns.
			</p>
		</div>
		{/if}
	</div>
	{:else if appState.spectrogramFailed}
	<div class="rc-spec-wrap">
		<p class="rc-spec-failed">
			<Icon name="info" size={12} color="var(--text-3)" />
			Spectrogram could not be generated for this recording
		</p>
	</div>
	{/if}

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

	<!-- AI reasoning (collapsible) -->
	{#if r.reasoning}
	<details class="rc-reasoning">
		<summary>
			<Icon name="info" size={12} color="var(--text-3)" />
			Technical reasoning from AI
		</summary>
		<p>{r.reasoning}</p>
		{#if r._meta}
			<p class="rc-meta">Model: {r._meta.model} · {r._meta.provider}</p>
		{/if}
	</details>
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
	.rc-emoji {
		font-size: 2.4rem; flex-shrink: 0;
		filter: drop-shadow(0 2px 8px rgba(0,0,0,.2));
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
	.rc-noise-note { display: flex; align-items: center; gap: 5px; font-size: .68rem; color: var(--text-2); margin-top: 2px; }
	.noise-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }

	/* Sections */
	.rc-section {
		padding: 16px 20px; border-bottom: 1px solid var(--border);
		display: flex; flex-direction: column; gap: 8px;
	}
	.rc-section-head { display: flex; align-items: center; gap: 6px; }
	.rc-why { background: color-mix(in srgb, var(--cat-bg) 40%, var(--surface)); }
	.rc-body { font-size: .88rem; color: var(--text-2); line-height: 1.65; }
	.rc-pattern {
		display: flex; align-items: center; gap: 5px;
		font-size: .68rem; color: var(--text-3); font-style: italic; margin-top: 2px;
	}

	/* Steps */
	.rc-steps { display: flex; flex-direction: column; gap: 8px; list-style: none; padding: 0; margin: 0; }
	.rc-step {
		display: flex; align-items: flex-start; gap: 10px;
		padding: 10px 12px; border-radius: var(--r-md);
		background: var(--surface-2); border: 1px solid var(--border);
	}
	.rc-step-n {
		min-width: 22px; height: 22px; border-radius: 50%;
		background: var(--cat-c); color: #fff;
		font-size: .65rem; font-weight: 800;
		display: flex; align-items: center; justify-content: center; flex-shrink: 0;
		margin-top: 1px;
	}
	.rc-step-t { font-size: .85rem; color: var(--text); line-height: 1.4; }

	/* Action */
	.rc-action {
		display: flex; align-items: flex-start; gap: 10px;
		padding: 16px 20px; border-bottom: 1px solid var(--border);
		background: var(--cat-bg);
	}
	.rc-action-text { font-size: .9rem; font-weight: 700; color: var(--text); line-height: 1.5; }

	/* Spectrogram viewer */
	.rc-spec-wrap { border-bottom: 1px solid var(--border); }
	.rc-spec-toggle {
		width: 100%; display: flex; align-items: center; justify-content: space-between;
		padding: 14px 20px; background: none; cursor: pointer;
		transition: background .12s;
	}
	.rc-spec-toggle:hover { background: var(--surface-2); }
	.rc-spec-toggle-left { display: flex; align-items: center; gap: 8px; }
	.rc-spec-toggle-left span { font-size: .85rem; font-weight: 700; color: var(--text-2); }
	.rc-spec-badge {
		font-size: .6rem; font-weight: 800; letter-spacing: .04em;
		padding: 2px 7px; border-radius: var(--r-pill);
		background: var(--accent-muted); color: var(--accent); border: 1px solid var(--accent-border);
	}
	.rc-spec-chevron {
		font-size: 1.4rem; color: var(--text-3); font-weight: 300;
		transition: transform .2s; display: inline-block;
	}
	.rc-spec-chevron.open { transform: rotate(90deg); }
	.rc-spec-panel {
		padding: 0 20px 16px; display: flex; flex-direction: column; gap: 8px;
	}
	.rc-spec-img {
		width: 100%; border-radius: var(--r-lg);
		border: 1px solid var(--border);
		image-rendering: pixelated;
		background: #000;
	}
	.rc-spec-labels {
		display: flex; justify-content: space-between;
		font-size: .58rem; color: var(--text-3); font-weight: 700; letter-spacing: .02em;
		padding: 0 2px;
	}
	.spec-label-center { color: var(--text-3); opacity: .6; }
	.rc-spec-caption {
		font-size: .72rem; color: var(--text-2); line-height: 1.55;
		padding: 10px 12px; border-radius: var(--r-md);
		background: var(--surface-2); border: 1px solid var(--border);
	}
	.rc-spec-failed {
		display: flex; align-items: center; gap: 6px;
		padding: 10px 20px; font-size: .72rem; color: var(--text-3);
	}

	/* Alerts */
	.rc-alert {
		display: flex; align-items: flex-start; gap: 10px;
		padding: 12px 20px; border-bottom: 1px solid var(--border);
		font-size: .8rem; line-height: 1.5;
	}
	.rc-alert.warn { background: var(--warning-bg); color: var(--warning); }
	.rc-alert.info { background: var(--info-bg);    color: var(--info); }
	.rc-alert p { flex: 1; }

	/* AI reasoning details */
	.rc-reasoning {
		padding: 0 20px; border-bottom: 1px solid var(--border);
	}
	.rc-reasoning summary {
		display: flex; align-items: center; gap: 6px;
		padding: 10px 0; font-size: .72rem; color: var(--text-3);
		cursor: pointer; list-style: none; font-weight: 700;
	}
	.rc-reasoning summary::-webkit-details-marker { display: none; }
	.rc-reasoning p { font-size: .78rem; color: var(--text-2); line-height: 1.55; padding-bottom: 12px; }
	.rc-meta { font-size: .62rem; color: var(--text-3); padding-bottom: 10px; }

	/* Disclaimer */
	.rc-disclaimer {
		display: flex; align-items: center; gap: 5px;
		padding: 10px 20px;
		font-size: .62rem; color: var(--text-3); line-height: 1.5;
	}

	/* Animations */
	.animate-up {
		animation: slideUp .35s cubic-bezier(.16,1,.3,1) both;
	}
	@keyframes slideUp {
		from { opacity: 0; transform: translateY(16px); }
		to   { opacity: 1; transform: translateY(0); }
	}
	.animate-in {
		animation: fadeIn .2s ease both;
	}
	@keyframes fadeIn {
		from { opacity: 0; }
		to   { opacity: 1; }
	}
</style>