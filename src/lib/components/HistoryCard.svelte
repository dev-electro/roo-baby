<script>
	import { getGroupedHistory, clearHistory } from '$utils/historyStore.js';
	import Icon from './Icon.svelte';

	const CATEGORY_COLORS = {
		HUNGER: 'var(--secondary)',
		PAIN: 'var(--danger)',
		TIRED: 'var(--lavender)',
		DISCOMFORT: 'var(--warn)',
		BURPING: 'var(--accent)',
		UNKNOWN: 'var(--text-muted)'
	};

	const SEVERITY_COLORS = {
		LOW: 'var(--accent)',
		MEDIUM: 'var(--warn)',
		HIGH: 'var(--primary)',
		CRITICAL: 'var(--danger)'
	};

	let history = $state(getGroupedHistory());

	function refresh() {
		history = getGroupedHistory();
	}

	$effect(() => {
		const id = setInterval(refresh, 2000);
		return () => clearInterval(id);
	});
</script>

{#if Object.keys(history).length > 0}
	<div class="history-card animate-slide-up">
		<div class="history-header">
			<h3 class="history-title">Recent Analyses</h3>
			<button class="clear-btn" onclick={() => { clearHistory(); refresh(); }} type="button">
				<Icon name="close" size={12} />
				Clear
			</button>
		</div>

		{#each Object.entries(history).slice(0, 5) as [date, entries]}
			<div class="history-group">
				<div class="history-date">{date === new Date().toLocaleDateString() ? 'Today' : date}</div>
				{#each entries.slice(0, 10) as entry}
					<div class="history-entry">
						<div class="entry-marker" style="background: {CATEGORY_COLORS[entry.category] || 'var(--text-muted)'}"></div>
						<div class="entry-body">
							<div class="entry-top">
								<span class="entry-category">{entry.category}</span>
								<span class="entry-confidence">{entry.confidence}%</span>
							</div>
							<div class="entry-bottom">
								<span class="entry-severity" style="color: {SEVERITY_COLORS[entry.severity] || 'var(--text-muted)'}">{entry.severity}</span>
								<span class="entry-mode">{entry.mode}</span>
								<span class="entry-time">{new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/each}
	</div>
{/if}

<style>
	.history-card {
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-2xl);
		overflow: hidden;
		backdrop-filter: blur(16px);
	}

	.history-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 16px 20px;
		border-bottom: 1px solid var(--border);
	}

	.history-title {
		font-size: 0.72rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-muted);
	}

	.clear-btn {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: 0.65rem;
		font-weight: 700;
		color: var(--text-faint);
		padding: 4px 8px;
		border-radius: var(--radius-sm);
		transition: all var(--transition-fast);
	}
	.clear-btn:hover { color: var(--danger); background: var(--danger-soft); }

	.history-group { padding: 8px 20px; border-bottom: 1px solid var(--border); }
	.history-group:last-child { border-bottom: none; }

	.history-date {
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--text-faint);
		padding: 6px 0;
	}

	.history-entry {
		display: flex;
		align-items: stretch;
		gap: 10px;
		padding: 8px 0;
	}

	.entry-marker {
		width: 3px;
		border-radius: var(--radius-full);
		flex-shrink: 0;
	}

	.entry-body {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.entry-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.entry-category {
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--text);
	}

	.entry-confidence {
		font-size: 0.7rem;
		font-weight: 600;
		color: var(--text-muted);
		font-family: 'Fraunces', serif;
	}

	.entry-bottom {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.65rem;
		font-weight: 600;
	}

	.entry-severity {
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.entry-mode, .entry-time {
		color: var(--text-faint);
	}
</style>