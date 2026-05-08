<script>
	import { appState } from '$state/appState.svelte.js';
	import { getApiUrl, setApiUrl } from '$utils/apiClient.js';
	import Icon from './Icon.svelte';

	let inputUrl = $state(getApiUrl());
	let saved = $state(false);

	function save() {
		setApiUrl(inputUrl.trim());
		saved = true;
		setTimeout(() => saved = false, 2000);
	}

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
				<h3>Settings</h3>
				<button class="close-btn" onclick={close} type="button" aria-label="Close">
					<Icon name="close" size={20} />
				</button>
			</div>

			<div class="panel-body">
				<div class="section">
					<h4>Backend URL</h4>
					<p class="desc">Leave empty to use Cloudflare Pages Function (default). Paste a Colab ngrok URL to use real Gemma 4 E4B.</p>
					<input
						type="url"
						placeholder="https://xxxx-xxxx.ngrok-free.app"
						bind:value={inputUrl}
						class="url-input"
					/>
					<button class="save-btn" onclick={save} type="button">
						{#if saved}
							<Icon name="check" size={16} />
							Saved
						{:else}
							Save
						{/if}
					</button>
				</div>

				<div class="divider"></div>

				<div class="section">
					<h4>About ROO</h4>
					<div class="details">
						<div class="detail-row">
							<span class="detail-label">Version</span>
							<span class="detail-value">1.0.0</span>
						</div>
						<div class="detail-row">
							<span class="detail-label">Model (Cloud)</span>
							<span class="detail-value">Gemini 2.0 Flash</span>
						</div>
						<div class="detail-row">
							<span class="detail-label">Model (Colab)</span>
							<span class="detail-value">Gemma 4 E4B</span>
						</div>
						<div class="detail-row">
							<span class="detail-label">Audio</span>
							<span class="detail-value">16kHz Mono, max 30s</span>
						</div>
					</div>
				</div>

				<div class="tip">
					<Icon name="info-circle" size={16} color="var(--mint)" />
					<p>For the best accuracy with real Gemma 4 E4B audio, deploy the Colab backend and paste its URL above.</p>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
	.overlay {
		position: fixed; inset: 0;
		background: rgba(0,0,0,0.6);
		backdrop-filter: blur(8px);
		z-index: 100;
		display: flex; align-items: center; justify-content: center;
		padding: 20px;
	}
	.panel {
		width: 100%; max-width: 400px;
		background: var(--bg-elevated);
		border: 1px solid var(--border);
		border-radius: var(--radius-xl);
		box-shadow: var(--shadow-lg);
		overflow: hidden;
		max-height: 90vh;
		overflow-y: auto;
	}
	.panel-header {
		display: flex; align-items: center; justify-content: space-between;
		padding: 20px 24px;
		border-bottom: 1px solid var(--border);
		position: sticky; top: 0; background: var(--bg-elevated); z-index: 1;
	}
	.panel-header h3 { font-size: 1.1rem; font-weight: 800; color: var(--text); }
	.close-btn {
		width: 36px; height: 36px; border-radius: 50%;
		display: flex; align-items: center; justify-content: center;
		color: var(--text-muted); background: var(--surface);
		transition: all var(--transition-fast);
	}
	.close-btn:hover { background: var(--surface-hover); color: var(--text); }
	.panel-body { padding: 20px 24px 24px; display: flex; flex-direction: column; gap: 20px; }
	.section { display: flex; flex-direction: column; gap: 10px; }
	.section h4 { font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.08em; }
	.desc { font-size: 0.78rem; color: var(--text-faint); line-height: 1.5; }
	.url-input {
		padding: 12px 14px; border-radius: var(--radius-md);
		background: var(--surface); border: 1px solid var(--border);
		color: var(--text); font-size: 0.9rem; width: 100%;
		transition: all var(--transition-fast);
	}
	.url-input:focus { outline: none; border-color: var(--border-glow); }
	.url-input::placeholder { color: var(--text-faint); }
	.save-btn {
		display: flex; align-items: center; gap: 6px;
		padding: 10px 18px; border-radius: var(--radius-md);
		font-size: 0.85rem; font-weight: 700; color: #fff;
		background: linear-gradient(135deg, var(--coral), var(--amber));
		align-self: flex-end;
		transition: all var(--transition-fast);
	}
	.save-btn:hover { box-shadow: 0 4px 16px rgba(255,123,92,0.3); }
	.divider { height: 1px; background: var(--border); }
	.details { display: flex; flex-direction: column; gap: 8px; }
	.detail-row { display: flex; justify-content: space-between; align-items: center; font-size: 0.82rem; }
	.detail-label { color: var(--text-muted); font-weight: 600; }
	.detail-value { color: var(--text); font-weight: 700; }
	.tip {
		display: flex; align-items: flex-start; gap: 10px;
		padding: 12px; background: rgba(82,217,193,0.06);
		border: 1px solid rgba(82,217,193,0.12);
		border-radius: var(--radius-md);
	}
	.tip p { font-size: 0.78rem; color: var(--text-muted); line-height: 1.5; }
</style>
