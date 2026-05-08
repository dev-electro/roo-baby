<script>
	import { appState } from '$state/appState.svelte.js';
	import Icon from './Icon.svelte';
	
	function close() {
		appState.showSettings = false;
	}
</script>

{#if appState.showSettings}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="overlay animate-fade-in" onclick={close} role="button" tabindex="0">
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="panel animate-slide-up" onclick={(e) => e.stopPropagation()} role="presentation">
			<div class="panel-header">
				<h3>About ROO</h3>
				<button class="close-btn" onclick={close} type="button" aria-label="Close">
					<Icon name="close" size={20} />
				</button>
			</div>
			
			<div class="panel-body">
				<div class="info-section">
					<div class="info-icon">
						<Icon name="bottle" size={32} color="var(--coral)" />
					</div>
					<h4>ROO Baby Cry Analyzer</h4>
					<p class="version">Version 1.0</p>
				</div>
				
				<div class="details">
					<div class="detail-row">
						<span class="detail-label">Model</span>
						<span class="detail-value">Gemma 4 E4B</span>
					</div>
					<div class="detail-row">
						<span class="detail-label">Platform</span>
						<span class="detail-value">Cloudflare Pages</span>
					</div>
					<div class="detail-row">
						<span class="detail-label">Audio Input</span>
						<span class="detail-value">16kHz Mono WAV</span>
					</div>
					<div class="detail-row">
						<span class="detail-label">Categories</span>
						<span class="detail-value">5 cry types</span>
					</div>
				</div>
				
				<div class="tip">
					<Icon name="info-circle" size={16} color="var(--mint)" />
					<p>Tip: For best results, record in a quiet room with the baby close to the microphone.</p>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed;
		inset: 0;
		background: rgba(0,0,0,0.6);
		backdrop-filter: blur(8px);
		z-index: 100;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 20px;
	}

	.panel {
		width: 100%;
		max-width: 380px;
		background: var(--bg-elevated);
		border: 1px solid var(--border);
		border-radius: var(--radius-xl);
		box-shadow: var(--shadow-lg);
		overflow: hidden;
	}

	.panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 20px 24px;
		border-bottom: 1px solid var(--border);
	}

	.panel-header h3 {
		font-size: 1.1rem;
		font-weight: 800;
		color: var(--text);
	}

	.close-btn {
		width: 36px;
		height: 36px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-muted);
		background: var(--surface);
		transition: all var(--transition-fast);
	}

	.close-btn:hover {
		background: var(--surface-hover);
		color: var(--text);
	}

	.panel-body {
		padding: 24px;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.info-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		text-align: center;
	}

	.info-icon {
		width: 60px;
		height: 60px;
		border-radius: 50%;
		background: rgba(255,123,92,0.08);
		border: 1px solid rgba(255,123,92,0.15);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.info-section h4 {
		font-size: 1rem;
		font-weight: 700;
		color: var(--text);
	}

	.version {
		font-size: 0.8rem;
		color: var(--text-faint);
		font-weight: 600;
	}

	.details {
		display: flex;
		flex-direction: column;
		gap: 10px;
		background: var(--surface);
		border-radius: var(--radius-md);
		padding: 16px;
	}

	.detail-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		font-size: 0.85rem;
	}

	.detail-label {
		color: var(--text-muted);
		font-weight: 600;
	}

	.detail-value {
		color: var(--text);
		font-weight: 700;
	}

	.tip {
		display: flex;
		align-items: flex-start;
		gap: 10px;
		padding: 12px;
		background: rgba(82,217,193,0.06);
		border: 1px solid rgba(82,217,193,0.12);
		border-radius: var(--radius-md);
	}

	.tip p {
		font-size: 0.8rem;
		color: var(--text-muted);
		line-height: 1.5;
	}
</style>
