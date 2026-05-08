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
	
	const SEVERITY_COLORS = {
		LOW: 'var(--mint)',
		MEDIUM: 'var(--warn)',
		HIGH: 'var(--coral)',
		CRITICAL: 'var(--danger)'
	};
	
	let confidenceWidth = $state(0);
	
	$effect(() => {
		if (appState.result) {
			requestAnimationFrame(() => {
				setTimeout(() => {
					confidenceWidth = appState.result?.confidence || 0;
				}, 100);
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
				<div class="category-main">
					<div class="category-icon">
						<Icon
							name={CATEGORY_ICONS[appState.result.category] || 'info-circle'}
							size={32}
							color={SEVERITY_COLORS[appState.result.severity] || 'var(--text-muted)'}
						/>
					</div>
					<h2 class="category-name gradient-text">
						{CATEGORY_LABELS[appState.result.category] || appState.result.category}
					</h2>
				</div>
				<div
					class="severity-badge"
					style="--severity-color: {SEVERITY_COLORS[appState.result.severity] || 'var(--text-muted)'}"
				>
					{appState.result.severity}
				</div>
			</div>
			
			<div class="confidence-wrap">
				<div class="confidence-label">
					<span>Confidence</span>
					<span class="confidence-value">{appState.result.confidence}%</span>
				</div>
				<div class="confidence-track">
					<div
						class="confidence-fill"
						style="width: {confidenceWidth}%"
					></div>
				</div>
			</div>
		</div>
		
		<div class="result-body">
			{#if appState.result.reasoning}
				<div class="reasoning-box">
					"{appState.result.reasoning}"
				</div>
			{/if}
			
			{#if appState.result.parent_action}
				<div class="action-box">
					<div class="action-label">What to do now</div>
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
		border-radius: var(--radius-xl);
		overflow: hidden;
		backdrop-filter: blur(16px);
		box-shadow: var(--shadow-md);
	}

	.result-header {
		padding: 24px 24px 20px;
		background: linear-gradient(135deg, rgba(255,123,92,0.06), rgba(255,179,71,0.03));
		border-bottom: 1px solid var(--border);
	}

	.category-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.category-main {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.category-icon {
		width: 52px;
		height: 52px;
		border-radius: var(--radius-md);
		background: rgba(255,255,255,0.04);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.category-name {
		font-family: 'Fraunces', serif;
		font-size: 1.8rem;
		font-weight: 700;
		line-height: 1.1;
	}

	.severity-badge {
		padding: 6px 14px;
		border-radius: var(--radius-full);
		font-size: 0.7rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--severity-color);
		background: rgba(255,255,255,0.04);
		border: 1px solid rgba(255,255,255,0.08);
	}

	.confidence-wrap {
		margin-top: 18px;
	}

	.confidence-label {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.75rem;
		font-weight: 700;
		color: var(--text-muted);
		margin-bottom: 8px;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.confidence-value {
		color: var(--text);
		font-size: 1rem;
		font-family: 'Fraunces', serif;
	}

	.confidence-track {
		height: 6px;
		background: rgba(255,255,255,0.06);
		border-radius: var(--radius-full);
		overflow: hidden;
	}

	.confidence-fill {
		height: 100%;
		border-radius: var(--radius-full);
		background: linear-gradient(90deg, var(--coral), var(--amber));
		transition: width 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
		box-shadow: 0 0 12px rgba(255,123,92,0.4);
	}

	.result-body {
		padding: 20px 24px;
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	.reasoning-box {
		background: rgba(255,255,255,0.03);
		border: 1px solid var(--border);
		border-radius: var(--radius-md);
		padding: 14px 16px;
		font-size: 0.85rem;
		color: var(--text-muted);
		line-height: 1.65;
		font-style: italic;
	}

	.action-box {
		background: linear-gradient(135deg, rgba(82,217,193,0.08), rgba(82,217,193,0.03));
		border: 1px solid rgba(82,217,193,0.15);
		border-radius: var(--radius-md);
		padding: 14px 16px;
	}

	.action-label {
		font-size: 0.68rem;
		font-weight: 800;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--mint);
		margin-bottom: 6px;
	}

	.action-text {
		font-size: 0.92rem;
		font-weight: 700;
		color: var(--text);
		line-height: 1.5;
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
		.category-name {
			font-size: 1.5rem;
		}
		.category-icon {
			width: 44px;
			height: 44px;
		}
	}
</style>
