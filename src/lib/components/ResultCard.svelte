<script>
	import { appState } from '$state/appState.svelte.js';
	import Icon from './Icon.svelte';
	
	const CATEGORY_ICONS = {
		HUNGER: 'heart',
		PAIN: 'bandage',
		TIRED: 'moon',
		DISCOMFORT: 'thermometer',
		BURPING: 'wind',
		UNKNOWN: 'info-circle'
	};
	
	const CATEGORY_LABELS = {
		HUNGER: 'Hunger',
		PAIN: 'Pain',
		TIRED: 'Tired',
		DISCOMFORT: 'Discomfort',
		BURPING: 'Burping',
		UNKNOWN: 'Unknown'
	};
	
	const CATEGORY_COLORS = {
		HUNGER: 'var(--amber)',
		PAIN: 'var(--danger)',
		TIRED: 'var(--lavender)',
		DISCOMFORT: 'var(--warn)',
		BURPING: 'var(--mint)',
		UNKNOWN: 'var(--text-muted)'
	};
	
	const SEVERITY_CONFIG = {
		LOW: { color: 'var(--mint)', bg: 'rgba(110,231,183,0.1)', label: 'Low' },
		MEDIUM: { color: 'var(--warn)', bg: 'rgba(255,209,102,0.1)', label: 'Medium' },
		HIGH: { color: 'var(--coral)', bg: 'rgba(255,140,107,0.1)', label: 'High' },
		CRITICAL: { color: 'var(--danger)', bg: 'rgba(255,107,138,0.12)', label: 'Critical' }
	};
	
	let confidenceWidth = $state(0);
	
	$effect(() => {
		if (appState.result) {
			requestAnimationFrame(() => {
				setTimeout(() => {
					confidenceWidth = appState.result?.confidence || 0;
				}, 150);
			});
		} else {
			confidenceWidth = 0;
		}
	});
</script>

{#if appState.result}
	<div class="result-card animate-slide-up">
		<div class="result-header">
			<div class="category-row">
				<div class="category-icon-wrap" style="--icon-color: {CATEGORY_COLORS[appState.result.category] || 'var(--text-muted)'}">
					<Icon
						name={CATEGORY_ICONS[appState.result.category] || 'info-circle'}
						size={28}
						color="currentColor"
					/>
				</div>
				<div class="category-info">
					<h2 class="category-name gradient-text">
						{CATEGORY_LABELS[appState.result.category] || appState.result.category}
					</h2>
					<p class="category-sub">Your baby may be {CATEGORY_LABELS[appState.result.category]?.toLowerCase() || 'upset'}</p>
				</div>
				<div class="severity-badge" style="--sev-color: {(SEVERITY_CONFIG[appState.result.severity] || SEVERITY_CONFIG.MEDIUM).color}; --sev-bg: {(SEVERITY_CONFIG[appState.result.severity] || SEVERITY_CONFIG.MEDIUM).bg}">
					{(SEVERITY_CONFIG[appState.result.severity] || SEVERITY_CONFIG.MEDIUM).label}
				</div>
			</div>
			
			<div class="confidence-wrap">
				<div class="confidence-label">
					<span>Confidence</span>
					<span class="confidence-value">{appState.result.confidence}%</span>
				</div>
				<div class="confidence-track">
					<div class="confidence-fill" style="width: {confidenceWidth}%"></div>
				</div>
			</div>
		</div>
		
		<div class="result-body">
			{#if appState.result.reasoning}
				<div class="reasoning-box">
					<div class="reasoning-label">Why</div>
					<p class="reasoning-text">"{appState.result.reasoning}"</p>
				</div>
			{/if}
			
			{#if appState.result.parent_action}
				<div class="action-box">
					<div class="action-label">What to do</div>
					<div class="action-text">{appState.result.parent_action}</div>
				</div>
			{/if}
			
			{#if appState.result.pre_cry}
				<div class="precry-alert">
					<Icon name="warning" size={16} color="var(--warn)" />
					<span>{appState.result.pre_cry_message || 'Early signs detected — act now'}</span>
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.result-card {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-2xl);
		overflow: hidden;
		backdrop-filter: blur(20px);
		box-shadow: var(--shadow-lg);
	}

	.result-header {
		padding: 24px 20px 20px;
		background: linear-gradient(160deg, rgba(255,140,107,0.06) 0%, rgba(255,184,108,0.03) 100%);
		border-bottom: 1px solid var(--border);
	}

	.category-row {
		display: flex;
		align-items: center;
		gap: 14px;
	}

	.category-icon-wrap {
		width: 52px;
		height: 52px;
		border-radius: var(--radius-md);
		background: rgba(255,255,255,0.04);
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--icon-color);
		flex-shrink: 0;
	}

	.category-info {
		flex: 1;
		min-width: 0;
	}

	.category-name {
		font-family: 'Fraunces', serif;
		font-size: 1.7rem;
		font-weight: 700;
		line-height: 1.15;
	}

	.category-sub {
		font-size: 0.78rem;
		color: var(--text-muted);
		margin-top: 2px;
	}

	.severity-badge {
		padding: 5px 12px;
		border-radius: var(--radius-full);
		font-size: 0.65rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--sev-color);
		background: var(--sev-bg);
		border: 1px solid currentColor;
		flex-shrink: 0;
		align-self: flex-start;
	}

	.confidence-wrap {
		margin-top: 16px;
	}

	.confidence-label {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.72rem;
		font-weight: 700;
		color: var(--text-muted);
		margin-bottom: 8px;
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.confidence-value {
		color: var(--text);
		font-size: 0.9rem;
		font-family: 'Fraunces', serif;
		letter-spacing: 0;
		text-transform: none;
	}

	.confidence-track {
		height: 5px;
		background: rgba(255,255,255,0.06);
		border-radius: var(--radius-full);
		overflow: hidden;
	}

	.confidence-fill {
		height: 100%;
		border-radius: var(--radius-full);
		background: linear-gradient(90deg, var(--coral), var(--amber));
		transition: width 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
		box-shadow: 0 0 12px rgba(255,140,107,0.35);
	}

	.result-body {
		padding: 18px 20px 20px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.reasoning-box {
		background: rgba(255,255,255,0.03);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		padding: 14px 16px;
	}

	.reasoning-label {
		font-size: 0.65rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--text-faint);
		margin-bottom: 6px;
	}

	.reasoning-text {
		font-size: 0.88rem;
		color: var(--text-muted);
		line-height: 1.6;
		font-style: italic;
	}

	.action-box {
		background: linear-gradient(135deg, rgba(110,231,183,0.08), rgba(110,231,183,0.03));
		border: 1px solid rgba(110,231,183,0.15);
		border-radius: var(--radius-md);
		padding: 14px 16px;
	}

	.action-label {
		font-size: 0.65rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--mint);
		margin-bottom: 5px;
	}

	.action-text {
		font-size: 0.95rem;
		font-weight: 700;
		color: var(--text);
		line-height: 1.45;
	}

	.precry-alert {
		display: flex;
		align-items: center;
		gap: 10px;
		background: rgba(255,209,102,0.06);
		border: 1px solid rgba(255,209,102,0.15);
		border-radius: var(--radius-md);
		padding: 12px 14px;
		font-size: 0.82rem;
		color: var(--warn);
		font-weight: 600;
	}

	@media (max-width: 380px) {
		.category-name { font-size: 1.4rem; }
		.category-icon-wrap { width: 44px; height: 44px; }
	}
</style>