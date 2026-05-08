<script>
	import { appState } from '$state/appState.svelte.js';
	import Icon from './Icon.svelte';
</script>

{#if appState.error}
	<div class="error-toast animate-slide-up">
		<div class="error-icon">
			<Icon name="warning" size={18} color="var(--danger)" />
		</div>
		<span class="error-text">{appState.error}</span>
		<button class="error-close" onclick={() => appState.clearError()} type="button" aria-label="Dismiss">
			<Icon name="close" size={14} />
		</button>
	</div>
{/if}

<style>
	.error-toast {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 14px 16px;
		background: rgba(255,107,138,0.06);
		border: 1px solid rgba(255,107,138,0.15);
		border-radius: var(--radius-lg);
		color: var(--danger);
		font-size: 0.85rem;
		font-weight: 600;
		backdrop-filter: blur(8px);
	}

	.error-icon {
		flex-shrink: 0;
		width: 28px;
		height: 28px;
		border-radius: 50%;
		background: rgba(255,107,138,0.1);
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.error-text {
		flex: 1;
		line-height: 1.4;
	}

	.error-close {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--danger);
		background: rgba(255,107,138,0.08);
		transition: all var(--transition-fast);
		flex-shrink: 0;
	}

	.error-close:hover {
		background: rgba(255,107,138,0.15);
	}
</style>