<script>
	import { appState } from '$state/appState.svelte.js';
	import Icon from './Icon.svelte';
</script>

{#if appState.error}
	<div class="error-toast animate-slide-up">
		<Icon name="warning" size={20} color="var(--danger)" />
		<span class="error-text">{appState.error}</span>
		<button class="error-close" onclick={() => appState.clearError()} type="button" aria-label="Dismiss">
			<Icon name="close" size={16} />
		</button>
	</div>
{/if}

<style>
	.error-toast {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 14px 16px;
		background: rgba(255,77,109,0.08);
		border: 1px solid rgba(255,77,109,0.2);
		border-radius: var(--radius-md);
		color: var(--danger);
		font-size: 0.88rem;
		font-weight: 600;
		backdrop-filter: blur(8px);
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
		background: rgba(255,77,109,0.1);
		transition: all var(--transition-fast);
		flex-shrink: 0;
	}

	.error-close:hover {
		background: rgba(255,77,109,0.2);
	}
</style>
